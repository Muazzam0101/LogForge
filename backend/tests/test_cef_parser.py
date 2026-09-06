import pytest
from app.parsers.cef_parser import CEFParser


def test_cef_parser_can_parse(sample_cef_log):
    parser = CEFParser()
    assert parser.can_parse(sample_cef_log) is True
    assert parser.can_parse("CEF:0|Vendor|Product|1.0|1|Test|Low|") is True
    assert parser.can_parse("Not CEF") is False


def test_cef_parser_header_extraction(sample_cef_log):
    parser = CEFParser()
    extracted = parser.parse(sample_cef_log)

    assert extracted["cef_version"] == "0"
    assert extracted["device_vendor"] == "CheckPoint"
    assert extracted["device_product"] == "VPN-1 & FireWall-1"
    assert extracted["device_event_class_id"] == "drop"
    assert extracted["name"] == "Drop packet"
    assert extracted["severity"] == "High"


def test_cef_parser_extension_extraction(sample_cef_log):
    parser = CEFParser()
    extracted = parser.parse(sample_cef_log)

    assert extracted["src"] == "198.51.100.25"
    assert extracted["dst"] == "203.0.113.50"
    assert extracted["spt"] == "49152"
    assert extracted["dpt"] == "22"
    assert extracted["proto"] == "tcp"
    assert extracted["act"] == "drop"
    assert extracted["suser"] == "admin"
    assert extracted["duser"] == "root"
    assert extracted["cn1"] == "984321"
    assert extracted["cs1"] == "Policy_Enforce_Rule_10"


def test_cef_parser_escaped_characters():
    parser = CEFParser()
    log = "CEF:0|Vendor\\|Inc|Product\\=Pro|1.0|1|Test\\|Message|Medium|msg=hello\\=world\\|pipe"
    extracted = parser.parse(log)

    assert extracted["device_vendor"] == "Vendor|Inc"
    assert extracted["device_product"] == "Product=Pro"
    assert extracted["name"] == "Test|Message"
    assert extracted["msg"] == "hello=world|pipe"


def test_cef_parser_invalid_raises():
    parser = CEFParser()
    with pytest.raises(ValueError):
        parser.parse("CEF:0|too|few|fields|")
