"""User Management and RBAC Administration API Routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from ...auth.service import auth_service
from ...models.auth import UserModel
from ...schemas.auth import (
    RoleResponse,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
)
from ..dependencies import get_current_user, get_database, require_permission

router = APIRouter(prefix="/users", tags=["User Management & RBAC"])


@router.get(
    "",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List Registered Users (Admin/RBAC Protected)",
    description="Lists all user accounts, active statuses, assigned roles, and permissions.",
)
def list_users(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: UserModel = Depends(require_permission("users:read")),
    db: Session = Depends(get_database),
) -> List[UserResponse]:
    users, _ = auth_service.list_users(db, limit=limit, offset=offset)
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            full_name=u.full_name,
            is_active=u.is_active,
            created_at=u.created_at,
            last_login_at=u.last_login_at,
            roles=u.role_names,
            permissions=u.permission_names,
        )
        for u in users
    ]


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User & Assign RBAC Roles (Admin Protected)",
    description="Registers a new user account with hashed password and role assignment.",
)
def create_user(
    payload: UserCreateRequest,
    request: Request,
    current_user: UserModel = Depends(require_permission("users:manage")),
    db: Session = Depends(get_database),
) -> UserResponse:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user, error = auth_service.create_user(
        db=db,
        req=payload,
        actor=current_user,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to create user",
        )

    return UserResponse(
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


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User Profile, Status, or Roles (Admin Protected)",
    description="Updates user attributes, deactivates accounts, or modifies role assignments.",
)
def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    request: Request,
    current_user: UserModel = Depends(require_permission("users:manage")),
    db: Session = Depends(get_database),
) -> UserResponse:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user, error = auth_service.update_user(
        db=db,
        user_id=user_id,
        req=payload,
        actor=current_user,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to update user",
        )

    return UserResponse(
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


@router.get(
    "/roles/all",
    response_model=List[RoleResponse],
    status_code=status.HTTP_200_OK,
    summary="List Defined RBAC Roles & Granted Permissions",
)
def list_roles(
    current_user: UserModel = Depends(require_permission("users:read")),
    db: Session = Depends(get_database),
) -> List[RoleResponse]:
    roles = auth_service.list_roles(db)
    return [
        RoleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            permissions=[p.name for p in r.permissions],
        )
        for r in roles
    ]
