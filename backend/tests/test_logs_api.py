"""Integration Tests for Logs Explorer & Audit API Endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.api.dependencies import get_database
from app.main import app as fastapi_app


def test_empty_database_returns_clean_result(test_client: TestClient):
    """14. Empty database returns clean empty list with total=0."""
    response = test_client.get("/api/v1/logs")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["limit"] == 50
    assert data["offset"] == 0
    assert data["events"] == []


def test_get_logs_returns_stored_events(test_client: TestClient, sample_json_log: str):
    """10. GET /api/v1/logs returns stored events after ingestion."""
    # Ingest event
    proc_res = test_client.post("/api/v1/logs/process", json={"raw_log": sample_json_log})
    assert proc_res.status_code == 200
    event_id = proc_res.json()["event_id"]

    # Retrieve from logs explorer API
    response = test_client.get("/api/v1/logs")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["events"]) == 1
    item = data["events"][0]
    assert item["event_id"] == event_id
    assert item["detected_format"] == "json"
    assert item["source_ip"] == "10.0.0.15"


def test_logs_pagination(test_client: TestClient, sample_json_log: str, sample_cef_log: str, sample_syslog_rfc5424: str):
    """11. Pagination works correctly with limit and offset."""
    # Ingest 3 events
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_json_log})
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_cef_log})
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_syslog_rfc5424})

    # Page 1 (limit 2, offset 0)
    page1 = test_client.get("/api/v1/logs?limit=2&offset=0")
    assert page1.status_code == 200
    d1 = page1.json()
    assert d1["total"] == 3
    assert len(d1["events"]) == 2

    # Page 2 (limit 2, offset 2)
    page2 = test_client.get("/api/v1/logs?limit=2&offset=2")
    assert page2.status_code == 200
    d2 = page2.json()
    assert d2["total"] == 3
    assert len(d2["events"]) == 1


def test_logs_filtering_by_format_and_severity(test_client: TestClient, sample_json_log: str, sample_cef_log: str):
    """12. Server-side filters work correctly."""
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_json_log})
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_cef_log})

    # Filter by format
    res_cef = test_client.get("/api/v1/logs?detected_format=cef")
    assert res_cef.status_code == 200
    d_cef = res_cef.json()
    assert d_cef["total"] == 1
    assert d_cef["events"][0]["detected_format"] == "cef"

    # Filter by severity
    res_high = test_client.get("/api/v1/logs?severity=high")
    assert res_high.status_code == 200
    d_high = res_high.json()
    assert d_high["total"] == 1
    assert d_high["events"][0]["severity"] == "high"

    # Filter by source IP
    res_ip = test_client.get("/api/v1/logs?source_ip=10.0.0.15")
    assert res_ip.status_code == 200
    assert res_ip.json()["total"] == 1


def test_get_log_by_event_id_success(test_client: TestClient, sample_json_log: str):
    """13. GET /api/v1/logs/{event_id} returns complete stored event details."""
    proc = test_client.post("/api/v1/logs/process", json={"raw_log": sample_json_log})
    event_id = proc.json()["event_id"]

    res = test_client.get(f"/api/v1/logs/{event_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["event_id"] == event_id
    assert data["raw_event"] == sample_json_log
    assert data["detected_format"] == "json"
    assert data["normalized_event"]["source"]["ip"] == "10.0.0.15"
    assert data["sha256_hash"] == proc.json()["raw_event_hash"]


def test_get_log_by_event_id_not_found(test_client: TestClient):
    """Non-existent UUID returns 404 EVENT_NOT_FOUND."""
    res = test_client.get("/api/v1/logs/11111111-2222-3333-4444-555555555555")
    assert res.status_code == 404
    assert res.json()["detail"]["error"]["code"] == "EVENT_NOT_FOUND"


def test_get_log_by_invalid_uuid(test_client: TestClient):
    """Invalid UUID format returns 422 INVALID_UUID."""
    res = test_client.get("/api/v1/logs/not-a-valid-uuid")
    assert res.status_code == 422
    assert res.json()["detail"]["error"]["code"] == "INVALID_UUID"


def test_database_unavailable_produces_safe_api_error(test_client: TestClient, sample_json_log: str):
    """15. Database unavailable produces HTTP 503 without leaking credentials or stack traces."""
    def broken_db():
        raise OperationalError("SELECT 1", {}, Exception("Connection refused to postgres:5432 with password secret123"))

    fastapi_app.dependency_overrides[get_database] = broken_db

    # Try processing
    res = test_client.post("/api/v1/logs/process", json={"raw_log": sample_json_log})
    assert res.status_code == 503
    data = res.json()
    err_envelope = data.get("detail", data)
    assert err_envelope["status"] == "failed"
    assert err_envelope["error"]["code"] == "DATABASE_UNAVAILABLE"
    # Verify no secret or internal SQL leaked in response
    assert "secret123" not in str(data)
    assert "SELECT 1" not in str(data)

    # Try listing
    list_res = test_client.get("/api/v1/logs")
    assert list_res.status_code == 503
    list_err = list_res.json().get("detail", list_res.json())
    assert list_err["error"]["code"] == "DATABASE_UNAVAILABLE"


def test_malformed_logs_do_not_crash_application(test_client: TestClient):
    """16. Malformed logs do not crash the application."""
    res = test_client.post("/api/v1/logs/process", json={"raw_log": "totally invalid log"})
    assert res.status_code == 422
    assert res.json()["detail"]["status"] == "failed"
    assert res.json()["detail"]["error"]["code"] == "INVALID_LOG_FORMAT"

    # Verify server is still alive
    health = test_client.get("/health")
    assert health.status_code == 200
