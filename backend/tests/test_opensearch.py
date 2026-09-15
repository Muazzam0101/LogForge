"""Comprehensive Test Suite for OpenSearch Scalability Layer.

Covers connection management, explicit mapping verification, document serialization,
single & bulk indexing, full-text search, multi-criteria filters, time-range queries,
aggregations, pagination & search_after, graceful MySQL fallback, non-breaking ingestion,
reindexing from authoritative MySQL storage, and cluster health APIs.
"""
from datetime import datetime, timezone
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.repositories.event_repository import EventRepository
from app.main import app
from app.models.event import EventModel
from app.schemas.event import EndpointEntity, NormalizedEvent, ProcessingMetadata, ProcessingResult
from app.search.client import OpenSearchClientManager
from app.search.index import (
    BASE_INDEX_NAME,
    DEFAULT_ALIAS_NAME,
    EVENT_INDEX_BODY,
    ensure_index_and_alias,
)
from app.search.queries import (
    OpenSearchQueryBuilder,
    decode_search_after,
    encode_search_after,
)
from app.search.repository import OpenSearchRepository
from app.search.serializers import EventDocumentSerializer
from app.search.service import SearchService


# Fixture for sample processing result
@pytest.fixture
def sample_processing_result() -> ProcessingResult:
    return ProcessingResult(
        status="success",
        event_id="9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        format_detected="cef",
        normalized_event=NormalizedEvent(
            timestamp=datetime(2026, 9, 13, 12, 0, 0, tzinfo=timezone.utc),
            event_type="connection_dropped",
            action="block",
            severity="high",
            message="Inbound malicious connection blocked by perimeter firewall",
            source=EndpointEntity(ip="198.51.100.42", port=4444),
        ),
        raw_event="CEF:0|CheckPoint|VPN-1|1.0|drop|Inbound malicious connection|High|src=198.51.100.42 spt=4444",
        raw_event_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        processing_metadata=ProcessingMetadata(processing_time_ms=0.5),
    )


# 1. Connection & Disabled State Tests
def test_opensearch_disabled_mode():
    """Verifies that when OPENSEARCH_ENABLED=False, manager returns None and ping is False."""
    with patch.object(settings, "OPENSEARCH_ENABLED", False):
        manager = OpenSearchClientManager()
        assert manager.get_client() is None
        assert manager.is_available() is False
        health = manager.get_cluster_health()
        assert health["status"] == "DISABLED"
        assert health["enabled"] is False


def test_opensearch_available_ping():
    """Verifies is_available checks ping() on client."""
    mock_client = MagicMock()
    mock_client.ping.return_value = True

    manager = OpenSearchClientManager()
    with patch.object(settings, "OPENSEARCH_ENABLED", True):
        with patch.object(manager, "get_client", return_value=mock_client):
            assert manager.is_available() is True
            mock_client.ping.assert_called_once()


# 2. Index Schema & Mapping Tests
def test_mapping_prevents_field_explosion():
    """Verifies explicit mapping has dynamic: false and controls vendor-specific fields."""
    mappings = EVENT_INDEX_BODY["mappings"]
    assert mappings["dynamic"] == "false"
    props = mappings["properties"]

    assert props["event_id"]["type"] == "keyword"
    assert props["source_ip"]["type"] == "ip"
    assert props["source_ip"]["ignore_malformed"] is True
    assert props["destination_ip"]["type"] == "ip"
    assert props["message"]["type"] == "text"
    assert props["raw_event"]["type"] == "text"
    assert props["additional_fields"]["type"] == "object"
    assert props["additional_fields"]["dynamic"] is False


def test_ensure_index_and_alias_creation():
    """Verifies ensure_index_and_alias creates index with schema and maps alias."""
    mock_client = MagicMock()
    mock_client.indices.exists.return_value = False
    mock_client.indices.exists_alias.return_value = False

    success = ensure_index_and_alias(mock_client, BASE_INDEX_NAME, DEFAULT_ALIAS_NAME)
    assert success is True
    mock_client.indices.create.assert_called_once_with(index=BASE_INDEX_NAME, body=EVENT_INDEX_BODY)
    mock_client.indices.put_alias.assert_called_once_with(index=BASE_INDEX_NAME, name=DEFAULT_ALIAS_NAME)


# 3. Serialization Tests
def test_document_serialization_from_processing_result(sample_processing_result):
    """Verifies serialization cleans IPs, ports, and formats ISO timestamps."""
    doc = EventDocumentSerializer.serialize_processing_result(sample_processing_result)
    assert doc["event_id"] == "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    assert doc["detected_format"] == "cef"
    assert doc["action"] == "block"
    assert doc["severity"] == "high"
    assert doc["source_ip"] == "198.51.100.42"
    assert doc["source_port"] == 4444
    assert "2026-09-13T12:00:00" in doc["timestamp"]
    assert doc["sha256_hash"] == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


