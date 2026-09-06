from app.parsers.detector import FormatDetector


def test_detect_json(sample_json_log):
    assert FormatDetector.detect(sample_json_log) == "json"
    assert FormatDetector.detect('{"key": "value"}') == "json"


def test_detect_cef(sample_cef_log):
    assert FormatDetector.detect(sample_cef_log) == "cef"
    simple_cef = "CEF:0|Vendor|Product|1.0|100|Event|5|src=1.1.1.1"
    assert FormatDetector.detect(simple_cef) == "cef"


def test_detect_syslog_rfc5424(sample_syslog_rfc5424):
    assert FormatDetector.detect(sample_syslog_rfc5424) == "syslog"


def test_detect_syslog_rfc3164(sample_syslog_rfc3164):
    assert FormatDetector.detect(sample_syslog_rfc3164) == "syslog"


def test_detect_unknown():
    assert FormatDetector.detect("") == "unknown"
    assert FormatDetector.detect("   ") == "unknown"
    assert FormatDetector.detect("random unstructured text not a log") == "unknown"
    assert FormatDetector.detect("{not valid json") == "unknown"
    assert FormatDetector.detect(None) == "unknown"
