import hashlib
from app.parsers.base import BaseParser
from app.parsers.registry import ParserRegistry
from app.services.processing_service import ULPFEngine
from app.utils.ids import is_valid_uuid


def test_engine_process_json_success(engine, sample_json_log):
    result = engine.process_event(sample_json_log)

    assert result.status == "success"
    assert result.format_detected == "json"
    assert is_valid_uuid(result.event_id)

    # Verify lossless raw event preservation
    assert result.raw_event == sample_json_log

    # Verify SHA-256 cryptographic digest
    expected_hash = hashlib.sha256(sample_json_log.encode("utf-8")).hexdigest()
    assert result.raw_event_hash == expected_hash

    # Verify normalization
    assert result.normalized_event is not None
    assert result.normalized_event.source.ip == "10.0.0.15"
    assert result.normalized_event.destination.ip == "192.168.1.1"
    assert result.normalized_event.action == "allow"
    assert result.normalized_event.additional_fields["organization"] == "NTRO"


def test_engine_process_cef_success(engine, sample_cef_log):
    result = engine.process_event(sample_cef_log)

    assert result.status == "success"
    assert result.format_detected == "cef"
    assert is_valid_uuid(result.event_id)
    assert result.raw_event == sample_cef_log

    assert result.normalized_event.source.ip == "198.51.100.25"
    assert result.normalized_event.destination.ip == "203.0.113.50"
    assert result.normalized_event.action == "block"  # "drop" mapped to "block"
    assert result.normalized_event.severity == "high"


def test_engine_process_syslog_success(engine, sample_syslog_rfc5424):
    result = engine.process_event(sample_syslog_rfc5424)

    assert result.status == "success"
    assert result.format_detected == "syslog"
    assert is_valid_uuid(result.event_id)
    assert result.raw_event == sample_syslog_rfc5424
    assert result.normalized_event.device.hostname == "border-gw.ntro.in"


def test_engine_unknown_format_structured_failure(engine):
    invalid_log = "This is not a structured security log format!"
    result = engine.process_event(invalid_log)

    assert result.status == "failed"
    assert result.format_detected == "unknown"
    assert result.normalized_event is None
    assert result.raw_event == invalid_log
    assert result.error is not None
    assert result.error["code"] == "INVALID_LOG_FORMAT"


def test_engine_empty_input_structured_failure(engine):
    result = engine.process_event("")
    assert result.status == "failed"
    assert result.error["code"] == "EMPTY_OR_INVALID_INPUT"


def test_engine_batch_processing(engine, sample_json_log, sample_cef_log):
    logs = [sample_json_log, sample_cef_log, "invalid log"]
    results = engine.process_batch(logs)

    assert len(results) == 3
    assert results[0].status == "success"
    assert results[1].status == "success"
    assert results[2].status == "failed"


def test_plug_and_play_new_parser_registration():
    """Verifies that a new custom parser can be registered dynamically

    without modifying the processing service or core engine code.
    """
    class CustomDeviceParser(BaseParser):
        parser_name = "custom_sensor_parser"
        supported_format = "custom_sensor"

        def can_parse(self, raw_log: str) -> bool:
            return raw_log.startswith("SENSOR_EVT::")

        def parse(self, raw_log: str):
            payload = raw_log.replace("SENSOR_EVT::", "")
            return {"sensor_data": payload, "action": "allow", "src_ip": "172.16.5.5"}

    # Mock format detector extension or register directly
    custom_registry = ParserRegistry()
    custom_parser = CustomDeviceParser()
    custom_registry.register(custom_parser)

    assert custom_registry.get_parser("custom_sensor_parser") is not None
    assert custom_registry.get_parser_for_format("custom_sensor") is not None
    assert "custom_sensor_parser" in custom_registry.list_parsers()
