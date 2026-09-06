import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app as fastapi_app
from app.api.dependencies import get_database
from app.db.base import Base
from app.services.processing_service import ULPFEngine
import app.models.event  # Register models with Base.metadata

# In-memory SQLite engine for rapid, isolated, zero-external-dependency automated testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest.fixture(autouse=True)
def init_test_db():
    """Creates all database tables before each test and drops them afterwards."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provides an isolated database session for repository & integration tests."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_client(db_session: Session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient with database dependency override to test in-memory DB."""
    def override_get_database():
        yield db_session

    fastapi_app.dependency_overrides[get_database] = override_get_database
    with TestClient(fastapi_app) as client:
        yield client
    fastapi_app.dependency_overrides.clear()


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
