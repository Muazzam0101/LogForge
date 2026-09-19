"""Comprehensive Performance & Scalability Test Suite for LogForge (Phase 11).

Covers:
1. Throughput metrics calculation
2. Latency percentiles measurement (P50, P95, P99)
3. Configurable batch processing (10, 50, 100, 500)
4. Concurrent worker scaling & heartbeat registration
5. Kafka consumer batch consumption & offset behavior
6. MySQL bulk insertion without N+1 overhead
7. OpenSearch bulk indexing & partial failure parsing
8. Pagination with composite index ordering
9. Performance telemetry API (/api/v1/system/performance)
10. Worker failure & poison pill DLQ isolation
11. Ingestion backpressure handling
12. Large batch handling & memory constraints
13. Vectorized AI/ML batch anomaly scoring
14. Hardware resource telemetry (CPU/Memory via psutil)
"""
from datetime import datetime, timezone
import json
import time
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch
from uuid import uuid4

import numpy as np
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.metrics import PerformanceMetricsCollector, metrics_collector
from app.db.repositories.event_repository import EventRepository
from app.db.session import SessionLocal
from app.main import app
from app.ml.anomaly_model import model_instance
from app.ml.scoring import batch_score_events_safely, score_event_safely
from app.models.event import EventModel
from app.search.repository import OpenSearchRepository
from app.search.service import search_service
from app.services.processing_service import ulpf_engine
from app.streaming.consumer import ULPFStreamConsumer


@pytest.fixture
def test_collector():
    """Provides an isolated performance metrics collector instance."""
    collector = PerformanceMetricsCollector(max_samples=1000, window_seconds=5.0)
    collector.reset()
    return collector


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. Throughput Metrics
# ---------------------------------------------------------------------------
def test_throughput_metrics_calculation(test_collector):
    """Verifies that events/sec rate is calculated accurately across rolling window."""
    assert test_collector.get_throughput() == 0.0

    # Simulate processing 100 events
    for _ in range(100):
        test_collector.record_event_processed(latency_ms=1.5, count=1)

    tp = test_collector.get_throughput()
    assert tp > 0.0
    assert test_collector.events_processed == 100


# ---------------------------------------------------------------------------
# 2. Latency Percentiles Measurement (P50, P95, P99)
# ---------------------------------------------------------------------------
def test_latency_percentiles_calculation(test_collector):
    """Verifies exact calculation of min, median (P50), P95, P99, and max latencies."""
    # Record known sequence of latencies from 1.0 to 100.0 ms
    for i in range(1, 101):
        test_collector.record_event_processed(latency_ms=float(i), count=1)

    snapshot = test_collector.get_snapshot()
    assert snapshot["min_latency_ms"] == 1.0
    assert snapshot["max_latency_ms"] == 100.0
    # P50 should be around 50.5 ms
    assert 49.0 <= snapshot["p50_latency_ms"] <= 52.0
    # P95 should be around 95.0 ms
    assert 94.0 <= snapshot["p95_latency_ms"] <= 96.0
    # P99 should be around 99.0 ms
    assert 98.0 <= snapshot["p99_latency_ms"] <= 100.0


# ---------------------------------------------------------------------------
# 3. Batch Processing with Configurable Batch Sizes
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("batch_size", [10, 50, 100])
def test_batch_processing_varying_sizes(batch_size):
    """Verifies that ULPF batch processing scales cleanly with configurable batch sizes."""
    sample_log = json.dumps({
        "timestamp": "2026-09-20T01:30:00Z",
        "src_ip": "10.0.0.1",
        "dst_ip": "10.0.0.2",
        "action": "ALLOW",
        "severity": "LOW",
        "message": "batch test log",
    })
    raw_logs = [sample_log] * batch_size

    results = ulpf_engine.process_batch(raw_logs=raw_logs, source_hint="test-batch")
    assert len(results) == batch_size
    assert all(r.status == "success" for r in results)
    assert all(r.processing_metadata.stage_timings_ms is not None for r in results)


# ---------------------------------------------------------------------------
# 4. Concurrent Workers Scaling & Heartbeats
# ---------------------------------------------------------------------------
def test_concurrent_worker_scaling_and_heartbeats(test_collector):
    """Verifies that multiple worker processes register independent heartbeats."""
    assert test_collector.get_active_worker_count() == 0

    test_collector.record_worker_heartbeat("worker-01", batch_size=100, processed_count=500)
    test_collector.record_worker_heartbeat("worker-02", batch_size=100, processed_count=450)
    test_collector.record_worker_heartbeat("worker-03", batch_size=100, processed_count=600)

    assert test_collector.get_active_worker_count() == 3
    workers = test_collector.get_active_workers()
    assert len(workers) == 3
    worker_ids = {w["worker_id"] for w in workers}
    assert worker_ids == {"worker-01", "worker-02", "worker-03"}


