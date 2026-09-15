"""Comprehensive Security Test Suite for Authentication, RBAC, User Management, and Audit Logs."""
import pytest
from datetime import datetime, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    validate_password_strength,
)
from app.auth.service import auth_service
from app.audit.service import audit_service
from app.models.auth import UserModel, RoleModel
from app.models.audit import AuditLogModel
from app.schemas.auth import UserCreateRequest, UserUpdateRequest


# ==========================================
# 1. Cryptographic Password Hashing Tests
# ==========================================

def test_password_hashing_and_verification():
    raw_password = "SuperSecurePassword123!"
    hashed = hash_password(raw_password)

    # Must start with algorithm identifier and 600k rounds
    assert hashed.startswith("pbkdf2:sha256:600000$")
    assert raw_password not in hashed

    # Valid password verification
    assert verify_password(raw_password, hashed) is True

    # Invalid password verification
    assert verify_password("WrongPassword123!", hashed) is False
    assert verify_password("", hashed) is False

    # Salt uniqueness: two hashes of same password must differ
    second_hash = hash_password(raw_password)
    assert hashed != second_hash
    assert verify_password(raw_password, second_hash) is True


def test_password_strength_validation():
    # Min length 8
    is_valid, err = validate_password_strength("short")
    assert is_valid is False
    assert "at least 8 characters" in err

    is_valid, err = validate_password_strength("validpassword123")
    assert is_valid is True
    assert err is None


# ==========================================
# 2. Pure-Python JWT Token Tests (Air-Gapped)
# ==========================================

def test_jwt_encode_decode():
    claims = {"sub": "test-user-id", "username": "analyst_bob", "roles": ["ANALYST"]}
    token = create_access_token(data=claims, expires_delta=timedelta(minutes=15))

    assert isinstance(token, str)
    assert len(token.split(".")) == 3  # header.payload.signature

    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "test-user-id"
    assert payload["username"] == "analyst_bob"
    assert payload["roles"] == ["ANALYST"]
    assert "exp" in payload


def test_jwt_expiration():
    # Create expired token (-1 minute)
    token = create_access_token(
        data={"sub": "expired-user"},
        expires_delta=timedelta(minutes=-1),
    )
    payload = decode_token(token)
    assert payload is None


def test_jwt_signature_tampering():
    token = create_access_token(data={"sub": "original-user"})
    parts = token.split(".")
    # Tamper payload part
    tampered_token = f"{parts[0]}.eyJob2dnZWQiOiAidHJ1ZSJ9.{parts[2]}"
    payload = decode_token(tampered_token)
    assert payload is None


# ==========================================
# 3. Authentication & Login Integration Tests
# ==========================================

