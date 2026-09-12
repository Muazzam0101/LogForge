"""Database repository for AI/ML event anomalies."""
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from ...ml.anomaly_model import model_instance
from ...models.anomaly import EventAnomalyModel
from ...models.event import EventModel
from ...schemas.anomaly import (
    AnomalousSource,
    AnomalyListItem,
    AnomalySummaryResponse,
)


class AnomalyRepository:
    """Repository handling database queries for AI/ML event anomalies."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_event_id(self, event_id: str) -> Optional[EventAnomalyModel]:
        """Retrieves anomaly record for a specific event_id."""
        stmt = select(EventAnomalyModel).where(EventAnomalyModel.event_id == event_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_paginated_anomalies(
        self,
        page: int = 1,
        page_size: int = 50,
        classification: Optional[str] = None,
        min_score: Optional[float] = None,
    ) -> Tuple[List[AnomalyListItem], int]:
        """
        Returns paginated anomalies joined with event metadata for security context.
        """
        offset = (page - 1) * page_size

        # Base query joining EventAnomalyModel with EventModel
        base_query = (
            select(
                EventAnomalyModel.id,
                EventAnomalyModel.event_id,
                EventAnomalyModel.anomaly_score,
                EventAnomalyModel.classification,
                EventAnomalyModel.explanation,
                EventAnomalyModel.created_at,
                EventModel.source_ip,
                EventModel.destination_ip,
                EventModel.destination_port,
                EventModel.protocol,
                EventModel.action,
                EventModel.severity,
            )
            .outerjoin(EventModel, EventAnomalyModel.event_id == EventModel.event_id)
        )

        count_query = select(func.count(EventAnomalyModel.id))

        if classification:
            base_query = base_query.where(EventAnomalyModel.classification == classification)
            count_query = count_query.where(EventAnomalyModel.classification == classification)

        if min_score is not None:
            base_query = base_query.where(EventAnomalyModel.anomaly_score >= min_score)
            count_query = count_query.where(EventAnomalyModel.anomaly_score >= min_score)

        total = self.db.execute(count_query).scalar_one() or 0

        rows = (
            self.db.execute(
                base_query.order_by(desc(EventAnomalyModel.anomaly_score), desc(EventAnomalyModel.created_at))
                .offset(offset)
                .limit(page_size)
            )
            .all()
        )

        items = [
            AnomalyListItem(
                id=r[0],
                event_id=r[1],
                anomaly_score=r[2],
                classification=r[3],
                explanation=r[4],
                created_at=r[5],
                source_ip=r[6],
                destination_ip=r[7],
                destination_port=r[8],
                protocol=r[9],
                action=r[10],
                severity=r[11],
            )
            for r in rows
        ]

        return items, total

    def get_summary(self) -> AnomalySummaryResponse:
        """Computes aggregate metrics and top anomalous sources for dashboard display."""
        # 1. Total and average score
        total_stmt = select(
            func.count(EventAnomalyModel.id),
            func.coalesce(func.avg(EventAnomalyModel.anomaly_score), 0.0),
        )
        total_count, avg_score = self.db.execute(total_stmt).one()

        # 2. Classification breakdown
        class_stmt = (
            select(
                EventAnomalyModel.classification,
                func.count(EventAnomalyModel.id),
            )
            .group_by(EventAnomalyModel.classification)
        )
        class_counts = dict(self.db.execute(class_stmt).all())

        normal_count = class_counts.get("Normal", 0)
        suspicious_count = class_counts.get("Suspicious", 0)
        highly_anomalous_count = class_counts.get("Highly Anomalous", 0)

        # 3. Top anomalous sources (joining EventModel where score >= 0.40 and source_ip is not null)
        top_sources_stmt = (
            select(
                EventModel.source_ip,
                func.count(EventAnomalyModel.id).label("cnt"),
                func.avg(EventAnomalyModel.anomaly_score).label("avg_sc"),
                func.max(EventAnomalyModel.anomaly_score).label("max_sc"),
            )
            .join(EventModel, EventAnomalyModel.event_id == EventModel.event_id)
            .where(
                EventAnomalyModel.anomaly_score >= 0.40,
                EventModel.source_ip.isnot(None),
                EventModel.source_ip != "",
            )
            .group_by(EventModel.source_ip)
            .order_by(desc("cnt"), desc("max_sc"))
            .limit(5)
        )
        top_sources_rows = self.db.execute(top_sources_stmt).all()

        top_sources = [
            AnomalousSource(
                source_ip=row[0],
                count=row[1],
                avg_score=round(float(row[2]), 3),
                max_score=round(float(row[3]), 3),
            )
            for row in top_sources_rows
        ]

        meta = model_instance.training_metadata or {}

        return AnomalySummaryResponse(
            total_scored_events=total_count,
            normal_count=normal_count,
            suspicious_count=suspicious_count,
            highly_anomalous_count=highly_anomalous_count,
            average_anomaly_score=round(float(avg_score), 3),
            model_name=model_instance.model_name,
            model_version=model_instance.model_version,
            is_trained=model_instance.is_trained,
            last_trained_at=meta.get("trained_at"),
            top_anomalous_sources=top_sources,
        )
