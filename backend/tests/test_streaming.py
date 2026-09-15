"""Comprehensive Unit and Integration Tests for Distributed Kafka Streaming & Ingestion."""
import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.core.config import settings
from app.streaming.admin import KafkaAdminService
from app.streaming.consumer import ULPFStreamConsumer
from app.streaming.producer import KafkaProducerService
from app.models.event import EventModel
from app.models.integrity import EventIntegrityModel


class TestKafkaProducerService:
    """Unit tests for KafkaProducerService."""

    def test_produce_raw_event_when_disabled(self):
        """When KAFKA_ENABLED=False, producer safely returns (False, None, None) without error."""
        with patch.object(settings, "KAFKA_ENABLED", False):
            producer = KafkaProducerService()
            success, topic, partition = producer.produce_raw_event(
                event_id="test-uuid-1",
                raw_log="<134>1 2026-09-15 test log",
                source_id="agent-01",
            )
            assert success is False
            assert topic is None

    def test_produce_raw_event_success_mock(self):
        """When Kafka is enabled and mock producer accepts, returns (True, topic, partition)."""
        with patch.object(settings, "KAFKA_ENABLED", True):
            producer = KafkaProducerService()
            mock_kafka_client = MagicMock()
            producer._producer = mock_kafka_client

            success, topic, partition = producer.produce_raw_event(
                event_id="test-uuid-2",
                raw_log='{"event": "firewall_drop"}',
                source_id="firewall-east",
            )

            assert success is True
            assert topic == settings.KAFKA_LOG_TOPIC
            assert mock_kafka_client.produce.called
            call_kwargs = mock_kafka_client.produce.call_args[1]
            assert call_kwargs["topic"] == settings.KAFKA_LOG_TOPIC
            assert call_kwargs["key"] == b"firewall-east"
            payload = json.loads(call_kwargs["value"].decode("utf-8"))
            assert payload["event_id"] == "test-uuid-2"
            assert payload["raw_event"] == '{"event": "firewall_drop"}'

    def test_produce_dlq_mock(self):
        """DLQ routing formats structured diagnostic payload."""
        with patch.object(settings, "KAFKA_ENABLED", True):
            producer = KafkaProducerService()
            mock_kafka_client = MagicMock()
            producer._producer = mock_kafka_client

            res = producer.produce_dlq(
                event_id="bad-event-1",
                raw_log="corrupted bytes",
                error_type="PARSE_FAILURE",
                error_message="Unexpected EOF",
                failed_stage="PARSER_DETECTION",
                retry_count=3,
            )

            assert res is True
            assert mock_kafka_client.produce.called
            call_kwargs = mock_kafka_client.produce.call_args[1]
            assert call_kwargs["topic"] == settings.KAFKA_DLQ_TOPIC
            assert call_kwargs["key"] == b"bad-event-1"
            dlq_data = json.loads(call_kwargs["value"].decode("utf-8"))
            assert dlq_data["error_type"] == "PARSE_FAILURE"
            assert dlq_data["retry_count"] == 3


class TestKafkaAdminService:
    """Unit tests for KafkaAdminService health diagnostics."""

    def test_cluster_health_when_disabled(self):
        """Returns DISABLED status when Kafka is disabled."""
        with patch.object(settings, "KAFKA_ENABLED", False):
            admin = KafkaAdminService()
            health = admin.get_cluster_health()
            assert health["status"] == "DISABLED"
            assert health["enabled"] is False

    def test_cluster_health_when_disconnected(self):
        """Returns DISCONNECTED when Kafka broker is unreachable."""
        with patch.object(settings, "KAFKA_ENABLED", True):
            admin = KafkaAdminService()
            with patch.object(admin, "_get_client", return_value=None):
                health = admin.get_cluster_health()
                assert health["status"] == "DISCONNECTED"
                assert health["enabled"] is True