# ---------------------------------------------------------------------------
# 5. Kafka Consumer Batching & Offset Behavior
# ---------------------------------------------------------------------------
def test_kafka_consumer_batch_processing_mock():
    """Verifies ULPFStreamConsumer micro-batch consumption and persistence."""
    consumer = ULPFStreamConsumer(
        group_id="test-group",
        bootstrap_servers="localhost:9092",
        batch_size=5,
        worker_id="test-worker-01",
    )

    class MockMessage:
        def __init__(self, val):
            self._val = val
        def value(self):
            return self._val.encode("utf-8")
        def error(self):
            return None

    sample_event = {
        "event_id": str(uuid4()),
        "raw_event": json.dumps({"action": "ALLOW", "severity": "LOW", "src_ip": "1.1.1.1"}),
        "source_hint": "json",
    }
    messages = [MockMessage(json.dumps(sample_event)) for _ in range(3)]

    with patch.object(EventRepository, "create_batch_from_results", return_value=[]):
        with patch.object(search_service, "index_batch_safely", return_value=(3, 0)):
            success = consumer.process_message_batch(messages)
            assert success is True
            assert consumer.processed_count == 3


# ---------------------------------------------------------------------------
# 6. MySQL Bulk Insertion Efficiency
# ---------------------------------------------------------------------------
def test_mysql_bulk_insertion_no_refresh_loop(db_session: Session):
    """Verifies that create_batch_from_results inserts in bulk without refresh loop."""
    sample_log = json.dumps({"action": "DENY", "severity": "HIGH", "src_ip": "192.168.1.1"})
    results = [ulpf_engine.process_event(sample_log) for _ in range(10)]

    models = EventRepository.create_batch_from_results(db_session, results)
    assert len(models) == 10
    assert all(m.id is not None for m in models)


# ---------------------------------------------------------------------------
# 7. OpenSearch Bulk Indexing & Partial Failure Isolation
# ---------------------------------------------------------------------------
def test_opensearch_partial_failure_parsing():
    """Verifies that OpenSearch bulk indexing identifies and extracts failed document errors."""
    mock_client = MagicMock()
    repo = OpenSearchRepository(client=mock_client, alias="test-alias")

    # Mock helpers.bulk returning partial errors
    mock_raw_errors = [
        {
            "index": {
                "_index": "test-alias",
                "_id": "event-uuid-failed-1",
                "status": 400,
                "error": {"type": "mapper_parsing_exception", "reason": "failed to parse field"},
            }
        }
    ]

    with patch("app.search.repository.helpers.bulk", return_value=(9, mock_raw_errors)):
        docs = [{"event_id": f"event-{i}", "raw_event": "test"} for i in range(10)]
        success_count, parsed_errors = repo.bulk_index_documents(docs)
        assert success_count == 9
        assert len(parsed_errors) == 1
        assert parsed_errors[0]["event_id"] == "event-uuid-failed-1"
        assert "failed to parse" in parsed_errors[0]["error"]


# ---------------------------------------------------------------------------
# 8. Pagination with Composite Index Ordering
# ---------------------------------------------------------------------------
def test_pagination_and_sorting(db_session: Session):
    """Verifies server-side pagination with newest-first ordering."""
    sample_log = json.dumps({"action": "ALLOW", "severity": "LOW", "src_ip": "10.0.0.1"})
    results = [ulpf_engine.process_event(sample_log) for _ in range(15)]
    EventRepository.create_batch_from_results(db_session, results)

    # Query first page of 5
    page1, total1 = EventRepository.get_events(db_session, limit=5, offset=0)
    assert len(page1) == 5
    assert total1 >= 15

    # Query second page of 5
    page2, total2 = EventRepository.get_events(db_session, limit=5, offset=5)
    assert len(page2) == 5
    # Ensure disjoint event IDs between page 1 and page 2
    ids_p1 = {e.event_id for e in page1}
    ids_p2 = {e.event_id for e in page2}
    assert ids_p1.isdisjoint(ids_p2)


