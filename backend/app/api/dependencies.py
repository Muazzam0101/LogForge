"""FastAPI Reusable Dependency Providers.

Provides dependency injection for database sessions, processing engines,
JWT user authentication, and granular Role-Based Access Control (RBAC) permission enforcement.
"""
from typing import Callable, Generator, Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit.service import audit_service
from ..auth.security import decode_token
from ..core.config import settings
from ..db.session import get_db
from ..models.auth import UserModel
from ..services.processing_service import ULPFEngine, ulpf_engine


def get_ulpf_engine() -> ULPFEngine:
    """Dependency provider for ULPF processing engine."""
    return ulpf_engine


def get_database() -> Generator[Session, None, None]:
    """Dependency provider for database session."""
    yield from get_db()


def _extract_token(request: Request) -> Optional[str]:
    """Extracts JWT token from Authorization header or HTTP-only session cookie."""
    # 1. Check Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    # 2. Check HTTP-only cookie
    cookie_token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if cookie_token:
        return cookie_token.strip()

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_database),
) -> UserModel:
    """Validates JWT access token and retrieves active authenticated user."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid bearer token or session cookie.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or malformed authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims: missing subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.scalar(select(UserModel).where(UserModel.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact an administrator.",
        )

    return user


def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_database),
) -> Optional[UserModel]:
    """Optional authentication resolver. Returns None if unauthenticated."""
    try:
        return get_current_user(request=request, db=db)
    except HTTPException:
        return None


def require_permission(permission_name: str) -> Callable[[UserModel, Session, Request], UserModel]:
    """Dependency factory enforcing granular RBAC permission for protected endpoints."""

    def permission_checker(
        user: UserModel = Depends(get_current_user),
        db: Session = Depends(get_database),
        request: Request = None,
    ) -> UserModel:
        if permission_name not in user.permission_names:
            client_ip = request.client.host if request and request.client else None
            user_agent = request.headers.get("user-agent") if request else None

            # Record security denial event in audit trail
            audit_service.record_event(
                db=db,
                action="PERMISSION_DENIED",
                resource_type="permission",
                resource_id=permission_name,
                user_id=user.id,
                username=user.username,
                ip_address=client_ip,
                user_agent=user_agent,
                status="DENIED",
                details={
                    "required_permission": permission_name,
                    "user_roles": user.role_names,
                    "path": request.url.path if request else None,
                },
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: current role lacks required permission '{permission_name}'",
            )
        return user

    return permission_checker


def require_role(role_name: str) -> Callable[[UserModel, Session, Request], UserModel]:
    """Dependency factory enforcing strict role membership (e.g. ADMIN)."""

    def role_checker(
        user: UserModel = Depends(get_current_user),
        db: Session = Depends(get_database),
        request: Request = None,
    ) -> UserModel:
        if role_name.upper() not in [r.upper() for r in user.role_names]:
            client_ip = request.client.host if request and request.client else None
            user_agent = request.headers.get("user-agent") if request else None

            audit_service.record_event(
                db=db,
                action="ROLE_DENIED",
                resource_type="role",
                resource_id=role_name,
                user_id=user.id,
                username=user.username,
                ip_address=client_ip,
                user_agent=user_agent,
                status="DENIED",
                details={"required_role": role_name, "user_roles": user.role_names},
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: endpoint restricted to '{role_name}' role",
            )
        return user

    return role_checker