class TestStreamingApiRoutes:
    """API endpoint integration tests."""

    def test_streaming_health_endpoint(self, test_client: TestClient):
        """GET /api/v1/streaming/health returns 200 with valid schema."""
        resp = test_client.get("/api/v1/streaming/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "bootstrap_servers" in data
        assert "consumer_group" in data
        assert isinstance(data["topics"], list)

    def test_ingest_single_log_sync_fallback(self, test_client: TestClient, sample_json_log: str):
        """POST /api/v1/logs/ingest returns 202 Accepted and falls back cleanly if Kafka disabled."""
        payload = {
            "raw_log": sample_json_log,
            "source_id": "sensor-alpha",
            "source_hint": "json",
        }
        resp = test_client.post("/api/v1/logs/ingest", json=payload)
        assert resp.status_code == 202
        data = resp.json()
        assert data["status"] == "accepted"
        assert "event_id" in data
        assert data["mode"] in ("async_kafka", "sync_fallback")

    def test_ingest_single_log_kafka_mode(self, test_client: TestClient, sample_cef_log: str):
        """POST /api/v1/logs/ingest returns async_kafka mode when Kafka is mocked enabled."""
        with patch.object(settings, "KAFKA_ENABLED", True):
            with patch("app.api.routes.logs.kafka_producer_service.produce_raw_event", return_value=(True, "logforge.raw-events", 0)):
                payload = {
                    "raw_log": sample_cef_log,
                    "source_id": "firewall-gw",
                }
                resp = test_client.post("/api/v1/logs/ingest", json=payload)
                assert resp.status_code == 202
                data = resp.json()
                assert data["status"] == "accepted"
                assert data["mode"] == "async_kafka"
                assert data["topic"] == "logforge.raw-events"
                assert data["partition"] == 0

    def test_ingest_batch_sync_fallback(self, test_client: TestClient, sample_json_log: str, sample_cef_log: str):
        """POST /api/v1/logs/ingest-batch accepts multiple heterogeneous logs."""
        payload = {
            "logs": [sample_json_log, sample_cef_log],
            "source_id": "batch-agent-99",
        }
        resp = test_client.post("/api/v1/logs/ingest-batch", json=payload)
        assert resp.status_code == 202
        data = resp.json()
        assert data["status"] == "accepted"
        assert data["total_received"] == 2
        assert data["total_accepted"] == 2
        assert len(data["event_ids"]) == 2

    def test_ingest_rejects_binary_stream(self, test_client: TestClient):
        """POST /api/v1/logs/ingest rejects binary or null byte payloads with 422."""
        payload = {
            "raw_log": "Regular text with null byte: \x00 bad binary",
        }
        resp = test_client.post("/api/v1/logs/ingest", json=payload)
        assert resp.status_code == 422


class TestULPFStreamConsumer:
    """Unit tests for ULPFStreamConsumer processing & idempotency."""

    def test_consumer_process_single_message_idempotent(self, db_session, sample_json_log: str):
        """Consumer processes message and idempotently ignores redelivered duplicates."""
        consumer = ULPFStreamConsumer()
        event_id = "550e8400-e29b-41d4-a716-446655440000"
        msg_payload = json.dumps({
            "event_id": event_id,
            "raw_event": sample_json_log,
            "source_id": "test-agent",
            "source_hint": "json",
            "retry_count": 0,
        })

        with patch("app.streaming.consumer.SessionLocal", return_value=db_session):
            # First delivery
            ok1 = consumer.process_single_message(msg_payload)
            assert ok1 is True

            # Verify saved in database
            stored = db_session.query(EventModel).filter_by(event_id=event_id).first()
            assert stored is not None
            assert stored.event_id == event_id

            # Second delivery (Kafka redelivery / duplicate)
            ok2 = consumer.process_single_message(msg_payload)
            assert ok2 is True  # Idempotent success without constraint violation

            # Total rows with that event_id must remain exactly 1
            count = db_session.query(EventModel).filter_by(event_id=event_id).count()
            assert count == 1

    def test_consumer_routes_poison_pill_to_dlq(self, db_session):
        """Consumer catches poison pills (invalid JSON) and sends to DLQ without crashing."""
        consumer = ULPFStreamConsumer()
        with patch("app.streaming.consumer.kafka_producer_service.produce_dlq") as mock_dlq:
            ok = consumer.process_single_message("NOT_VALID_JSON{{{")
            assert ok is True  # Must return True so bad offset can be committed
            assert mock_dlq.called
            args = mock_dlq.call_args[1]
            assert args["error_type"] == "JSON_DECODE_ERROR"
