import json
import pytest
from app.parsers.json_parser import JSONParser


def test_json_parser_can_parse(sample_json_log):
    parser = JSONParser()
    assert parser.can_parse(sample_json_log) is True
    assert parser.can_parse("invalid string") is False
    assert parser.can_parse('{"valid": "json"}') is True


def test_json_parser_extracts_fields(sample_json_log):
    parser = JSONParser()
    extracted = parser.parse(sample_json_log)

    assert extracted["src_ip"] == "10.0.0.15"
    assert extracted["dst_ip"] == "192.168.1.1"
    assert extracted["src_port"] == 51234
    assert extracted["dst_port"] == 443
    assert extracted["protocol"] == "TCP"
    assert extracted["action"] == "ALLOW"
    # Preserves custom vendor fields
    assert extracted["custom_threat_score"] == 88
    assert extracted["organization"] == "NTRO"


def test_json_parser_nested_objects():
    parser = JSONParser()
    nested_log = '{"event": {"type": "auth", "outcome": "success"}, "user": {"name": "alice"}}'
    extracted = parser.parse(nested_log)

    assert extracted["event.type"] == "auth"
    assert extracted["event.outcome"] == "success"
    assert extracted["user.name"] == "alice"
    assert extracted["event"]["type"] == "auth"


def test_json_parser_unpacks_stringified_json_in_raw_log():
    parser = JSONParser()
    wrapped_log = json.dumps({
        "raw_log": json.dumps({
            "timestamp": "2026-09-06T10:15:30Z",
            "src_ip": "10.0.0.15",
            "dst_ip": "192.168.1.1",
            "src_port": 51234,
            "dst_port": 443,
            "protocol": "TCP",
            "action": "ALLOW",
            "severity": "high",
            "organization": "NTRO",
        })
    })

    extracted = parser.parse(wrapped_log)
    assert extracted["src_ip"] == "10.0.0.15"
    assert extracted["dst_ip"] == "192.168.1.1"
    assert extracted["src_port"] == 51234
    assert extracted["dst_port"] == 443
    assert extracted["protocol"] == "TCP"
    assert extracted["action"] == "ALLOW"
    assert extracted["severity"] == "high"
    assert extracted["organization"] == "NTRO"
    assert "raw_log" in extracted  # Lossless retention


def test_json_parser_unpacks_cef_in_envelope():
    parser = JSONParser()
    wrapped_cef = json.dumps({
        "raw_log": "CEF:0|CheckPoint|VPN-1 & FireWall-1|CheckPoint|drop|Drop packet|High|src=198.51.100.25 dst=203.0.113.50 spt=49152 dpt=22 proto=tcp act=drop"
    })

    extracted = parser.parse(wrapped_cef)
    assert extracted["src"] == "198.51.100.25"
    assert extracted["dst"] == "203.0.113.50"
    assert extracted["spt"] == "49152"
    assert extracted["dpt"] == "22"
    assert extracted["act"] == "drop"


def test_json_parser_unpacks_syslog_in_envelope():
    parser = JSONParser()
    wrapped_syslog = json.dumps({
        "message": "<165>1 2026-09-06T10:14:00.000Z border-gw.ntro.in cisco-asa 12345 ID47 - %ASA-4-106023: Deny tcp src 10.10.10.5:4432 dst 172.16.0.2:80 by access-group OUTSIDE_IN"
    })

    extracted = parser.parse(wrapped_syslog)
    assert extracted["hostname"] == "border-gw.ntro.in"
    assert extracted["priority"] == 165
    assert extracted["severity_code"] == 5


def test_json_parser_invalid_raises():
    parser = JSONParser()
    with pytest.raises(ValueError):
        parser.parse("not json")
