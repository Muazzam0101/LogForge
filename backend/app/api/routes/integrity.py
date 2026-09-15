"""FastAPI Router for LogForge Cryptographic Integrity and Blockchain Anchoring Endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ...api.dependencies import get_database, require_permission
from ...audit.service import audit_service
from ...integrity.schemas import (
    AnchorBatchRequest,
    ChainVerificationResponse,
    CreateBatchRequest,
    EventBlockchainResponse,
    EventIntegrityResponse,
    EventVerificationResponse,
    IntegrityBatchResponse,
    IntegritySummaryResponse,
)
from ...integrity.service import IntegrityService
from ...models.auth import UserModel
from ...models.integrity import IntegrityBatchModel

router = APIRouter(prefix="/integrity", tags=["Data Integrity & Blockchain"])


@router.get(
    "/summary",
    response_model=IntegritySummaryResponse,
    summary="Get Integrity & Blockchain High-Level Summary",
    description="Returns aggregate counts of total, verified, tampered, and blockchain-anchored events for dashboard visualization.",
)
def get_integrity_summary(db: Session = Depends(get_database)) -> IntegritySummaryResponse:
    return IntegrityService.get_integrity_summary(db)


@router.get(
    "/batches",
    response_model=List[IntegrityBatchResponse],
    summary="List Integrity Batches",
    description="Lists chronological Merkle integrity batches with root hashes and blockchain transaction status.",
)
def list_batches(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_database),
) -> List[IntegrityBatchResponse]:
    stmt = (
        select(IntegrityBatchModel)
        .order_by(desc(IntegrityBatchModel.id))
        .offset(offset)
        .limit(limit)
    )
    batches = db.scalars(stmt).all()
    return [
        IntegrityBatchResponse(
            batch_id=b.batch_id,
            root_hash=b.root_hash,
            event_count=b.event_count,
            status=b.status,
            blockchain_status=b.blockchain_status,
            blockchain_tx_hash=b.blockchain_tx_hash,
            blockchain_network=b.blockchain_network,
            created_at=b.created_at,
            anchored_at=b.anchored_at,
        )
        for b in batches
    ]


@router.post(
    "/batches/create",
    response_model=IntegrityBatchResponse,
    summary="Create Merkle Batch from Pending Records",
    description="Aggregates unbatched integrity records into a binary Merkle tree and commits the calculated root hash.",
)
def create_batch(
    payload: CreateBatchRequest,
    db: Session = Depends(get_database),
) -> IntegrityBatchResponse:
    try:
        return IntegrityService.create_batch(db, max_events=payload.max_events)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"status": "failed", "message": str(exc)},
        )


@router.post(
    "/batches/anchor",
    response_model=IntegrityBatchResponse,
    summary="Anchor Batch Root to Blockchain",
    description="Submits the Merkle root hash of the specified batch to the configured blockchain adapter.",
)
def anchor_batch(
    payload: AnchorBatchRequest,
    current_user: UserModel = Depends(require_permission("blockchain:anchor")),
    db: Session = Depends(get_database),
) -> IntegrityBatchResponse:
    try:
        batch = IntegrityService.anchor_batch(db, batch_id=payload.batch_id)
        audit_service.record_event(
            db=db,
            action="BLOCKCHAIN_ANCHOR_SUCCESS",
            resource_type="integrity_batch",
            resource_id=payload.batch_id,
            user_id=current_user.id,
            username=current_user.username,
            status="SUCCESS",
            details={
                "tx_hash": batch.blockchain_tx_hash,
                "network": batch.blockchain_network,
                "root_hash": batch.root_hash,
            },
        )
        return batch
    except ValueError as exc:
        audit_service.record_event(
            db=db,
            action="BLOCKCHAIN_ANCHOR_FAILED",
            resource_type="integrity_batch",
            resource_id=payload.batch_id,
            user_id=current_user.id,
            username=current_user.username,
            status="FAILURE",
            details={"error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"status": "failed", "message": str(exc)},
        )


@router.get(
    "/batches/{batch_id}",
    response_model=IntegrityBatchResponse,
    summary="Get Batch Information",
    description="Retrieves details, Merkle root, and blockchain transaction proof for a given batch.",
)
def get_batch(
    batch_id: str,
    db: Session = Depends(get_database),
) -> IntegrityBatchResponse:
    stmt = select(IntegrityBatchModel).where(IntegrityBatchModel.batch_id == batch_id)
    batch = db.scalars(stmt).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch '{batch_id}' not found.",
        )
    return IntegrityBatchResponse(
        batch_id=batch.batch_id,
        root_hash=batch.root_hash,
        event_count=batch.event_count,
        status=batch.status,
        blockchain_status=batch.blockchain_status,
        blockchain_tx_hash=batch.blockchain_tx_hash,
        blockchain_network=batch.blockchain_network,
        created_at=batch.created_at,
        anchored_at=batch.anchored_at,
    )


@router.post(
    "/chain/verify",
    response_model=ChainVerificationResponse,
    summary="Verify Hash Chain Integrity",
    description="Validates the sequential tamper-evident hash chain to detect any insertion, deletion, or reordering.",
)
def verify_chain(
    limit: int = Query(500, ge=10, le=5000),
    db: Session = Depends(get_database),
) -> ChainVerificationResponse:
    return IntegrityService.verify_chain(db, limit=limit)


@router.get(
    "/{event_id}",
    response_model=EventIntegrityResponse,
    summary="Get Event Integrity Record",
    description="Retrieves the cryptographic integrity metadata recorded for a specific log event.",
)
def get_event_integrity(
    event_id: str,
    db: Session = Depends(get_database),
) -> EventIntegrityResponse:
    rec = IntegrityService.get_event_integrity(db, event_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Integrity record for event '{event_id}' not found.",
        )
    return rec


@router.post(
    "/{event_id}/verify",
    response_model=EventVerificationResponse,
    summary="Cryptographically Verify Event Integrity",
    description="Performs live server-side recalculation of SHA-256 over pristine raw bytes and compares with ingestion baseline.",
)
def verify_event_integrity(
    event_id: str,
    db: Session = Depends(get_database),
) -> EventVerificationResponse:
    return IntegrityService.verify_event_integrity(db, event_id)


@router.get(
    "/{event_id}/blockchain",
    response_model=EventBlockchainResponse,
    summary="Get Event Blockchain Anchoring Proof",
    description="Returns blockchain confirmation, batch Merkle root, and audit proof for the specified event.",
)
def get_event_blockchain(
    event_id: str,
    db: Session = Depends(get_database),
) -> EventBlockchainResponse:
    return IntegrityService.get_event_blockchain_info(db, event_id)
