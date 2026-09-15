"""Authentication, User Management, and RBAC Business Logic Service."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from ..audit.service import audit_service
from ..core.logging import logger
from ..models.auth import PermissionModel, RoleModel, UserModel
from ..schemas.auth import UserCreateRequest, UserUpdateRequest
from .security import hash_password, validate_password_strength, verify_password


class AuthService:
    """Core security service handling user identity, credential verification, and RBAC."""

    @staticmethod
    def authenticate_user(
        db: Session,
        username_or_email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[Optional[UserModel], Optional[str]]:
        """Authenticates user credentials, enforces active state, and logs security audit trail."""
        cleaned_id = username_or_email.strip().lower()
        stmt = select(UserModel).where(
            or_(
                func.lower(UserModel.username) == cleaned_id,
                func.lower(UserModel.email) == cleaned_id,
            )
        )
        user = db.scalar(stmt)

        if not user:
            audit_service.record_event(
                db=db,
                action="LOGIN_FAILED",
                resource_type="session",
                resource_id=None,
                ip_address=ip_address,
                user_agent=user_agent,
                status="FAILURE",
                details={"reason": "User does not exist", "attempted_identifier": cleaned_id},
            )
            return None, "Invalid username or password"

        if not user.is_active:
            audit_service.record_event(
                db=db,
                action="LOGIN_FAILED",
                resource_type="session",
                user_id=user.id,
                username=user.username,
                resource_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                status="DENIED",
                details={"reason": "Account deactivated by administrator"},
            )
            return None, "Account has been deactivated. Please contact an administrator."

        if not verify_password(password, user.password_hash):
            audit_service.record_event(
                db=db,
                action="LOGIN_FAILED",
                resource_type="session",
                user_id=user.id,
                username=user.username,
                resource_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                status="FAILURE",
                details={"reason": "Invalid password supplied"},
            )
            return None, "Invalid username or password"

        # Successful login
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()

        audit_service.record_event(
            db=db,
            action="LOGIN_SUCCESS",
            resource_type="session",
            user_id=user.id,
            username=user.username,
            resource_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            status="SUCCESS",
            details={"roles": user.role_names},
        )

        return user, None

    @staticmethod
    def create_user(
        db: Session,
        req: UserCreateRequest,
        actor: Optional[UserModel] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[Optional[UserModel], Optional[str]]:
        """Creates a new user record, validates password policy, assigns roles, and logs audit."""
        # 1. Password policy check
        ok, err = validate_password_strength(req.password)
        if not ok:
            return None, err

        # 2. Uniqueness checks
        existing_username = db.scalar(select(UserModel).where(func.lower(UserModel.username) == req.username.lower()))
        if existing_username:
            return None, f"Username '{req.username}' is already taken"

        existing_email = db.scalar(select(UserModel).where(func.lower(UserModel.email) == req.email.lower()))
        if existing_email:
            return None, f"Email address '{req.email}' is already registered"

        # 3. Role resolution
        roles = []
        if req.roles:
            role_stmt = select(RoleModel).where(RoleModel.name.in_([r.upper() for r in req.roles]))
            roles = list(db.scalars(role_stmt).all())

        if not roles:
            # Fallback to VIEWER role if requested role not found
            viewer_role = db.scalar(select(RoleModel).where(RoleModel.name == "VIEWER"))
            if viewer_role:
                roles = [viewer_role]

        new_user = UserModel(
            id=str(uuid.uuid4()),
            email=req.email.lower().strip(),
            username=req.username.strip(),
            password_hash=hash_password(req.password),
            full_name=req.full_name.strip(),
            is_active=True,
            roles=roles,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        audit_service.record_event(
            db=db,
            action="USER_CREATED",
            resource_type="user",
            user_id=actor.id if actor else None,
            username=actor.username if actor else "bootstrap",
            resource_id=new_user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            status="SUCCESS",
            details={
                "created_username": new_user.username,
                "created_email": new_user.email,
                "roles": [r.name for r in roles],
            },
        )

        return new_user, None

    @staticmethod
    def update_user(
        db: Session,
        user_id: str,
        req: UserUpdateRequest,
        actor: Optional[UserModel] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[Optional[UserModel], Optional[str]]:
        """Updates user profile, activation status, password, or roles."""
        user = db.scalar(select(UserModel).where(UserModel.id == user_id))
        if not user:
            return None, f"User with ID '{user_id}' not found"

        changes = {}

        if req.email and req.email.lower() != user.email:
            existing_email = db.scalar(select(UserModel).where(func.lower(UserModel.email) == req.email.lower()))
            if existing_email and existing_email.id != user.id:
                return None, f"Email address '{req.email}' is already in use by another user"
            changes["email"] = req.email.lower()
            user.email = req.email.lower()

        if req.full_name and req.full_name.strip() != user.full_name:
            changes["full_name"] = req.full_name.strip()
            user.full_name = req.full_name.strip()

        if req.is_active is not None and req.is_active != user.is_active:
            changes["is_active"] = req.is_active
            user.is_active = req.is_active
            if not req.is_active:
                audit_service.record_event(
                    db=db,
                    action="USER_DEACTIVATED",
                    resource_type="user",
                    user_id=actor.id if actor else None,
                    username=actor.username if actor else None,
                    resource_id=user.id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    status="SUCCESS",
                    details={"target_username": user.username},
                )

        if req.password:
            ok, err = validate_password_strength(req.password)
            if not ok:
                return None, err
            user.password_hash = hash_password(req.password)
            changes["password"] = "[UPDATED]"

        if req.roles is not None:
            role_stmt = select(RoleModel).where(RoleModel.name.in_([r.upper() for r in req.roles]))
            matched_roles = list(db.scalars(role_stmt).all())
            if matched_roles:
                old_roles = user.role_names
                user.roles = matched_roles
                new_roles = user.role_names
                changes["roles"] = {"from": old_roles, "to": new_roles}
                audit_service.record_event(
                    db=db,
                    action="ROLE_CHANGED",
                    resource_type="user",
                    user_id=actor.id if actor else None,
                    username=actor.username if actor else None,
                    resource_id=user.id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    status="SUCCESS",
                    details={"target_username": user.username, "roles_change": changes["roles"]},
                )

        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)

        if changes:
            audit_service.record_event(
                db=db,
                action="USER_UPDATED",
                resource_type="user",
                user_id=actor.id if actor else None,
                username=actor.username if actor else None,
                resource_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                status="SUCCESS",
                details={"target_username": user.username, "modifications": changes},
            )

        return user, None

    @staticmethod
    def list_users(db: Session, limit: int = 50, offset: int = 0) -> Tuple[List[UserModel], int]:
        """Returns paginated list of registered users and total count."""
        total = db.scalar(select(func.count(UserModel.id))) or 0
        stmt = select(UserModel).order_by(desc(UserModel.created_at)).offset(offset).limit(limit)
        users = list(db.scalars(stmt).all())
        return users, total

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[UserModel]:
        """Fetches a single user record by UUID."""
        return db.scalar(select(UserModel).where(UserModel.id == user_id))

    @staticmethod
    def list_roles(db: Session) -> List[RoleModel]:
        """Retrieves all defined RBAC roles and granted permissions."""
        stmt = select(RoleModel).order_by(RoleModel.name)
        return list(db.scalars(stmt).all())


auth_service = AuthService()
