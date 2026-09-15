"""Pydantic Schemas for Authentication, RBAC, User Management, and Audit Logs."""
from datetime import datetime
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")



class LoginRequest(BaseModel):
    """Credentials payload for authenticating a user."""
    model_config = ConfigDict(extra="forbid")

    username: str = Field(..., min_length=3, max_length=255, description="Username or email address")
    password: str = Field(..., min_length=1, max_length=128, description="User password")


class TokenResponse(BaseModel):
    """Authentication token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class PermissionResponse(BaseModel):
    """Permission detail."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None


class RoleResponse(BaseModel):
    """Role detail with list of granted permission names."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)


class UserResponse(BaseModel):
    """User profile data returned to client (strictly never exposes password or hash)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    username: str
    full_name: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    roles: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)


class LoginResponse(BaseModel):
    """Successful authentication response."""
    status: str = "success"
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserCreateRequest(BaseModel):
    """Admin payload to create a new user."""
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., min_length=5, max_length=255)
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=128)
    roles: List[str] = Field(default=["VIEWER"], description="List of role names: ADMIN, ANALYST, OPERATOR, VIEWER")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned):
            raise ValueError("Invalid email format")
        return cleaned


class UserUpdateRequest(BaseModel):
    """Admin payload to modify user attributes or change assigned roles."""
    model_config = ConfigDict(extra="forbid")

    email: Optional[str] = Field(None, min_length=5, max_length=255)
    full_name: Optional[str] = Field(None, min_length=2, max_length=128)
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    roles: Optional[List[str]] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip().lower()
            if not EMAIL_REGEX.match(cleaned):
                raise ValueError("Invalid email format")
            return cleaned
        return v



class AuditLogResponse(BaseModel):
    """Immutable audit trail event item."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
    user_id: Optional[str] = None
    username: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str
    details: Optional[Dict[str, Any]] = None


class AuditLogListResponse(BaseModel):
    """Paginated list of security audit events."""
    total: int
    limit: int
    offset: int
    page: int
    events: List[AuditLogResponse]