def test_login_success(test_client: TestClient, db_session: Session, seed_auth_roles):
    # Create test user
    admin_user, err = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="admin@test.local",
            username="admin_test",
            password="AdminPassword123!",
            full_name="Admin Test",
            roles=["ADMIN"],
        ),
    )
    assert err is None
    assert admin_user is not None

    response = test_client.post(
        "/api/v1/auth/login",
        json={"username": "admin_test", "password": "AdminPassword123!"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["status"] == "success"
    assert "access_token" in data
    assert data["user"]["username"] == "admin_test"
    assert "ADMIN" in data["user"]["roles"]
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]

    # Verify cookie set
    cookies = response.cookies
    assert "logforge_access_token" in cookies

    # Verify audit log LOGIN_SUCCESS was created
    audit = db_session.query(AuditLogModel).filter_by(action="LOGIN_SUCCESS").first()
    assert audit is not None
    assert audit.username == "admin_test"
    assert audit.status == "SUCCESS"


def test_login_invalid_password(test_client: TestClient, db_session: Session, seed_auth_roles):
    user, err = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="user@test.local",
            username="analyst_test",
            password="CorrectPassword123!",
            full_name="Analyst Test",
            roles=["ANALYST"],
        ),
    )
    assert err is None

    response = test_client.post(
        "/api/v1/auth/login",
        json={"username": "analyst_test", "password": "WrongPassword!"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # Verify audit log LOGIN_FAILED was created
    audit = db_session.query(AuditLogModel).filter_by(action="LOGIN_FAILED").first()
    assert audit is not None
    assert audit.username == "analyst_test"
    assert audit.status == "FAILURE"


def test_login_inactive_user(test_client: TestClient, db_session: Session, seed_auth_roles):
    user, err = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="inactive@test.local",
            username="inactive_user",
            password="Password123!",
            full_name="Inactive User",
            roles=["VIEWER"],
        ),
    )
    assert err is None
    # Deactivate
    user.is_active = False
    db_session.commit()

    response = test_client.post(
        "/api/v1/auth/login",
        json={"username": "inactive_user", "password": "Password123!"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "deactivated" in response.json()["detail"].lower()


def test_auth_me_endpoint(test_client: TestClient, db_session: Session, seed_auth_roles):
    user, err = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="me@test.local",
            username="me_user",
            password="Password123!",
            full_name="Me User",
            roles=["VIEWER"],
        ),
    )
    assert err is None

    # 1. Without credentials -> 401
    unauth_res = test_client.get("/api/v1/auth/me")
    assert unauth_res.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Login to get token
    login_res = test_client.post(
        "/api/v1/auth/login",
        json={"username": "me_user", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]

    # 3. With Bearer token -> 200 OK
    auth_res = test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert auth_res.status_code == status.HTTP_200_OK
    data = auth_res.json()
    assert data["username"] == "me_user"
    assert data["email"] == "me@test.local"
    assert "VIEWER" in data["roles"]


# ==========================================
# 4. RBAC Authorization & Permission Enforcement
# ==========================================

def test_rbac_user_management_permission(test_client: TestClient, db_session: Session, seed_auth_roles):
    # Create VIEWER user and ADMIN user
    v_user, err1 = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="viewer@test.local",
            username="viewer_user",
            password="ViewerPassword123!",
            full_name="Viewer User",
            roles=["VIEWER"],
        ),
    )
    assert err1 is None

    a_user, err2 = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="admin@test.local",
            username="admin_rbac",
            password="AdminPassword123!",
            full_name="Admin RBAC",
            roles=["ADMIN"],
        ),
    )
    assert err2 is None

    # Login as VIEWER
    v_login = test_client.post(
        "/api/v1/auth/login",
        json={"username": "viewer_user", "password": "ViewerPassword123!"},
    )
    viewer_token = v_login.json()["access_token"]

    # Login as ADMIN
    a_login = test_client.post(
        "/api/v1/auth/login",
        json={"username": "admin_rbac", "password": "AdminPassword123!"},
    )
    admin_token = a_login.json()["access_token"]

    # VIEWER tries to create a user -> 403 FORBIDDEN
    forbidden_res = test_client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {viewer_token}"},
        json={
            "email": "newbie@test.local",
            "username": "newbie",
            "password": "Password123!",
            "full_name": "Newbie",
            "roles": ["VIEWER"],
        },
    )
    assert forbidden_res.status_code == status.HTTP_403_FORBIDDEN

    # ADMIN creates user -> 201 CREATED
    allowed_res = test_client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "newbie@test.local",
            "username": "newbie",
            "password": "Password123!",
            "full_name": "Newbie",
            "roles": ["VIEWER"],
        },
    )
    assert allowed_res.status_code == status.HTTP_201_CREATED
    assert allowed_res.json()["username"] == "newbie"


def test_rbac_reindex_permission(test_client: TestClient, db_session: Session, seed_auth_roles):
    # VIEWER vs OPERATOR on POST /api/v1/search/reindex
    op_user, err1 = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="operator@test.local",
            username="operator_user",
            password="OpPassword123!",
            full_name="Operator User",
            roles=["OPERATOR"],
        ),
    )
    assert err1 is None

    v2_user, err2 = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="viewer2@test.local",
            username="viewer2_user",
            password="ViewerPassword123!",
            full_name="Viewer 2",
            roles=["VIEWER"],
        ),
    )
    assert err2 is None

    v_token = test_client.post(
        "/api/v1/auth/login",
        json={"username": "viewer2_user", "password": "ViewerPassword123!"},
    ).json()["access_token"]

    # VIEWER cannot trigger reindex -> 403
    v_res = test_client.post(
        "/api/v1/search/reindex",
        headers={"Authorization": f"Bearer {v_token}"},
    )
    assert v_res.status_code == status.HTTP_403_FORBIDDEN


# ==========================================
# 5. Audit Trail Immutability & Secret Masking
# ==========================================

def test_audit_log_masking(db_session: Session):
    # Audit log must mask secrets, tokens, and passwords
    audit_service.record_event(
        db=db_session,
        action="TEST_ACTION",
        resource_type="config",
        username="admin",
        status="SUCCESS",
        details={
            "password": "SecretPassword123!",
            "access_token": "jwt.token.here",
            "api_secret": "sensitive-api-key",
            "normal_field": "visible_value",
        },
    )

    log = db_session.query(AuditLogModel).filter_by(action="TEST_ACTION").first()
    assert log is not None
    assert log.details["password"] == "[REDACTED]"
    assert log.details["access_token"] == "[REDACTED]"
    assert log.details["api_secret"] == "[REDACTED]"
    assert log.details["normal_field"] == "visible_value"


