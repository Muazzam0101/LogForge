"""LogForge Core Integrity Service.

Coordinates server-side cryptographic hash verification, tamper-evident hash chaining,
Merkle batch root generation, and blockchain anchoring.
"""
from datetime import datetime, timezone
import hmac
import logging
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from .chain import compute_chain_hash, verify_chain_sequence
from .merkle import MerkleTree
from .schemas import (
    ChainVerificationResponse,
    EventBlockchainResponse,
    EventIntegrityResponse,
    EventVerificationResponse,
    IntegrityBatchResponse,
    IntegritySummaryResponse,
)
from ..blockchain.web3_adapter import get_blockchain_adapter
from ..core.config import settings
from ..models.event import EventModel
from ..models.integrity import EventIntegrityModel, IntegrityBatchModel
from ..utils.hashing import compute_sha256

logger = logging.getLogger(__name__)


class IntegrityService:
    """Production service for event integrity verification and blockchain anchoring."""

    @staticmethod
    def create_integrity_record(
        db: Session,
        event_id: str,
        sha256_hash: str,
    ) -> EventIntegrityModel:
        """Creates and links an immutable event integrity record for an ingested event."""
        # 1. Fetch previous record to compute hash chain pointer
        stmt = select(EventIntegrityModel).order_by(desc(EventIntegrityModel.id)).limit(1)
        prev_record = db.scalars(stmt).first()

        prev_pointer = None
        if prev_record:
            prev_pointer = prev_record.chain_hash or prev_record.sha256_hash

        # 2. Compute deterministic cumulative chain hash
        chain_hash = compute_chain_hash(prev_pointer, sha256_hash)

        # 3. Determine initial blockchain status based on global configuration
        bc_status = "PENDING" if settings.BLOCKCHAIN_ENABLED else "DISABLED"

        integrity_model = EventIntegrityModel(
            event_id=event_id,
            sha256_hash=sha256_hash.lower().strip(),
            hash_algorithm="SHA-256",
            previous_hash=prev_pointer,
            chain_hash=chain_hash,
            verification_status="UNVERIFIED",
            blockchain_status=bc_status,
            blockchain_network=getattr(settings, "BLOCKCHAIN_NETWORK", "local-evm") if settings.BLOCKCHAIN_ENABLED else None,
            created_at=datetime.now(timezone.utc),
        )

        db.add(integrity_model)
        db.commit()
        db.refresh(integrity_model)
        return integrity_model

    @staticmethod
    def verify_event_integrity(db: Session, event_id: str) -> EventVerificationResponse:
        """Cryptographically verifies a log event by recalculating SHA-256 over pristine raw bytes.

        Guarantees constant-time comparison to protect against timing side-channel attacks.
        """
        now = datetime.now(timezone.utc)

        # 1. Retrieve the original raw event
        event_stmt = select(EventModel).where(EventModel.event_id == event_id)
        event = db.scalars(event_stmt).first()

        if not event:
            return EventVerificationResponse(
                event_id=event_id,
                integrity="NOT_FOUND",
                hash_algorithm="SHA-256",
                stored_hash=None,
                calculated_hash=None,
                verified_at=now,
                blockchain_anchored=False,
                blockchain_status="UNAVAILABLE",
                details=f"Event ID '{event_id}' does not exist in persistent storage.",
            )

        # 2. Retrieve the stored integrity record
        integ_stmt = select(EventIntegrityModel).where(EventIntegrityModel.event_id == event_id)
        integrity = db.scalars(integ_stmt).first()

        # If an event exists without an integrity record (e.g. legacy pre-phase ingestion), create one
        if not integrity:
            integrity = IntegrityService.create_integrity_record(db, event_id, event.sha256_hash)

        stored_hash = integrity.sha256_hash.lower().strip()

        # 3. Recalculate SHA-256 from the EXACT byte-for-byte original raw event
        try:
            calculated_hash = compute_sha256(event.raw_event).lower().strip()
        except Exception as exc:
            logger.error("Failed to compute SHA-256 for event %s: %s", event_id, exc)
            return EventVerificationResponse(
                event_id=event_id,
                integrity="VERIFICATION_ERROR",
                hash_algorithm="SHA-256",
                stored_hash=stored_hash,
                calculated_hash=None,
                verified_at=now,
                blockchain_anchored=False,
                blockchain_status=integrity.blockchain_status,
                details=f"Cryptographic calculation failure: {str(exc)}",
            )

        # 4. Constant-time cryptographic comparison
        is_valid = hmac.compare_digest(stored_hash, calculated_hash)

        # 5. Update and persist verification outcome in MySQL
        integrity.verification_status = "VALID" if is_valid else "TAMPERED"
        integrity.verified_at = now
        db.commit()
        db.refresh(integrity)

        # 6. Resolve batch and blockchain anchoring metadata
        batch_id = integrity.batch_id
        root_hash = None
        tx_hash = integrity.blockchain_tx_hash
        is_anchored = integrity.blockchain_status in ("CONFIRMED", "SUBMITTED")

        if batch_id and not tx_hash:
            batch_stmt = select(IntegrityBatchModel).where(IntegrityBatchModel.batch_id == batch_id)
            batch = db.scalars(batch_stmt).first()
            if batch:
                root_hash = batch.root_hash
                tx_hash = batch.blockchain_tx_hash
                if batch.blockchain_status == "CONFIRMED":
                    is_anchored = True

        details = (
            "Cryptographic signature is valid. Pristine raw bytes match the ingestion digest."
            if is_valid
            else "TAMPER DETECTED: The recalculated raw byte hash differs from the ingestion baseline digest."
        )

        return EventVerificationResponse(
            event_id=event_id,
            integrity=integrity.verification_status,
            hash_algorithm="SHA-256",
            stored_hash=stored_hash,
            calculated_hash=calculated_hash,
            verified_at=now,
            blockchain_anchored=is_anchored,
            blockchain_status=integrity.blockchain_status,
            batch_id=batch_id,
            root_hash=root_hash or integrity.blockchain_anchor,
            transaction_hash=tx_hash,
            details=details,
        )

    @staticmethod
    def get_event_integrity(db: Session, event_id: str) -> Optional[EventIntegrityResponse]:
        """Fetches the integrity metadata record for an event."""
        stmt = select(EventIntegrityModel).where(EventIntegrityModel.event_id == event_id)
        rec = db.scalars(stmt).first()
        if not rec:
            return None

        return EventIntegrityResponse(
            event_id=rec.event_id,
            sha256_hash=rec.sha256_hash,
            hash_algorithm=rec.hash_algorithm,
            previous_hash=rec.previous_hash,
            chain_hash=rec.chain_hash,
            batch_id=rec.batch_id,
            verification_status=rec.verification_status,
            blockchain_status=rec.blockchain_status,
            blockchain_tx_hash=rec.blockchain_tx_hash,
            blockchain_network=rec.blockchain_network,
            blockchain_anchor=rec.blockchain_anchor,
            created_at=rec.created_at,
            verified_at=rec.verified_at,
        )

    @staticmethod
    def get_event_blockchain_info(db: Session, event_id: str) -> EventBlockchainResponse:
        """Retrieves blockchain proof and Merkle path information for an event."""
        stmt = select(EventIntegrityModel).where(EventIntegrityModel.event_id == event_id)
        rec = db.scalars(stmt).first()

        if not rec:
            return EventBlockchainResponse(
                event_id=event_id,
                blockchain_anchored=False,
                blockchain_status="NOT_FOUND",
            )

        root_hash = rec.blockchain_anchor
        tx_hash = rec.blockchain_tx_hash
        anchored_at = None
        proof = None

        if rec.batch_id:
            batch_stmt = select(IntegrityBatchModel).where(IntegrityBatchModel.batch_id == rec.batch_id)
            batch = db.scalars(batch_stmt).first()
            if batch:
                root_hash = batch.root_hash
                tx_hash = batch.blockchain_tx_hash or tx_hash
                anchored_at = batch.anchored_at

                # Calculate Merkle proof for this event inside its batch
                batch_events_stmt = (
                    select(EventIntegrityModel.sha256_hash)
                    .where(EventIntegrityModel.batch_id == rec.batch_id)
                    .order_by(EventIntegrityModel.id)
                )
                leaves = list(db.scalars(batch_events_stmt).all())
                if leaves and rec.sha256_hash in leaves:
                    try:
                        tree = MerkleTree(leaves)
                        leaf_idx = leaves.index(rec.sha256_hash)
                        proof = tree.get_audit_proof(leaf_idx)
                    except Exception as e:
                        logger.warning("Failed to calculate Merkle proof: %s", e)

        is_anchored = rec.blockchain_status == "CONFIRMED"

        return EventBlockchainResponse(
            event_id=event_id,
            blockchain_anchored=is_anchored,
            blockchain_status=rec.blockchain_status,
            blockchain_network=rec.blockchain_network,
            blockchain_tx_hash=tx_hash,
            batch_id=rec.batch_id,
            root_hash=root_hash,
            merkle_proof=proof,
            anchored_at=anchored_at,
            contract_address=getattr(settings, "BLOCKCHAIN_CONTRACT_ADDRESS", None),
        )

    @staticmethod
    def create_batch(db: Session, max_events: int = 50) -> IntegrityBatchResponse:
        """Groups unbatched integrity records, builds a Merkle Tree, and stores the root."""
        # 1. Fetch unbatched events
        stmt = (
            select(EventIntegrityModel)
            .where(EventIntegrityModel.batch_id == None)
            .order_by(EventIntegrityModel.id)
            .limit(max_events)
        )
        unbatched = list(db.scalars(stmt).all())

        if not unbatched:
            raise ValueError("No unbatched integrity records available to anchor.")

        leaf_hashes = [rec.sha256_hash for rec in unbatched]

        # 2. Build deterministic Merkle Tree
        tree = MerkleTree(leaf_hashes)
        root_hash = tree.root
        batch_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        bc_status = "PENDING" if settings.BLOCKCHAIN_ENABLED else "DISABLED"

        batch = IntegrityBatchModel(
            batch_id=batch_id,
            root_hash=root_hash,
            event_count=len(unbatched),
            status="PENDING",
            blockchain_status=bc_status,
            blockchain_network=getattr(settings, "BLOCKCHAIN_NETWORK", "local-evm") if settings.BLOCKCHAIN_ENABLED else None,
            created_at=now,
        )
        db.add(batch)

        # 3. Associate records with batch
        for rec in unbatched:
            rec.batch_id = batch_id
            rec.blockchain_anchor = root_hash
            if not settings.BLOCKCHAIN_ENABLED:
                rec.blockchain_status = "DISABLED"

        db.commit()
        db.refresh(batch)

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

    @staticmethod
    def anchor_batch(db: Session, batch_id: str) -> IntegrityBatchResponse:
        """Anchors an existing batch root to the blockchain via the modular adapter."""
        stmt = select(IntegrityBatchModel).where(IntegrityBatchModel.batch_id == batch_id)
        batch = db.scalars(stmt).first()

        if not batch:
            raise ValueError(f"Batch '{batch_id}' not found.")

        # If already anchored
        if batch.blockchain_status == "CONFIRMED" and batch.blockchain_tx_hash:
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

        adapter = get_blockchain_adapter()
        receipt = adapter.anchor_hash(batch_id=batch.batch_id, root_hash=batch.root_hash)

        batch.blockchain_status = receipt.status
        batch.blockchain_tx_hash = receipt.tx_hash
        batch.blockchain_network = receipt.network
        batch.anchored_at = receipt.timestamp or datetime.now(timezone.utc)
        batch.status = "ANCHORED" if receipt.status in ("CONFIRMED", "PENDING") else "FAILED"

        # Update all linked events
        linked_stmt = select(EventIntegrityModel).where(EventIntegrityModel.batch_id == batch_id)
        events = db.scalars(linked_stmt).all()
        for ev in events:
            ev.blockchain_status = receipt.status
            ev.blockchain_tx_hash = receipt.tx_hash
            ev.blockchain_network = receipt.network
            ev.blockchain_anchor = batch.root_hash

        db.commit()
        db.refresh(batch)

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

    @staticmethod
    def get_integrity_summary(db: Session) -> IntegritySummaryResponse:
        """Returns aggregated integrity and blockchain metrics for the frontend dashboard."""
        total = db.scalar(select(func.count(EventIntegrityModel.id))) or 0
        verified = db.scalar(select(func.count(EventIntegrityModel.id)).where(EventIntegrityModel.verification_status == "VALID")) or 0
        tampered = db.scalar(select(func.count(EventIntegrityModel.id)).where(EventIntegrityModel.verification_status == "TAMPERED")) or 0
        unverified = total - (verified + tampered)
        anchored = db.scalar(select(func.count(EventIntegrityModel.id)).where(EventIntegrityModel.blockchain_status == "CONFIRMED")) or 0

        # Latest anchored batch
        latest_batch = db.scalars(
            select(IntegrityBatchModel).order_by(desc(IntegrityBatchModel.id)).limit(1)
        ).first()

        bc_status = "ENABLED" if settings.BLOCKCHAIN_ENABLED else "DISABLED"

        return IntegritySummaryResponse(
            total_records=total,
            verified_count=verified,
            tampered_count=tampered,
            unverified_count=unverified,
            blockchain_anchored_count=anchored,
            blockchain_status=bc_status,
            blockchain_network=getattr(settings, "BLOCKCHAIN_NETWORK", "local-evm") if settings.BLOCKCHAIN_ENABLED else "disabled",
            latest_root_hash=latest_batch.root_hash if latest_batch else None,
            last_anchored_at=latest_batch.anchored_at if latest_batch else None,
        )

    @staticmethod
    def verify_chain(db: Session, limit: int = 500) -> ChainVerificationResponse:
        """Audits the sequential hash chain across records."""
        stmt = (
            select(
                EventIntegrityModel.event_id,
                EventIntegrityModel.sha256_hash,
                EventIntegrityModel.previous_hash,
                EventIntegrityModel.chain_hash,
            )
            .order_by(EventIntegrityModel.id)
            .limit(limit)
        )
        rows = db.execute(stmt).mappings().all()
        records = [dict(r) for r in rows]

        is_valid, error, broken_idx = verify_chain_sequence(records)

        return ChainVerificationResponse(
            is_valid=is_valid,
            evaluated_records=len(records),
            error=error,
            broken_index=broken_idx,
        )
