"""Comprehensive unit and integration tests for LogForge AI/ML Anomaly Detection."""
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
import numpy as np

from app.main import app
from app.ml.anomaly_model import AnomalyDetectionModel, model_instance
from app.ml.explanations import generate_anomaly_explanation
from app.ml.feature_engineering import (
    FEATURE_NAMES,
    build_feature_matrix,
    extract_features_from_dict,
)
from app.models.event import EventModel
from app.models.anomaly import EventAnomalyModel


def test_feature_engineering_dimensions():
    """Verify feature extractor extracts precisely 14 features."""
    sample = {
        "source_ip": "192.168.1.100",
        "destination_ip": "10.0.0.5",
        "source_port": 54321,
        "destination_port": 22,
        "protocol": "tcp",
        "action": "block",
        "severity": "high",
        "timestamp": "2026-09-12T23:30:00Z",
    }
    vec, snapshot = extract_features_from_dict(sample)
    assert len(vec) == 14
    assert len(snapshot) == 14
    assert snapshot["is_remote_access_port"] == 1.0
    assert snapshot["action_num"] == 1.0
    assert snapshot["severity_num"] == 3.0
    assert snapshot["is_internal_src"] == 1.0
    assert snapshot["is_internal_dst"] == 1.0
    assert snapshot["hour_of_day"] == 23.0


def test_explanations_generator():
    """Verify human-readable explanations produce domain-relevant text."""
    # Normal event
    normal_exp = generate_anomaly_explanation(
        score=0.15,
        classification="Normal",
        features={},
    )
    assert "aligns with standard operational baseline" in normal_exp

    # Anomalous event with remote port and block action
    features = {
        "dst_port_num": 22,
        "is_remote_access_port": 1.0,
        "action_num": 1.0,
        "severity_num": 3.0,
        "hour_of_day": 3,
        "is_internal_src": 0.0,
        "is_internal_dst": 1.0,
    }
    anomaly_exp = generate_anomaly_explanation(
        score=0.88,
        classification="Highly Anomalous",
        features=features,
        source_ip="198.51.100.23",
        destination_ip="10.0.0.5",
        action="block",
        protocol="tcp",
    )
    assert "198.51.100.23" in anomaly_exp
    assert "BLOCK/DENY/DROP" in anomaly_exp
    assert "SSH (22)" in anomaly_exp
    assert "External inbound ingress" in anomaly_exp


def test_anomaly_model_minimum_samples():
    """Ensure training fails when samples < 5."""
    model = AnomalyDetectionModel()
    small_X = np.ones((4, 14))
    with pytest.raises(ValueError, match="Insufficient training samples"):
        model.fit(small_X)


def test_anomaly_model_fit_and_score():
    """Ensure training and scoring produces bounded scores and valid classifications."""
    model = AnomalyDetectionModel(contamination=0.2, random_state=42)
    # Generate 30 normal-like samples and 2 outlier-like samples
    np.random.seed(42)
    normal_data = np.random.normal(loc=10.0, scale=1.0, size=(30, 14))
    outlier_data = np.random.normal(loc=100.0, scale=1.0, size=(2, 14))
    X = np.vstack([normal_data, outlier_data])

    model.fit(X)
    assert model.is_trained is True

    scores = model.score_matrix(X)
    assert len(scores) == 32
    for score, classification in scores:
        assert 0.0 <= score <= 1.0
        assert classification in ("Normal", "Suspicious", "Highly Anomalous")


def test_ml_status_api(test_client: TestClient):
    """Test GET /api/v1/ml/status."""
    response = test_client.get("/api/v1/ml/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_trained" in data
    assert data["model_name"] == "IsolationForest"
    assert "contamination" in data


def test_ml_train_api_insufficient_samples(test_client: TestClient, db_session):
    """Test POST /api/v1/ml/train when DB has fewer than 5 events."""
    # Ensure DB is empty or has < 5 events
    db_session.query(EventAnomalyModel).delete()
    db_session.query(EventModel).delete()
    db_session.commit()

    response = test_client.post("/api/v1/ml/train", json={"contamination": 0.1})
    assert response.status_code == 400
    assert "Insufficient training samples" in response.json()["detail"]


def test_ml_train_and_query_flow(test_client: TestClient, db_session):
    """Integration test: ingest 6 logs, train model, verify anomalies API and summary API."""
    # Ingest 6 logs of various formats
    logs = [
        '{"timestamp": "2026-09-12T10:00:00Z", "source_ip": "10.0.0.1", "destination_ip": "10.0.0.2", "destination_port": 80, "protocol": "tcp", "action": "allow", "severity": "low"}',
        '{"timestamp": "2026-09-12T10:01:00Z", "source_ip": "10.0.0.1", "destination_ip": "10.0.0.2", "destination_port": 443, "protocol": "tcp", "action": "allow", "severity": "low"}',
        '{"timestamp": "2026-09-12T10:02:00Z", "source_ip": "10.0.0.3", "destination_ip": "10.0.0.2", "destination_port": 80, "protocol": "tcp", "action": "allow", "severity": "low"}',
        '{"timestamp": "2026-09-12T10:03:00Z", "source_ip": "10.0.0.4", "destination_ip": "10.0.0.2", "destination_port": 80, "protocol": "tcp", "action": "allow", "severity": "info"}',
        '{"timestamp": "2026-09-12T10:04:00Z", "source_ip": "10.0.0.5", "destination_ip": "10.0.0.2", "destination_port": 443, "protocol": "tcp", "action": "allow", "severity": "info"}',
        '{"timestamp": "2026-09-12T03:30:00Z", "source_ip": "203.0.113.99", "destination_ip": "10.0.0.2", "destination_port": 22, "protocol": "tcp", "action": "block", "severity": "critical"}',
    ]

    event_ids = []
    for log_str in logs:
        res = test_client.post("/api/v1/logs/process", json={"raw_log": log_str})
        assert res.status_code == 200
        event_ids.append(res.json()["event_id"])

    # Train model
    train_res = test_client.post("/api/v1/ml/train", json={"contamination": 0.15, "rescore_existing": True})
    assert train_res.status_code == 200
    train_data = train_res.json()
    assert train_data["status"] == "success"
    assert train_data["events_trained"] >= 6
    assert train_data["anomalies_scored"] >= 6

    # Test summary endpoint
    summary_res = test_client.get("/api/v1/ml/anomalies/summary")
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["total_scored_events"] >= 6
    assert summary_data["is_trained"] is True
    assert "average_anomaly_score" in summary_data

    # Test anomalies list endpoint
    list_res = test_client.get("/api/v1/ml/anomalies?page=1&page_size=10")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 6
    assert len(list_data["items"]) >= 6

    # Test single anomaly detail endpoint
    target_id = event_ids[-1]  # The suspicious SSH event
    detail_res = test_client.get(f"/api/v1/ml/anomalies/{target_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["event_id"] == target_id
    assert 0.0 <= detail_data["anomaly_score"] <= 1.0
    assert detail_data["classification"] in ("Normal", "Suspicious", "Highly Anomalous")
    assert len(detail_data["explanation"]) > 0

    # Test log explorer get single log includes anomaly
    log_detail_res = test_client.get(f"/api/v1/logs/{target_id}")
    assert log_detail_res.status_code == 200
    log_detail = log_detail_res.json()
    assert log_detail["anomaly"] is not None
    assert log_detail["anomaly"]["event_id"] == target_id

