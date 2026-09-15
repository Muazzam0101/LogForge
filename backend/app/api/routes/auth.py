"""Authentication and Session Management API Routes."""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ...audit.service import audit_service
from ...auth.security import create_access_token, create_refresh_token
from ...auth.service import auth_service
from ...core.config import settings
from ...models.auth import UserModel
from ...schemas.auth import LoginRequest, LoginResponse, UserResponse
from ..dependencies import get_current_user, get_database

router = APIRouter(prefix="/auth", tags=["Authentication & Session"])


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login with Credentials & Secure HTTP-only Cookie",
    description="Validates credentials, establishes a secure session via HTTP-only cookie, and logs audit record.",
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_database),
) -> LoginResponse:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user, error = auth_service.authenticate_user(
        db=db,
        username_or_email=payload.username,
        password=payload.password,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Issue JWT tokens
    token_claims = {
        "sub": user.id,
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "roles": user.role_names,
    }
    access_token = create_access_token(token_claims)
    refresh_token = create_refresh_token(token_claims)

    # Secure HTTP-only cookie configuration
    max_age_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400

    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=access_token,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/api/v1/auth",
    )

    user_data = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        roles=user.role_names,
        permissions=user.permission_names,
    )

    return LoginResponse(
        status="success",
        user=user_data,
        access_token=access_token,
        token_type="bearer",
        expires_in=max_age_seconds,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="User Logout & Cookie Invalidation",
    description="Terminates active session, clears HTTP-only security cookies, and appends audit record.",
)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_database),
    current_user: UserModel = Depends(get_current_user),
) -> dict:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # Clear authentication cookies
    response.delete_cookie(key=settings.AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(key=settings.AUTH_REFRESH_COOKIE_NAME, path="/api/v1/auth")

    # Append audit trail
    audit_service.record_event(
        db=db,
        action="LOGOUT",
        resource_type="session",
        user_id=current_user.id,
        username=current_user.username,
        resource_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent,
        status="SUCCESS",
    )

    return {"status": "success", "message": "Successfully logged out"}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Authenticated User Profile & Granted Permissions",
    description="Returns current authenticated user identity, active roles, and granted permission matrix.",
)
def get_me(
    current_user: UserModel = Depends(get_current_user),
) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at,
        roles=current_user.role_names,
        permissions=current_user.permission_names,
    )
