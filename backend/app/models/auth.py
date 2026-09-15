"""Authentication and Role-Based Access Control (RBAC) Database Models."""
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.base import Base


# Association Table: Users <-> Roles
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

# Association Table: Roles <-> Permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class PermissionModel(Base):
    """Granular action permission definition."""

    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False, doc="Unique permission identifier (e.g. logs:read)"
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, doc="Human-readable description of permission scope"
    )

    roles: Mapped[List["RoleModel"]] = relationship(
        "RoleModel", secondary=role_permissions, back_populates="permissions"
    )


class RoleModel(Base):
    """RBAC Role aggregating permissions."""

    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False, doc="Role name: ADMIN, ANALYST, OPERATOR, VIEWER"
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, doc="Functional description of role responsibilities"
    )

    permissions: Mapped[List[PermissionModel]] = relationship(
        "PermissionModel", secondary=role_permissions, back_populates="roles", lazy="selectin"
    )
    users: Mapped[List["UserModel"]] = relationship(
        "UserModel", secondary=user_roles, back_populates="roles"
    )


class UserModel(Base):
    """Application user record with authentication credentials and assigned roles."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False, doc="User primary email address"
    )
    username: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False, doc="Unique login username"
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False, doc="Cryptographic password hash with salt (never plaintext)"
    )
    full_name: Mapped[str] = mapped_column(
        String(128), nullable=False, doc="User display name"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, index=True, nullable=False, doc="Active status flag"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp of last successful authentication"
    )

    roles: Mapped[List[RoleModel]] = relationship(
        "RoleModel", secondary=user_roles, back_populates="users", lazy="selectin"
    )

    @property
    def permission_names(self) -> List[str]:
        """Flattens all distinct permission names granted to the user across assigned roles."""
        perms = set()
        for role in self.roles:
            for perm in role.permissions:
                perms.add(perm.name)
        return sorted(list(perms))

    @property
    def role_names(self) -> List[str]:
        """Returns list of assigned role names."""
        return [r.name for r in self.roles]