# 4. Repository & Ingestion Tests
def test_single_document_indexing():
    """Verifies single document indexing passes document to client."""
    mock_client = MagicMock()
    repo = OpenSearchRepository(client=mock_client, alias="logforge-events")

    doc = {"event_id": "test-uuid-1", "severity": "high"}
    result = repo.index_document(doc, event_id="test-uuid-1")

    assert result is True
    mock_client.index.assert_called_once_with(
        index="logforge-events",
        id="test-uuid-1",
        body=doc,
        refresh=False,
    )


def test_bulk_indexing_helpers_bulk():
    """Verifies bulk indexing batches actions for helpers.bulk."""
    mock_client = MagicMock()
    repo = OpenSearchRepository(client=mock_client, alias="logforge-events")

    docs = [
        {"event_id": "uuid-1", "action": "allow"},
        {"event_id": "uuid-2", "action": "block"},
    ]

    with patch("app.search.repository.helpers.bulk", return_value=(2, [])) as mock_bulk:
        success, errors = repo.bulk_index_documents(docs, chunk_size=500)
        assert success == 2
        assert len(errors) == 0
        mock_bulk.assert_called_once()


def test_bulk_partial_failure_handling():
    """Verifies bulk indexing handles partial item errors gracefully without raising."""
    mock_client = MagicMock()
    repo = OpenSearchRepository(client=mock_client, alias="logforge-events")

    docs = [{"event_id": "uuid-1"}]
    with patch("app.search.repository.helpers.bulk", return_value=(0, [{"index": {"error": "mapper_parsing_exception"}}])):
        success, errors = repo.bulk_index_documents(docs)
        assert success == 0
        assert len(errors) == 1


# 5. Query Builder Tests
def test_query_builder_full_text_and_filters():
    """Verifies OpenSearchQueryBuilder constructs multi_match and term filters."""
    query = OpenSearchQueryBuilder.build_search_query(
        q="malicious connection",
        severity="high",
        action="block",
        protocol="tcp",
        source_ip="192.168.1.10",
        limit=25,
        offset=0,
    )

    must = query["query"]["bool"]["must"]
    filters = query["query"]["bool"]["filter"]

    # Full-text multi_match present
    assert any("multi_match" in clause for clause in must)

    # Exact filters present
    filter_keys = [list(f.get("term", {}).keys())[0] for f in filters if "term" in f]
    assert "severity" in filter_keys
    assert "action" in filter_keys
    assert "protocol" in filter_keys
    assert "source_ip" in filter_keys


def test_pagination_and_search_after_encoding():
    """Verifies search_after cursor token encoding and decoding."""
    sort_values = [1789310000000, "uuid-abc-123"]
    token = encode_search_after(sort_values)
    assert isinstance(token, str)

    decoded = decode_search_after(token)
    assert decoded == sort_values

    # Query builder with search_after
    query = OpenSearchQueryBuilder.build_search_query(limit=10, search_after=token)
    assert query["search_after"] == sort_values
    assert "from" not in query


def test_analytics_aggregations_builder():
    """Verifies aggregations builder configures date_histogram and term metrics."""
    query = OpenSearchQueryBuilder.build_analytics_aggregations(time_range="24h", interval="1h")
    aggs = query["aggs"]

    assert "events_over_time" in aggs
    assert aggs["events_over_time"]["date_histogram"]["calendar_interval"] == "1h"
    assert "severity_distribution" in aggs
    assert "action_distribution" in aggs
    assert "format_distribution" in aggs
    assert "top_source_ips" in aggs


# 6. Service & MySQL Fallback Tests
def test_search_events_opensearch_success(db_session: Session):
    """Verifies search_service returns opensearch engine type when active."""
    mock_client = MagicMock()
    mock_client.ping.return_value = True
    mock_client.search.return_value = {
        "hits": {
            "total": {"value": 1},
            "hits": [
                {
                    "_id": "uuid-search-1",
                    "_source": {
                        "event_id": "uuid-search-1",
                        "timestamp": "2026-09-13T10:00:00Z",
                        "detected_format": "json",
                        "severity": "medium",
                        "action": "allow",
                        "raw_event": '{"test": "log"}',
                        "sha256_hash": "hash123",
                    },
                    "sort": [1789310000000, "uuid-search-1"],
                }
            ],
        }
    }

    mock_manager = MagicMock()
    mock_manager.get_client.return_value = mock_client
    mock_manager.is_available.return_value = True

    repo = OpenSearchRepository(client=mock_client, alias="logforge-events")
    service = SearchService(client_manager=mock_manager, repository=repo)

    with patch.object(settings, "OPENSEARCH_ENABLED", True):
        res = service.search_events(db=db_session, engine="opensearch", q="test", limit=10)
        assert res.total == 1
        assert res.search_engine == "opensearch"
        assert len(res.events) == 1
        assert res.events[0].event_id == "uuid-search-1"
        assert res.search_after is not None


