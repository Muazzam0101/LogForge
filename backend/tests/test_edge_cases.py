import hashlib
from app.services.processing_service import ULPFEngine


def test_lossless_preservation_with_unicode_and_special_chars():
    engine = ULPFEngine()
    raw = (
        '{"timestamp": "2026-09-06T10:00:00Z", "src_ip": "10.0.0.1", '
        '"message": "Attack attempt with unicode: \u26a0\ufe0f \u2620\ufe0f & special <script>\\n\\t\\r", '
        '"vendor_custom_binary_tag": "0xDEADBEEF", "action": "deny"}'
    )
    result = engine.process_event(raw)

    assert result.status == "success"
    # Byte-exact raw event preservation
    assert result.raw_event == raw
    assert result.raw_event_hash == hashlib.sha256(raw.encode("utf-8")).hexdigest()
    assert result.normalized_event.action == "block"
    assert result.normalized_event.additional_fields["vendor_custom_binary_tag"] == "0xDEADBEEF"


def test_malformed_json_syntax_returns_structured_failure():
    engine = ULPFEngine()
    # Looks like JSON start/end, but invalid JSON syntax inside
    broken_json = '{"src_ip": "10.0.0.1", "action": "allow", broken syntax here}'
    result = engine.process_event(broken_json)

    assert result.status == "failed"
    assert result.error is not None
    assert result.error["code"] == "INVALID_LOG_FORMAT"


def test_syslog_pri_edge_cases():
    engine = ULPFEngine()
    # PRI 0 = kernel emergency
    log_pri0 = "<0>Sep  6 00:00:00 server kernel: System halting immediately"
    res0 = engine.process_event(log_pri0)
    assert res0.status == "success"
    assert res0.normalized_event.severity == "critical"
    assert res0.normalized_event.severity_code == 0

    # PRI 191 (Local7.Debug: 191 // 8 = 23, 191 % 8 = 7)
    log_pri191 = "<191>1 2026-09-06T10:00:00Z router app 123 - - Debug level tracing message"
    res191 = engine.process_event(log_pri191)
    assert res191.status == "success"
    assert res191.normalized_event.severity == "informational"
    assert res191.normalized_event.severity_code == 7


def test_cef_missing_segments_fails_gracefully():
    engine = ULPFEngine()
    # CEF missing required segment pipes
    broken_cef = "CEF:0|Vendor|Product"
    result = engine.process_event(broken_cef)

    assert result.status == "failed"
    assert result.error["code"] == "INVALID_LOG_FORMAT"


def test_batch_processing_large_heterogeneous_mix():
    engine = ULPFEngine()
    logs = [
        '{"src_ip": "192.168.1.100", "action": "ALLOW"}',
        "CEF:0|Fortinet|FortiGate|6.0|100|Traffic Allow|Low|src=10.0.0.2 dst=8.8.8.8 proto=udp act=allow",
        "<134>Sep  6 10:00:00 router kernel: SRC=1.2.3.4 DST=5.6.7.8 ACTION=DROP",
        "random noise that cannot be parsed",
    ]
    results = engine.process_batch(logs)

    assert len(results) == 4
    assert results[0].status == "success"
    assert results[0].format_detected == "json"
    assert results[1].status == "success"
    assert results[1].format_detected == "cef"
    assert results[2].status == "success"
    assert results[2].format_detected == "syslog"
    assert results[3].status == "failed"
    assert results[3].format_detected == "unknown"
