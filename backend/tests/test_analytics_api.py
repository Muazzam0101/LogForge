"""Integration Tests for LogForge Analytics and Dashboard APIs."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.api.dependencies import get_database
from app.main import app as fastapi_app


def test_empty_database_analytics_summary(test_client: TestClient):
    """Empty database returns all zero counts without errors or fake numbers."""
    res = test_client.get("/api/v1/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_events"] == 0
    assert data["events_today"] == 0
    assert data["events_last_24h"] == 0
    assert data["high_severity_events"] == 0
    assert data["critical_severity_events"] == 0
    assert data["blocked_events"] == 0
    assert data["active_sources_count"] == 0


def test_empty_database_distributions(test_client: TestClient):
    """Empty database returns empty distribution lists."""
    res = test_client.get("/api/v1/analytics/distributions")
    assert res.status_code == 200
    data = res.json()
    assert data["format_distribution"] == []
    assert data["severity_distribution"] == []
    assert data["action_distribution"] == []
    assert data["top_source_ips"] == []
    assert data["top_destination_ips"] == []


def test_analytics_summary_with_real_ingested_events(
    test_client: TestClient, sample_json_log: str, sample_cef_log: str, sample_syslog_rfc5424: str
):
    """Analytics accurately calculates metrics over real ingested events."""
    # Ingest 3 events
    # sample_json_log: informational, action=ALLOW, src=10.0.0.15, dst=192.168.1.1
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_json_log})
    # sample_cef_log: High, action=drop, src=198.51.100.25, dst=203.0.113.50
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_cef_log})
    # sample_syslog_rfc5424: action=Deny, src=10.10.10.5, dst=172.16.0.2
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_syslog_rfc5424})

    # Summary
    res = test_client.get("/api/v1/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_events"] == 3
    assert data["events_today"] == 3
    assert data["events_last_24h"] == 3
    # CEF log has severity "High"
    assert data["high_severity_events"] >= 1
    # CEF log has action "drop"
    assert data["blocked_events"] >= 1
    # 2 distinct source IPs
    assert data["active_sources_count"] == 2


def test_analytics_distributions_with_real_events(
    test_client: TestClient, sample_json_log: str, sample_cef_log: str
):
    """Distributions accurately categorize format, severity, and top endpoints."""
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_json_log})
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_cef_log})

    res = test_client.get("/api/v1/analytics/distributions")
    assert res.status_code == 200
    data = res.json()

    # Format distribution: should have JSON and CEF
    formats = {item["name"].lower(): item["count"] for item in data["format_distribution"]}
    assert "json" in formats
    assert formats["json"] == 1
    assert "cef" in formats
    assert formats["cef"] == 1

    # Top Source IPs
    sources = {item["ip"]: item["count"] for item in data["top_source_ips"]}
    assert "10.0.0.15" in sources
    assert sources["10.0.0.15"] == 1


def test_analytics_trends_and_overview(test_client: TestClient, sample_json_log: str):
    """Overview endpoint unifies summary, distributions, and trends."""
    test_client.post("/api/v1/logs/process", json={"raw_log": sample_json_log})

    res = test_client.get("/api/v1/analytics/overview?time_range=24h")
    assert res.status_code == 200
    data = res.json()

    assert data["summary"]["total_events"] == 1
    assert len(data["distributions"]["format_distribution"]) >= 1
    assert isinstance(data["trends"], list)
    assert data["time_range"] == "24h"


def test_analytics_database_unavailable_error(test_client: TestClient):
    """Database unavailable produces HTTP 503 without leaking stack traces."""
    def broken_db():
        raise OperationalError("SELECT 1", {}, Exception("Database connection failed"))

    fastapi_app.dependency_overrides[get_database] = broken_db

    res = test_client.get("/api/v1/analytics/summary")
    assert res.status_code == 503
    data = res.json()
    err = data.get("detail", data)
    assert err["status"] == "failed"
    assert err["error"]["code"] == "DATABASE_UNAVAILABLE"
