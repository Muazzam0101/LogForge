"""LogForge AI/ML Event Anomaly Database Model."""
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import BigInteger, DateTime, Float, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from ..db.base import Base

# Dialect-agnostic JSON type
JsonType = JSON().with_variant(JSONB, "postgresql")


class EventAnomalyModel(Base):
    """AI/ML Anomaly Scoring and Explainability record for an ingested log event."""

    __tablename__ = "event_anomalies"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )

    # Reference to existing ULPF event_id UUID
    event_id: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        index=True,
        nullable=False,
        doc="Reference to original UUIDv4 event_id",
    )

    # Normalized anomaly score in range [0.0, 1.0]
    anomaly_score: Mapped[float] = mapped_column(
        Float,
        index=True,
        nullable=False,
        doc="Normalized anomaly score between 0.0 (normal) and 1.0 (highly anomalous)",
    )

    # Human-readable classification: Normal, Suspicious, Highly Anomalous
    classification: Mapped[str] = mapped_column(
        String(32),
        index=True,
        nullable=False,
        doc="Configured threshold classification label",
    )

    # Plain text explainability justification
    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Human-readable explanation of feature deviations and why event was flagged",
    )

    # Name and version of ML model used
    model_name: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="IsolationForest",
        doc="ML algorithm used for scoring",
    )
    model_version: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="v1.0.0",
        doc="Version of trained model artifact",
    )

    # Optional snapshot of numerical features at scoring time
    features_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JsonType,
        nullable=True,
        doc="Snapshot of feature vector evaluated during scoring",
    )

    # Record timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        doc="Scoring timestamp",
    )

    __table_args__ = (
        Index("ix_anomalies_score_created", "anomaly_score", "created_at"),
        Index("ix_anomalies_classification", "classification"),
    )

    def __repr__(self) -> str:
        return (
            f"<EventAnomalyModel(id={self.id}, event_id='{self.event_id}', "
            f"score={self.anomaly_score:.2f}, classification='{self.classification}')>"
        )
