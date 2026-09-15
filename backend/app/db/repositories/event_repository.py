"""Event Repository for Database Persistence and Querying."""
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ...models.event import EventModel
from ...schemas.event import ProcessingResult


class EventRepository:
    """Decoupled Data Access Object for processed security events."""

    @staticmethod
    def create_from_processing_result(
        db: Session, result: ProcessingResult
    ) -> Optional[EventModel]:
        """Maps a successful ULPF ProcessingResult into an EventModel and persists it idempotently."""
        if result.status != "success":
            return None

        # Idempotency: skip insertion if event_id already exists (duplicate redelivery)
        existing = db.execute(select(EventModel).where(EventModel.event_id == result.event_id)).scalar_one_or_none()
        if existing:
            return existing

        norm = result.normalized_event

        # Extract normalized attributes cleanly
        src_ip = norm.source.ip if norm and norm.source else None
        dst_ip = norm.destination.ip if norm and norm.destination else None
        src_port = norm.source.port if norm and norm.source else None
        dst_port = norm.destination.port if norm and norm.destination else None
        protocol = norm.network.protocol if norm and norm.network else None
        action = norm.action if norm else None
        severity = norm.severity if norm else None
        ts = norm.timestamp if norm else None

        # Convert Pydantic model to serializable dict for JSONB storage
        normalized_dict = norm.model_dump(mode="json") if norm else None
        additional_dict = norm.additional_fields if norm else None

        event_model = EventModel(
            event_id=result.event_id,
            timestamp=ts,
            detected_format=result.format_detected,
            source_ip=src_ip,
            destination_ip=dst_ip,
            source_port=src_port,
            destination_port=dst_port,
            protocol=protocol,
            action=action,
            severity=severity,
            raw_event=result.raw_event,  # 100% byte-for-byte exact original
            normalized_event=normalized_dict,
            additional_fields=additional_dict,
            sha256_hash=result.raw_event_hash,
        )

        db.add(event_model)
        db.commit()
        db.refresh(event_model)
        return event_model

    @staticmethod
    def create_batch_from_results(
        db: Session, results: List[ProcessingResult]
    ) -> List[EventModel]:
        """Persists a batch of successful ULPF ProcessingResults in a single transaction idempotently."""
        successful_results = [r for r in results if r.status == "success"]
        if not successful_results:
            return []

        # Idempotency: Query already existing event_ids in bulk
        candidate_ids = [r.event_id for r in successful_results]
        existing_ids = set(
            db.scalars(select(EventModel.event_id).where(EventModel.event_id.in_(candidate_ids))).all()
        )

        models: List[EventModel] = []
        for res in successful_results:
            if res.event_id in existing_ids:
                continue

            norm = res.normalized_event
            src_ip = norm.source.ip if norm and norm.source else None
            dst_ip = norm.destination.ip if norm and norm.destination else None
            src_port = norm.source.port if norm and norm.source else None
            dst_port = norm.destination.port if norm and norm.destination else None
            protocol = norm.network.protocol if norm and norm.network else None
            action = norm.action if norm else None
            severity = norm.severity if norm else None
            ts = norm.timestamp if norm else None

            normalized_dict = norm.model_dump(mode="json") if norm else None
            additional_dict = norm.additional_fields if norm else None

            model = EventModel(
                event_id=res.event_id,
                timestamp=ts,
                detected_format=res.format_detected,
                source_ip=src_ip,
                destination_ip=dst_ip,
                source_port=src_port,
                destination_port=dst_port,
                protocol=protocol,
                action=action,
                severity=severity,
                raw_event=res.raw_event,
                normalized_event=normalized_dict,
                additional_fields=additional_dict,
                sha256_hash=res.raw_event_hash,
            )
            models.append(model)

        if models:
            db.add_all(models)
            db.commit()
            for m in models:
                db.refresh(m)

        return models

    @staticmethod
    def get_by_event_id(db: Session, event_id: str) -> Optional[EventModel]:
        """Retrieves a single event by its ULPF event_id UUID."""
        stmt = select(EventModel).where(EventModel.event_id == event_id)
        return db.scalars(stmt).first()

    @staticmethod
    def get_events(
        db: Session,
        limit: int = 50,
        offset: int = 0,
        q: Optional[str] = None,
        event_id: Optional[str] = None,
        detected_format: Optional[str] = None,
        severity: Optional[str] = None,
        action: Optional[str] = None,
        source_ip: Optional[str] = None,
        destination_ip: Optional[str] = None,
        protocol: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> Tuple[List[EventModel], int]:
        """Queries events with pagination, sorting newest-first, and server-side filtering."""
        stmt = select(EventModel)
        count_stmt = select(func.count(EventModel.id))

        # Filter: free-text search (q) across relevant fields
        if q and q.strip():
            term = f"%{q.strip()}%"
            search_clause = or_(
                EventModel.event_id.ilike(term),
                EventModel.source_ip.ilike(term),
                EventModel.destination_ip.ilike(term),
                EventModel.protocol.ilike(term),
                EventModel.action.ilike(term),
                EventModel.detected_format.ilike(term),
                EventModel.severity.ilike(term),
                EventModel.raw_event.ilike(term),
            )
            stmt = stmt.where(search_clause)
            count_stmt = count_stmt.where(search_clause)

        # Filter: event_id
        if event_id:
            stmt = stmt.where(EventModel.event_id == event_id.strip())
            count_stmt = count_stmt.where(EventModel.event_id == event_id.strip())

        # Filter: detected_format
        if detected_format:
            fmt_clean = detected_format.strip().lower()
            stmt = stmt.where(func.lower(EventModel.detected_format) == fmt_clean)
            count_stmt = count_stmt.where(func.lower(EventModel.detected_format) == fmt_clean)

        # Filter: severity
        if severity:
            sev_clean = severity.strip().lower()
            stmt = stmt.where(func.lower(EventModel.severity) == sev_clean)
            count_stmt = count_stmt.where(func.lower(EventModel.severity) == sev_clean)

        # Filter: action
        if action:
            act_clean = action.strip().lower()
            stmt = stmt.where(func.lower(EventModel.action) == act_clean)
            count_stmt = count_stmt.where(func.lower(EventModel.action) == act_clean)

        # Filter: source_ip
        if source_ip:
            stmt = stmt.where(EventModel.source_ip == source_ip.strip())
            count_stmt = count_stmt.where(EventModel.source_ip == source_ip.strip())

        # Filter: destination_ip
        if destination_ip:
            stmt = stmt.where(EventModel.destination_ip == destination_ip.strip())
            count_stmt = count_stmt.where(EventModel.destination_ip == destination_ip.strip())

        # Filter: protocol
        if protocol:
            proto_clean = protocol.strip().lower()
            stmt = stmt.where(func.lower(EventModel.protocol) == proto_clean)
            count_stmt = count_stmt.where(func.lower(EventModel.protocol) == proto_clean)

        # Filter: time range
        if start_time:
            stmt = stmt.where(EventModel.timestamp >= start_time)
            count_stmt = count_stmt.where(EventModel.timestamp >= start_time)

        if end_time:
            stmt = stmt.where(EventModel.timestamp <= end_time)
            count_stmt = count_stmt.where(EventModel.timestamp <= end_time)

        # Total count matching filters
        total = db.scalar(count_stmt) or 0

        # Sort newest-first: order by created_at DESC (and timestamp DESC)
        stmt = stmt.order_by(EventModel.created_at.desc(), EventModel.id.desc())
        stmt = stmt.limit(limit).offset(offset)

        events = list(db.scalars(stmt).all())
        return events, total