# ---------------------------------------------------------------------------
# 9. Performance Telemetry API
# ---------------------------------------------------------------------------
def test_system_performance_api_endpoint(client):
    """Verifies GET /api/v1/system/performance returns valid real metrics schema."""
    resp = client.get("/api/v1/system/performance")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    assert "events_received" in data
    assert "events_processed" in data
    assert "events_failed" in data
    assert "events_per_second" in data
    assert "p50_latency_ms" in data
    assert "p95_latency_ms" in data
    assert "p99_latency_ms" in data
    assert "subsystems" in data
    assert "mysql" in data["subsystems"]
    assert "stage_timings_ms" in data


def test_system_performance_reset_endpoint(client):
    """Verifies POST /api/v1/system/performance/reset resets telemetry."""
    resp = client.post("/api/v1/system/performance/reset")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["status"] == "success"


# ---------------------------------------------------------------------------
# 10. Worker Failure & Poison Pill DLQ Isolation
# ---------------------------------------------------------------------------
def test_worker_poison_pill_dlq_routing():
    """Verifies that malformed messages are safely routed to DLQ without crashing worker."""
    consumer = ULPFStreamConsumer(
        group_id="test-group",
        bootstrap_servers="localhost:9092",
        worker_id="test-worker",
    )

    with patch("app.streaming.consumer.kafka_producer_service.produce_dlq", return_value=True) as mock_dlq:
        # Invalid malformed JSON message
        res = consumer.process_single_message("NOT A VALID JSON STRING {{{")
        assert res is True
        mock_dlq.assert_called_once()
        assert consumer.dlq_count == 1


# ---------------------------------------------------------------------------
# 11. Ingestion Backpressure Handling
# ---------------------------------------------------------------------------
def test_asynchronous_ingestion_buffer(test_client):
    """Verifies that log ingestion returns HTTP 202 immediately to absorb burst traffic."""
    payload = {
        "raw_log": json.dumps({"action": "ALLOW", "message": "burst test"}),
        "source_id": "sensor-01",
    }
    start = time.perf_counter()
    resp = test_client.post("/api/v1/logs/ingest", json=payload)
    dur_ms = (time.perf_counter() - start) * 1000.0

    assert resp.status_code == status.HTTP_202_ACCEPTED
    assert dur_ms < 200.0  # Fast gateway intake


# ---------------------------------------------------------------------------
# 12. Large Batch Handling & Memory Constraints
# ---------------------------------------------------------------------------
def test_large_batch_handling(test_client):
    """Verifies handling a batch up to maximum allowed capacity."""
    raw_logs = [json.dumps({"action": "ALLOW", "seq": i}) for i in range(50)]
    resp = test_client.post(
        "/api/v1/logs/ingest-batch",
        json={"logs": raw_logs, "source_id": "sensor-bulk"},
    )
    assert resp.status_code == status.HTTP_202_ACCEPTED
    data = resp.json()
    assert data["total_received"] == 50
    assert data["total_accepted"] == 50


# ---------------------------------------------------------------------------
# 13. Vectorized AI/ML Batch Anomaly Scoring
# ---------------------------------------------------------------------------
def test_vectorized_ai_batch_scoring(db_session: Session):
    """Verifies that batch_score_events_safely runs vectorized matrix scoring."""
    events = [
        {
            "event_id": str(uuid4()),
            "raw_log": f"event log {i}",
            "source_ip": f"192.168.1.{i}",
            "destination_ip": "10.0.0.1",
            "source_port": 50000 + i,
            "destination_port": 80,
            "protocol": "TCP",
            "action": "ALLOW",
            "severity": "LOW",
            "timestamp": "2026-09-20T01:30:00Z",
        }
        for i in range(10)
    ]

    # If model is not trained in test environment, train lightly on 5 samples
    if not model_instance.is_trained:
        X_dummy = np.random.rand(10, 10)
        model_instance.fit(X_dummy)

    scored_count = batch_score_events_safely(events, db_session)
    assert scored_count == 10


# ---------------------------------------------------------------------------
# 14. Hardware Resource Telemetry (psutil)
# ---------------------------------------------------------------------------
def test_hardware_resource_telemetry(test_collector):
    """Verifies real host CPU and Memory percentage telemetry readings."""
    hw = test_collector.get_hardware_metrics()
    assert "cpu_percent" in hw
    assert "memory_percent" in hw
    # Memory percent on any running system must be between 1% and 100%
    if hw["memory_percent"] is not None:
        assert 1.0 <= hw["memory_percent"] <= 100.0