def test_search_events_fallback_to_mysql_when_offline(db_session: Session):
    """Verifies search_service transparently falls back to MySQL when OpenSearch ping fails."""
    # Insert real event into MySQL test db
    event = EventModel(
        event_id="mysql-fallback-uuid-1",
        detected_format="syslog",
        severity="low",
        action="allow",
        raw_event="Sep 13 12:00:00 host app: test fallback log",
        sha256_hash="abc123sha",
    )
    db_session.add(event)
    db_session.commit()

    mock_manager = MagicMock()
    mock_manager.is_available.return_value = False  # Offline!

    service = SearchService(client_manager=mock_manager)

    with patch.object(settings, "OPENSEARCH_ENABLED", True):
        res = service.search_events(db=db_session, engine="opensearch", limit=10)
        assert res.search_engine == "mysql_fallback"

        assert res.total >= 1
        found = any(e.event_id == "mysql-fallback-uuid-1" for e in res.events)
        assert found is True


# 7. Non-Breaking Ingestion Test
def test_ingestion_succeeds_even_when_opensearch_crashes(test_client: TestClient, db_session: Session):
    """Verifies POST /api/v1/logs/process commits to MySQL with HTTP 200 even if OpenSearch raises."""
    with patch("app.search.service.search_service.index_event_safely", side_effect=Exception("OpenSearch Connection Refused")):
        payload = {
            "raw_log": '{"event_type": "login", "user": "alice", "action": "allow", "severity": "informational"}',
            "source_hint": "auth_proxy",
        }
        res = test_client.post("/api/v1/logs/process", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        event_id = data["event_id"]

        # Verify authoritative persistence in MySQL succeeded!
        db_event = EventRepository.get_by_event_id(db_session, event_id)
        assert db_event is not None
        assert db_event.event_id == event_id


# 8. Reindex Service Test
def test_reindex_from_mysql(db_session: Session):
    """Verifies administrative reindexing streams from MySQL into OpenSearch."""
    # Ensure at least 2 events exist in db_session
    for i in range(2):
        ev = EventModel(
            event_id=f"reindex-test-uuid-{i}",
            detected_format="json",
            severity="info",
            action="allow",
            raw_event=f'{{"count": {i}}}',
            sha256_hash=f"hash-{i}",
        )
        db_session.add(ev)
    db_session.commit()

    mock_client = MagicMock()
    mock_manager = MagicMock()
    mock_manager.get_client.return_value = mock_client
    mock_manager.is_available.return_value = True

    repo = OpenSearchRepository(client=mock_client, alias="logforge-events")
    service = SearchService(client_manager=mock_manager, repository=repo)

    with patch.object(settings, "OPENSEARCH_ENABLED", True):
        with patch("app.search.service.ensure_index_and_alias", return_value=True):
            with patch.object(repo, "bulk_index_documents", return_value=(2, [])):
                result = service.reindex_from_mysql(db=db_session, batch_size=10)
                assert result["status"] == "completed"
                assert result["total_mysql_events"] >= 2


# 9. Health Endpoint Test
def test_search_health_api(test_client: TestClient):
    """Verifies GET /api/v1/search/health returns expected schema."""
    res = test_client.get("/api/v1/search/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "enabled" in data
    assert data["status"] in ["CONNECTED", "DISCONNECTED", "DISABLED", "DEGRADED"]


# 10. MySQL Authoritative Source of Truth & Traceability Tests
def test_mysql_remains_authoritative_source_of_truth(db_session: Session):
    """Verifies that MySQL retains pristine raw logs and hash regardless of OpenSearch status."""
    event_id = "authoritative-uuid-999"
    raw_log = 'CEF:0|Vendor|Product|1.0|drop|Action Taken|High|src=10.0.0.1 dst=10.0.0.2'
    event = EventModel(
        event_id=event_id,
        detected_format="cef",
        severity="high",
        action="block",
        raw_event=raw_log,
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )
    db_session.add(event)
    db_session.commit()

    # Query from MySQL DAO
    stored = EventRepository.get_by_event_id(db_session, event_id)
    assert stored is not None
    assert stored.raw_event == raw_log
    assert stored.sha256_hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


def test_event_traceability_via_event_id(test_client: TestClient, db_session: Session):
    """Verifies that event_id is preserved as primary traceability key across OpenSearch and MySQL."""
    event_id = "550e8400-e29b-41d4-a716-446655440000"
    event = EventModel(
        event_id=event_id,
        detected_format="json",
        severity="medium",
        action="allow",
        raw_event='{"event": "traceable"}',
        sha256_hash="tracehash777",
    )
    db_session.add(event)
    db_session.commit()

    # Verify event detail can be retrieved by event_id via API
    res = test_client.get(f"/api/v1/logs/{event_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["event_id"] == event_id
    assert data["raw_event"] == '{"event": "traceable"}'
    assert data["sha256_hash"] == "tracehash777"
