"""Application Security Audit Service.

Guarantees immutable, append-only security audit trail recording of all authentication,
administrative, RBAC, integrity verification, and sensitive system actions.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from ..core.logging import logger
from ..models.audit import AuditLogModel

SENSITIVE_KEYS = {"password", "token", "access_token", "refresh_token", "password_hash", "secret"}


def sanitize_audit_details(details: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Sanitizes context dictionary, stripping passwords, tokens, and sensitive secrets."""
    if not details or not isinstance(details, dict):
        return details

    sanitized = {}
    for k, v in details.items():
        if any(s in k.lower() for s in SENSITIVE_KEYS):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_audit_details(v)
        else:
            sanitized[k] = v
    return sanitized


class AuditService:
    """Enterprise audit trail service with strict append-only constraints."""

    @staticmethod
    def record_event(
        db: Session,
        action: str,
        resource_type: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "SUCCESS",
        details: Optional[Dict[str, Any]] = None,
    ) -> Optional[AuditLogModel]:
        """Appends an immutable security audit event into persistent storage."""
        try:
            cleaned_details = sanitize_audit_details(details)
            audit_entry = AuditLogModel(
                timestamp=datetime.now(timezone.utc),
                user_id=user_id,
                username=username,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                status=status,
                details=cleaned_details,
            )
            db.add(audit_entry)
            db.commit()
            db.refresh(audit_entry)
            return audit_entry
        except Exception as exc:
            db.rollback()
            logger.error("Failed to append security audit event (%s): %s", action, exc)
            return None

    @staticmethod
    def query_logs(
        db: Session,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        status: Optional[str] = None,
        from_time: Optional[datetime] = None,
        to_time: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AuditLogModel], int]:
        """Queries audit log trail with parameterized filters and pagination."""
        stmt = select(AuditLogModel)

        if user_id:
            stmt = stmt.where(AuditLogModel.user_id == user_id)
        if username:
            stmt = stmt.where(AuditLogModel.username == username)
        if action:
            stmt = stmt.where(AuditLogModel.action == action)
        if resource_type:
            stmt = stmt.where(AuditLogModel.resource_type == resource_type)
        if status:
            stmt = stmt.where(AuditLogModel.status == status)
        if from_time:
            stmt = stmt.where(AuditLogModel.timestamp >= from_time)
        if to_time:
            stmt = stmt.where(AuditLogModel.timestamp <= to_time)

        # Count total matches
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = db.scalar(count_stmt) or 0

        # Execute ordered paginated fetch
        stmt = stmt.order_by(desc(AuditLogModel.timestamp)).offset(offset).limit(limit)
        items = list(db.scalars(stmt).all())

        return items, total


audit_service = AuditService()
