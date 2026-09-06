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


def test_json_parser_invalid_raises():
    parser = JSONParser()
    with pytest.raises(ValueError):
        parser.parse("not json")