def test_audit_logs_query_api(test_client: TestClient, db_session: Session, seed_auth_roles):
    admin, err = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="auditor@test.local",
            username="auditor",
            password="AuditorPassword123!",
            full_name="Auditor User",
            roles=["ADMIN"],
        ),
    )
    assert err is None

    token = test_client.post(
        "/api/v1/auth/login",
        json={"username": "auditor", "password": "AuditorPassword123!"},
    ).json()["access_token"]

    res = test_client.get(
        "/api/v1/audit",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "total" in data
    assert "events" in data
    assert isinstance(data["events"], list)


def test_rbac_logs_ingestion_permission(test_client: TestClient, db_session: Session, seed_auth_roles):
    raw_sample = '{"timestamp": "2026-09-06T10:15:30Z", "src_ip": "10.0.0.1", "dst_ip": "10.0.0.2", "src_port": 1234, "dst_port": 80, "protocol": "TCP", "action": "ALLOW", "severity": "low"}'

    # 1. Unauthenticated attempt (clean cookies) -> 401 UNAUTHORIZED
    test_client.cookies.clear()
    unauth_res = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": raw_sample},
    )
    assert unauth_res.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Create VIEWER user and OPERATOR user
    viewer_user, err1 = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="viewer_ingest@test.local",
            username="viewer_ingest",
            password="ViewerPassword123!",
            full_name="Viewer Ingest Tester",
            roles=["VIEWER"],
        ),
    )
    assert err1 is None

    operator_user, err2 = auth_service.create_user(
        db=db_session,
        req=UserCreateRequest(
            email="op_ingest@test.local",
            username="op_ingest",
            password="OpPassword123!",
            full_name="Operator Ingest Tester",
            roles=["OPERATOR"],
        ),
    )
    assert err2 is None

    # 3. Login as VIEWER and obtain JWT token
    test_client.cookies.clear()
    v_token = test_client.post(
        "/api/v1/auth/login",
        json={"username": "viewer_ingest", "password": "ViewerPassword123!"},
    ).json()["access_token"]
    test_client.cookies.clear()

    # 4. VIEWER attempts single process -> 403 FORBIDDEN
    v_process_res = test_client.post(
        "/api/v1/logs/process",
        headers={"Authorization": f"Bearer {v_token}"},
        json={"raw_log": raw_sample},
    )
    assert v_process_res.status_code == status.HTTP_403_FORBIDDEN
    assert "logs:ingest" in v_process_res.json()["detail"]

    # 5. VIEWER attempts batch process -> 403 FORBIDDEN
    v_batch_res = test_client.post(
        "/api/v1/logs/batch",
        headers={"Authorization": f"Bearer {v_token}"},
        json={"raw_logs": [raw_sample]},
    )
    assert v_batch_res.status_code == status.HTTP_403_FORBIDDEN

    # 6. VIEWER attempts streaming ingest -> 403 FORBIDDEN
    v_stream_res = test_client.post(
        "/api/v1/logs/ingest",
        headers={"Authorization": f"Bearer {v_token}"},
        json={"raw_log": raw_sample},
    )
    assert v_stream_res.status_code == status.HTTP_403_FORBIDDEN

    # 7. Verify security audit trail recorded the PERMISSION_DENIED event
    denial_audit = db_session.query(AuditLogModel).filter_by(
        action="PERMISSION_DENIED",
        username="viewer_ingest",
        resource_id="logs:ingest",
    ).first()
    assert denial_audit is not None
    assert denial_audit.status == "DENIED"

    # 8. Login as OPERATOR and obtain JWT token
    test_client.cookies.clear()
    op_token = test_client.post(
        "/api/v1/auth/login",
        json={"username": "op_ingest", "password": "OpPassword123!"},
    ).json()["access_token"]
    test_client.cookies.clear()

    # 9. OPERATOR attempts single process -> 200 OK
    op_process_res = test_client.post(
        "/api/v1/logs/process",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"raw_log": raw_sample},
    )
    assert op_process_res.status_code == status.HTTP_200_OK
    assert op_process_res.json()["status"] == "success"

    # 10. OPERATOR attempts batch process -> 200 OK
    op_batch_res = test_client.post(
        "/api/v1/logs/batch",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"raw_logs": [raw_sample]},
    )
    assert op_batch_res.status_code == status.HTTP_200_OK
    assert op_batch_res.json()["successful"] == 1

