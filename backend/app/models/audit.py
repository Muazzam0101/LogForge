"""Immutable Application Security Audit Trail Model."""
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from ..db.base import Base

# Dialect-agnostic JSON type
JsonType = JSON().with_variant(JSONB, "postgresql")


class AuditLogModel(Base):
    """Immutable, append-only security audit log recording security-critical events."""

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
        nullable=False,
        doc="Exact time of audit event occurrence",
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), index=True, nullable=True, doc="UUID of user initiating the action"
    )
    username: Mapped[Optional[str]] = mapped_column(
        String(64), index=True, nullable=True, doc="Username snapshot at time of event"
    )
    action: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False, doc="Event action code: LOGIN_SUCCESS, USER_CREATED, etc."
    )
    resource_type: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False, doc="Target resource category: user, event, batch, settings, etc."
    )
    resource_id: Mapped[Optional[str]] = mapped_column(
        String(255), index=True, nullable=True, doc="Specific identifier of modified/accessed resource"
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, doc="Originating client IP address"
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, doc="Client browser/agent signature"
    )
    status: Mapped[str] = mapped_column(
        String(32), index=True, nullable=False, default="SUCCESS", doc="SUCCESS, FAILURE, or DENIED"
    )
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JsonType, nullable=True, doc="Structured diagnostic context (zero passwords/secrets)"
    )

    __table_args__ = (
        Index("idx_audit_logs_action_timestamp", "action", "timestamp"),
        Index("idx_audit_logs_user_timestamp", "user_id", "timestamp"),
        Index("idx_audit_logs_resource", "resource_type", "resource_id"),
    )
