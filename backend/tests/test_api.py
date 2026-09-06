def test_api_health(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "LogForge" in data["service"]
    assert "json_parser" in data["registered_parsers"]
    assert "cef_parser" in data["registered_parsers"]
    assert "syslog_parser" in data["registered_parsers"]


def test_api_process_json_log(test_client, sample_json_log):
    response = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": sample_json_log, "source_hint": "cloud_gateway"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["format_detected"] == "json"
    assert data["raw_event"] == sample_json_log
    assert len(data["raw_event_hash"]) == 64
    assert data["normalized_event"]["source"]["ip"] == "10.0.0.15"


def test_api_process_cef_log(test_client, sample_cef_log):
    response = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": sample_cef_log},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["format_detected"] == "cef"
    assert data["normalized_event"]["action"] == "block"


def test_api_process_syslog_log(test_client, sample_syslog_rfc5424):
    response = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": sample_syslog_rfc5424},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["format_detected"] == "syslog"


def test_api_process_unknown_format_returns_422(test_client):
    response = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": "This is completely unparseable garbage text."},
    )
    assert response.status_code == 422
    data = response.json()
    # Structured error envelope
    assert data["detail"]["status"] == "failed"
    assert data["detail"]["error"]["code"] == "INVALID_LOG_FORMAT"


def test_api_process_batch(test_client, sample_json_log, sample_cef_log):
    response = test_client.post(
        "/api/v1/logs/batch",
        json={
            "raw_logs": [
                sample_json_log,
                sample_cef_log,
                "garbage unparseable line",
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert data["successful"] == 2
    assert data["failed"] == 1
    assert len(data["results"]) == 3
