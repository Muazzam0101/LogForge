import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.processing_service import ULPFEngine


@pytest.fixture
def test_client():
    """FastAPI TestClient fixture."""
    return TestClient(app)


@pytest.fixture
def engine():
    """Fresh ULPFEngine instance."""
    return ULPFEngine()


@pytest.fixture
def sample_json_log() -> str:
    return (
        '{"timestamp": "2026-09-06T10:15:30Z", "src_ip": "10.0.0.15", "dst_ip": "192.168.1.1", '
        '"src_port": 51234, "dst_port": 443, "protocol": "TCP", "action": "ALLOW", '
        '"severity": "informational", "custom_threat_score": 88, "organization": "NTRO"}'
    )


@pytest.fixture
def sample_cef_log() -> str:
    return (
        "CEF:0|CheckPoint|VPN-1 & FireWall-1|CheckPoint|drop|Drop packet|High|"
        "src=198.51.100.25 dst=203.0.113.50 spt=49152 dpt=22 proto=tcp act=drop "
        "suser=admin duser=root cn1=984321 cs1=Policy_Enforce_Rule_10"
    )


@pytest.fixture
def sample_syslog_rfc5424() -> str:
    return (
        "<165>1 2026-09-06T10:14:00.000Z border-gw.ntro.in cisco-asa 12345 ID47 "
        "- %ASA-4-106023: Deny tcp src 10.10.10.5:4432 dst 172.16.0.2:80 by access-group 'OUTSIDE_IN'"
    )


@pytest.fixture
def sample_syslog_rfc3164() -> str:
    return (
        "<34>Sep  6 10:20:15 secure-server sshd[4912]: "
        "Failed password for invalid user hacker from 185.220.101.5 port 55432 ssh2"
    )
