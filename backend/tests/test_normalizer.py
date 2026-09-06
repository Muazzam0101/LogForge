from app.normalization.normalizer import EventNormalizer


def test_normalizer_ip_and_port_mapping():
    extracted = {
        "src_ip": "10.0.0.99",
        "source_port": "8080",
        "destinationAddress": "172.16.1.1",
        "dst_port": "443",
        "protocol": "TCP",
    }
    normalized = EventNormalizer.normalize(
        extracted, parser_name="json_parser", format_detected="json"
    )

    assert normalized.source is not None
    assert normalized.source.ip == "10.0.0.99"
    assert normalized.source.port == 8080

    assert normalized.destination is not None
    assert normalized.destination.ip == "172.16.1.1"
    assert normalized.destination.port == 443

    assert normalized.network is not None
    assert normalized.network.protocol == "tcp"


def test_normalizer_action_canonicalization():
    for act in ["ALLOW", "Permit", "accept", "pass"]:
        norm = EventNormalizer.normalize(
            {"action": act}, parser_name="test", format_detected="test"
        )
        assert norm.action == "allow"

    for act in ["BLOCK", "Deny", "drop", "rejected"]:
        norm = EventNormalizer.normalize(
            {"action": act}, parser_name="test", format_detected="test"
        )
        assert norm.action == "block"


def test_normalizer_severity_mapping():
    # Numeric severity
    norm1 = EventNormalizer.normalize(
        {"severity": "10"}, parser_name="test", format_detected="test"
    )
    assert norm1.severity == "critical"
    assert norm1.severity_code == 10

    # String severity
    norm2 = EventNormalizer.normalize(
        {"severity": "High"}, parser_name="test", format_detected="test"
    )
    assert norm2.severity == "high"

    # Syslog severity code (0 = Emergency)
    norm3 = EventNormalizer.normalize(
        {"severity_code": 0}, parser_name="test", format_detected="test"
    )
    assert norm3.severity == "critical"
    assert norm3.severity_code == 0


def test_normalizer_lossless_preserves_unmapped_fields():
    extracted = {
        "src_ip": "1.1.1.1",
        "action": "allow",
        "CUSTOM_VENDOR_METRIC": "alpha-99",
        "internal_tracking_id": 123456,
        "deep_packet_inspection_flag": True,
    }
    normalized = EventNormalizer.normalize(
        extracted, parser_name="json_parser", format_detected="json"
    )

    # Core fields mapped
    assert normalized.source.ip == "1.1.1.1"
    assert normalized.action == "allow"

    # Unmapped fields preserved in additional_fields
    assert "CUSTOM_VENDOR_METRIC" in normalized.additional_fields
    assert normalized.additional_fields["CUSTOM_VENDOR_METRIC"] == "alpha-99"
    assert normalized.additional_fields["internal_tracking_id"] == 123456
    assert normalized.additional_fields["deep_packet_inspection_flag"] is True
