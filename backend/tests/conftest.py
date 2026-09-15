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
import app.models.anomaly
import app.models.integrity
import app.models.auth
import app.models.audit


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
def seed_auth_roles(db_session: Session):
    """Seeds permissions and 4 RBAC roles in SQLite test database."""
    import uuid
    from app.models.auth import PermissionModel, RoleModel

    permissions_meta = [
        ("logs:read", "View raw and normalized security logs"),
        ("logs:ingest", "Submit and stream raw logs into ingestion pipeline"),
        ("logs:search", "Search and query logs via MySQL / OpenSearch"),
        ("analytics:read", "View security analytics and distribution dashboards"),
        ("anomalies:read", "View AI/ML anomaly detection results and scores"),
        ("integrity:read", "Inspect cryptographic SHA-256 hash chains and batch Merkle trees"),
        ("integrity:verify", "Trigger on-demand cryptographic hash and chain verification"),
        ("blockchain:read", "View blockchain anchoring receipts and transaction proofs"),
        ("blockchain:anchor", "Initiate on-chain cryptographic anchor transactions"),
        ("reports:read", "View system security summaries and analytical reports"),
        ("reports:create", "Generate ad-hoc analytical and compliance reports"),
        ("reports:export", "Export forensic event logs and integrity certificates"),
        ("users:read", "View user accounts and role assignments"),
        ("users:manage", "Create, update, and deactivate user accounts and roles"),
        ("settings:read", "View platform configuration and schema preferences"),
        ("settings:manage", "Modify framework retention, schemas, and system settings"),
        ("audit:read", "Inspect immutable security audit log trail"),
        ("system:health", "Monitor subsystem health, socket listeners, and Kafka brokers"),
        ("search:reindex", "Execute administrative reindexing into OpenSearch"),
    ]

    perm_map = {}
    for p_name, p_desc in permissions_meta:
        perm = PermissionModel(id=str(uuid.uuid4()), name=p_name, description=p_desc)
        db_session.add(perm)
        perm_map[p_name] = perm
    db_session.flush()

    roles_definition = {
        "ADMIN": list(perm_map.values()),
        "ANALYST": [perm_map[p] for p in [
            "logs:read", "logs:search", "analytics:read", "anomalies:read",
            "integrity:read", "integrity:verify", "blockchain:read", "reports:read",
            "reports:create", "reports:export", "settings:read", "system:health", "audit:read",
        ]],
        "OPERATOR": [perm_map[p] for p in [
            "logs:read", "logs:ingest", "logs:search", "analytics:read",
            "integrity:read", "reports:read", "settings:read", "settings:manage",
            "system:health", "search:reindex",
        ]],
        "VIEWER": [perm_map[p] for p in [
            "logs:read", "logs:search", "analytics:read", "reports:read", "settings:read",
        ]],
    }

    role_objs = {}
    for r_name, p_objs in roles_definition.items():
        role = RoleModel(id=str(uuid.uuid4()), name=r_name, description=f"{r_name} role")
        role.permissions = p_objs
        db_session.add(role)
        role_objs[r_name] = role

    db_session.commit()
    return role_objs


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provides an isolated database session for repository & integration tests."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_client(request, db_session: Session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient with database dependency override to test in-memory DB."""
    def override_get_database():
        yield db_session

    fastapi_app.dependency_overrides[get_database] = override_get_database

    # If the test is NOT testing auth/RBAC specifically, inject an authenticated Operator mock user
    # so standard ingestion, parser, and ML pipeline unit tests continue passing seamlessly.
    if "test_auth_rbac_audit" not in request.node.nodeid:
        from app.api.dependencies import get_current_user
        from app.models.auth import UserModel, RoleModel, PermissionModel

        mock_user = UserModel(
            id="test-mock-operator-id",
            username="test_operator",
            email="operator@test.local",
            full_name="Test Operator",
            is_active=True,
        )
        all_perms = [
            "logs:read", "logs:ingest", "logs:search", "analytics:read",
            "anomalies:read", "integrity:read", "integrity:verify",
            "blockchain:read", "blockchain:anchor", "reports:read",
            "reports:create", "reports:export", "settings:read",
            "system:health", "audit:read", "search:reindex", "users:read", "users:manage",
        ]
        mock_role = RoleModel(id="r-mock", name="ADMIN", description="Admin")
        mock_role.permissions = [PermissionModel(id=p, name=p, description=p) for p in all_perms]
        mock_user.roles = [mock_role]

        def override_get_current_user():
            return mock_user

        fastapi_app.dependency_overrides[get_current_user] = override_get_current_user

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
