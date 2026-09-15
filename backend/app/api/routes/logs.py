"""Log Ingestion, Normalization, Querying, and Auditing API Endpoints."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.logging import logger
from ...db.repositories.anomaly_repository import AnomalyRepository
from ...db.repositories.event_repository import EventRepository
from ...integrity.service import IntegrityService
from ...ml.scoring import batch_score_events_safely, score_event_safely
from ...schemas.event import ProcessingResult
from ...schemas.explorer import EventDetailResponse, EventListResponse, EventSummaryItem
from ...schemas.ingestion import BatchLogProcessRequest, LogProcessRequest
from ...schemas.response import BatchProcessResponse, ErrorResponse
from ...schemas.streaming import (
    BatchLogIngestItem,
    BatchLogIngestRequest,
    BatchLogIngestResponse,
    LogIngestRequest,
    LogIngestResponse,
)
from ...search.service import search_service
from ...services.processing_service import ULPFEngine
from ...streaming.producer import kafka_producer_service
from ...utils.ids import generate_event_id
from ...models.auth import UserModel
from ..dependencies import get_database, get_ulpf_engine, require_permission

router = APIRouter(prefix="/logs", tags=["Log Ingestion, Normalization & Audit Trail"])


@router.post(
    "/ingest",
    response_model=LogIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Asynchronous Distributed Log Ingestion Gateway",
    description=(
        "Rapidly ingests a single raw log event into the Apache Kafka distributed stream (logforge.raw-events). "
        "Preserves exact raw byte payload without mutation, assigns UUIDv4 tracking identity, "
        "and returns an immediate HTTP 202 Accepted response in ~1-3ms. "
        "Falls back to synchronous ULPF processing if Kafka is disabled."
    ),
)
def ingest_log(
    payload: LogIngestRequest,
    engine: ULPFEngine = Depends(get_ulpf_engine),
    db: Session = Depends(get_database),
    current_user: UserModel = Depends(require_permission("logs:ingest")),
) -> LogIngestResponse:
    event_id = generate_event_id()

    # 1. Distributed Kafka Streaming Mode (Preferred Production Path)
    if settings.KAFKA_ENABLED:
        success, topic, partition = kafka_producer_service.produce_raw_event(
            event_id=event_id,
            raw_log=payload.raw_log,
            source_id=payload.source_id,
            source_hint=payload.source_hint,
        )
        if success:
            return LogIngestResponse(
                status="accepted",
                event_id=event_id,
                topic=topic,
                partition=partition,
                mode="async_kafka",
            )
        logger.warning("Kafka produce failed for event %s; executing synchronous fallback", event_id)

    # 2. Synchronous Fallback Path (Direct ULPF Engine + Database persistence)
    res = engine.process_event(
        raw_log=payload.raw_log,
        source_hint=payload.source_hint,
        event_id=event_id,
    )
    if res.status == "success":
        try:
            EventRepository.create_from_processing_result(db, res)
            IntegrityService.create_integrity_record(db, res.event_id, res.raw_event_hash)
            search_service.index_event_safely(res)
        except Exception as exc:
            logger.warning("Synchronous fallback persistence error for %s: %s", event_id, exc)

    return LogIngestResponse(
        status="accepted",
        event_id=event_id,
        topic=None,
        partition=None,
        mode="sync_fallback",
    )


@router.post(
    "/ingest-batch",
    response_model=BatchLogIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Asynchronous Distributed Batch Log Ingestion Gateway",
    description=(
        "Ingests up to 500 heterogeneous raw logs simultaneously into Apache Kafka partitions. "
        "Returns immediate HTTP 202 Accepted status with tracking event_ids. "
        "Falls back cleanly to synchronous processing if Kafka is disabled."
    ),
)
def ingest_batch(
    payload: BatchLogIngestRequest,
    engine: ULPFEngine = Depends(get_ulpf_engine),
    db: Session = Depends(get_database),
    current_user: UserModel = Depends(require_permission("logs:ingest")),
) -> BatchLogIngestResponse:
    total_received = len(payload.logs)
    event_ids = []
    errors = []

    # 1. Kafka Streaming Mode
    if settings.KAFKA_ENABLED:
        accepted_count = 0
        failed_count = 0

        for idx, item in enumerate(payload.logs):
            raw_text = item.raw_log if isinstance(item, BatchLogIngestItem) else item
            src_id = (item.source_id if isinstance(item, BatchLogIngestItem) else None) or payload.source_id
            src_hint = (item.source_hint if isinstance(item, BatchLogIngestItem) else None) or payload.source_hint

            eid = generate_event_id()
            success, _, _ = kafka_producer_service.produce_raw_event(
                event_id=eid,
                raw_log=raw_text,
                source_id=src_id,
                source_hint=src_hint,
            )
            if success:
                accepted_count += 1
                event_ids.append(eid)
            else:
                failed_count += 1
                errors.append({"index": idx, "error": "Kafka local buffer failed to enqueue event"})

        return BatchLogIngestResponse(
            status="accepted" if accepted_count > 0 else "failed",
            total_received=total_received,
            total_accepted=accepted_count,
            total_failed=failed_count,
            mode="async_kafka",
            event_ids=event_ids,
            errors=errors,
        )

    # 2. Synchronous Fallback Mode
    raw_lines = [item.raw_log if isinstance(item, BatchLogIngestItem) else item for item in payload.logs]
    batch_results = engine.process_batch(raw_logs=raw_lines, source_hint=payload.source_hint)
    try:
        EventRepository.create_batch_from_results(db, batch_results)
        for r in batch_results:
            if r.status == "success":
                IntegrityService.create_integrity_record(db, r.event_id, r.raw_event_hash)
        search_service.index_batch_safely(batch_results)
    except Exception as exc:
        logger.warning("Synchronous batch fallback persistence error: %s", exc)

    success_ids = [r.event_id for r in batch_results if r.status == "success"]
    failed_results = [
        {"index": idx, "error": r.error or "Processing error"}
        for idx, r in enumerate(batch_results)
        if r.status != "success"
    ]

    return BatchLogIngestResponse(
        status="accepted",
        total_received=total_received,
        total_accepted=len(success_ids),
        total_failed=len(failed_results),
        mode="sync_fallback",
        event_ids=success_ids,
        errors=failed_results,
    )





@router.post(
    "/process",
    response_model=ProcessingResult,
    responses={
        status.HTTP_200_OK: {
            "model": ProcessingResult,
            "description": "Log processed, normalized into UES, hashed, and persisted into PostgreSQL.",
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "model": ErrorResponse,
            "description": "Log format unidentifiable, input malformed, or binary stream rejected.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "Persistent database unavailable.",
        },
    },
    summary="Process, Normalize and Persist Single Raw Log",
    description=(
        "**Core Ingestion & Persistence Pipeline:** Ingests raw log string, deterministically detects format, "
        "normalizes into Universal Event Schema (UES), generates SHA-256 digest, losslessly stores exact raw log "
        "and normalized attributes in PostgreSQL, and returns execution result."
    ),
)
def process_log(
    payload: LogProcessRequest,
    engine: ULPFEngine = Depends(get_ulpf_engine),
    db: Session = Depends(get_database),
    current_user: UserModel = Depends(require_permission("logs:ingest")),
) -> ProcessingResult:
    # 1. Deterministic ULPF Processing & Normalization
    result = engine.process_event(
        raw_log=payload.raw_log,
        source_hint=payload.source_hint,
    )

    if result.status == "failed":
        err_code = result.error.get("code") if result.error else "PROCESSING_ERROR"
        err_msg = result.error.get("message") if result.error else "Failed to process log"
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "status": "failed",
                "error": {
                    "code": err_code,
                    "message": err_msg,
                    "details": {
                        "event_id": result.event_id,
                        "format_detected": result.format_detected,
                        "raw_event_hash": result.raw_event_hash,
                    },
                },
            },
        )

    # 2. Persistence into Database
    try:
        EventRepository.create_from_processing_result(db, result)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Failed to persist event %s: %s", result.event_id, exc.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "failed",
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Log event was processed successfully, but database persistence failed due to storage service unavailability.",
                },
            },
        )

    # 2b. Cryptographic Integrity Record Creation
    try:
        IntegrityService.create_integrity_record(db, result.event_id, result.raw_event_hash)
    except Exception as integ_err:
        logger.warning("Integrity record creation skipped for %s: %s", result.event_id, str(integ_err))

    # 2c. Non-blocking OpenSearch Scalability Layer Indexing
    try:
        search_service.index_event_safely(result)
    except Exception as search_err:
        logger.warning("Non-blocking OpenSearch indexing skipped for %s: %s", result.event_id, str(search_err))

    # 3. Non-blocking AI/ML Anomaly Scoring

    try:
        norm = result.normalized_event
        event_dict = {
            "event_id": result.event_id,
            "raw_log": payload.raw_log,
            "source_ip": norm.source_ip if norm else None,
            "destination_ip": norm.destination_ip if norm else None,
            "source_port": norm.source_port if norm else None,
            "destination_port": norm.destination_port if norm else None,
            "protocol": norm.protocol if norm else None,
            "action": norm.action if norm else None,
            "severity": norm.severity if norm else None,
            "timestamp": norm.timestamp if norm else None,
        }
        score_event_safely(event_dict, db)
    except Exception as ml_err:
        logger.warning("Non-blocking AI scoring exception ignored: %s", str(ml_err))

    return result


@router.post(
    "/batch",
    response_model=BatchProcessResponse,
    responses={
        status.HTTP_200_OK: {
            "model": BatchProcessResponse,
            "description": "Batch processing outcome with individual item results.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "Persistent database unavailable.",
        },
    },
    summary="Process, Normalize and Persist Batch of Raw Logs",
    description=(
        "**Batch Ingestion:** Ingests an array of raw logs (up to 500), parses each through ULPF, "
        "persists successful events into PostgreSQL, and reports complete batch outcomes."
    ),
)
def process_batch(
    payload: BatchLogProcessRequest,
    engine: ULPFEngine = Depends(get_ulpf_engine),
    db: Session = Depends(get_database),
    current_user: UserModel = Depends(require_permission("logs:ingest")),
) -> BatchProcessResponse:
    # 1. Process batch through ULPF
    results = engine.process_batch(
        raw_logs=payload.raw_logs,
        source_hint=payload.source_hint,
    )

    successful = sum(1 for r in results if r.status == "success")
    failed = len(results) - successful

    # 2. Persist successful events into PostgreSQL
    if successful > 0:
        try:
            EventRepository.create_batch_from_results(db, results)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("Failed to persist batch events: %s", exc.__class__.__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "failed",
                    "error": {
                        "code": "DATABASE_UNAVAILABLE",
                        "message": "Batch logs were processed, but database persistence failed due to storage service unavailability.",
                    },
                },
            )

        # 2b. Cryptographic Integrity Batch Record Creation
        try:
            for r in results:
                if r.status == "success":
                    IntegrityService.create_integrity_record(db, r.event_id, r.raw_event_hash)
        except Exception as integ_err:
            logger.warning("Batch integrity records creation skipped: %s", str(integ_err))

        # 2c. Non-blocking OpenSearch Scalability Layer Bulk Indexing
        try:
            search_service.index_batch_safely(results)
        except Exception as search_err:
            logger.warning("Non-blocking OpenSearch batch indexing skipped: %s", str(search_err))

        # 3. Non-blocking AI/ML Batch Anomaly Scoring
        try:
            event_dicts = [
                {
                    "event_id": r.event_id,
                    "raw_log": payload.raw_logs[idx] if idx < len(payload.raw_logs) else "",
                    "source_ip": r.normalized_event.source_ip if r.normalized_event else None,
                    "destination_ip": r.normalized_event.destination_ip if r.normalized_event else None,
                    "source_port": r.normalized_event.source_port if r.normalized_event else None,
                    "destination_port": r.normalized_event.destination_port if r.normalized_event else None,
                    "protocol": r.normalized_event.protocol if r.normalized_event else None,
                    "action": r.normalized_event.action if r.normalized_event else None,
                    "severity": r.normalized_event.severity if r.normalized_event else None,
                    "timestamp": r.normalized_event.timestamp if r.normalized_event else None,
                }
                for idx, r in enumerate(results)
                if r.status == "success"
            ]
            batch_score_events_safely(event_dicts, db)
        except Exception as ml_err:
            logger.warning("Non-blocking AI batch scoring exception ignored: %s", str(ml_err))

    if successful == 0 and len(results) > 0:
        batch_status = "failed"
    elif failed == 0:
        batch_status = "success"
    else:
        batch_status = "partial_success"

    return BatchProcessResponse(
        status=batch_status,
        total=len(results),
        successful=successful,
        failed=failed,
        results=results,
    )


@router.get(
    "",
    response_model=EventListResponse,
    responses={
        status.HTTP_200_OK: {
            "model": EventListResponse,
            "description": "Paginated list of stored log events matching filters.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "Database unavailable.",
        },
    },
    summary="List and Search Processed Log Events",
    description=(
        "**Logs Explorer API:** Queries persisted log events from PostgreSQL with pagination, "
        "newest-first ordering, and server-side filtering on severity, format, IP addresses, action, and timestamps."
    ),
)
def list_logs(
    limit: int = Query(default=50, ge=1, le=100, description="Page size limit (1-100)"),
    offset: int = Query(default=0, ge=0, description="Offset record index"),
    q: Optional[str] = Query(default=None, description="Free-text search query across event_id, IPs, protocol, action, format, and raw payload"),
    event_id: Optional[str] = Query(default=None, description="Filter by event UUID"),
    detected_format: Optional[str] = Query(default=None, description="Filter by detected format (json, cef, syslog)"),
    severity: Optional[str] = Query(default=None, description="Filter by severity (critical, high, medium, low)"),
    action: Optional[str] = Query(default=None, description="Filter by action (allow, block, deny, etc.)"),
    source_ip: Optional[str] = Query(default=None, description="Filter by source IP address"),
    destination_ip: Optional[str] = Query(default=None, description="Filter by destination IP address"),
    protocol: Optional[str] = Query(default=None, description="Filter by protocol (tcp, udp, icmp, etc.)"),
    start_time: Optional[datetime] = Query(default=None, description="ISO timestamp start range"),
    end_time: Optional[datetime] = Query(default=None, description="ISO timestamp end range"),
    db: Session = Depends(get_database),
) -> EventListResponse:
    try:
        records, total = EventRepository.get_events(
            db=db,
            limit=limit,
            offset=offset,
            q=q,
            event_id=event_id,
            detected_format=detected_format,
            severity=severity,
            action=action,
            source_ip=source_ip,
            destination_ip=destination_ip,
            protocol=protocol,
            start_time=start_time,
            end_time=end_time,
        )
    except SQLAlchemyError as exc:
        logger.error("Failed to query events from database: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "failed",
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Unable to query logs from the database store.",
                },
            },
        )

    summary_items = [EventSummaryItem.model_validate(r) for r in records]
    return EventListResponse(
        total=total,
        limit=limit,
        offset=offset,
        events=summary_items,
    )


@router.get(
    "/{event_id}",
    response_model=EventDetailResponse,
    responses={
        status.HTTP_200_OK: {
            "model": EventDetailResponse,
            "description": "Complete stored event details including raw event and normalized dictionary.",
        },
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Event ID not found in database store.",
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "model": ErrorResponse,
            "description": "Invalid event ID format.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "Database unavailable.",
        },
    },
    summary="Get Detailed Stored Log Event by Event ID",
    description=(
        "**Event Audit Details:** Fetches the complete stored event matching the given UUID, "
        "allowing inspection of the exact raw event, normalized schema, and cryptographic SHA-256 hash."
    ),
)
def get_log_by_event_id(
    event_id: str,
    db: Session = Depends(get_database),
) -> EventDetailResponse:
    # Validate UUID syntax
    try:
        UUID(event_id)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "status": "failed",
                "error": {
                    "code": "INVALID_UUID",
                    "message": f"'{event_id}' is not a valid UUID format.",
                },
            },
        )

    try:
        record = EventRepository.get_by_event_id(db, event_id)
    except SQLAlchemyError as exc:
        logger.error("Failed to query event %s: %s", event_id, exc.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "failed",
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Unable to query log details from the database store.",
                },
            },
        )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "failed",
                "error": {
                    "code": "EVENT_NOT_FOUND",
                    "message": f"Event with ID '{event_id}' was not found in persistent storage.",
                },
            },
        )

    detail_res = EventDetailResponse.model_validate(record)
    try:
        anomaly = AnomalyRepository(db).get_by_event_id(event_id)
        if anomaly:
            detail_res.anomaly = {
                "event_id": anomaly.event_id,
                "anomaly_score": anomaly.anomaly_score,
                "classification": anomaly.classification,
                "explanation": anomaly.explanation,
                "model_name": anomaly.model_name,
                "model_version": anomaly.model_version,
                "features_snapshot": anomaly.features_snapshot,
                "created_at": anomaly.created_at.isoformat() if anomaly.created_at else None,
            }
    except Exception as exc:
        logger.warning("Could not attach anomaly record for %s: %s", event_id, str(exc))

    return detail_res
