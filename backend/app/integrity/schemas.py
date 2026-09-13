"""Pydantic v2 Schemas for LogForge Cryptographic Integrity & Blockchain Anchoring."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EventVerificationResponse(BaseModel):
    """Result of server-side cryptographic re-verification for a log event."""

    event_id: str = Field(..., description="Unique UUIDv4 of the evaluated security log event")
    integrity: str = Field(..., description="VALID | TAMPERED | NOT_FOUND | VERIFICATION_ERROR")
    hash_algorithm: str = Field("SHA-256", description="Cryptographic algorithm used for verification")
    stored_hash: Optional[str] = Field(None, description="Original SHA-256 digest recorded at ingestion")
    calculated_hash: Optional[str] = Field(None, description="Cryptographic SHA-256 recalculated from raw bytes")
    verified_at: datetime = Field(..., description="Timestamp of server-side verification")
    blockchain_anchored: bool = Field(False, description="Whether event has been anchored on blockchain")
    blockchain_status: str = Field("PENDING", description="DISABLED | PENDING | SUBMITTED | CONFIRMED | FAILED | UNAVAILABLE")
    batch_id: Optional[str] = Field(None, description="ID of the batch grouping this event, if batched")
    root_hash: Optional[str] = Field(None, description="Merkle root of the batch containing this event")
    transaction_hash: Optional[str] = Field(None, description="Blockchain transaction hash if confirmed")
    details: Optional[str] = Field(None, description="Human-readable verification audit notes")


class EventIntegrityResponse(BaseModel):
    """Detailed cryptographic integrity record metadata for a stored event."""

    event_id: str
    sha256_hash: str
    hash_algorithm: str = "SHA-256"
    previous_hash: Optional[str] = None
    chain_hash: Optional[str] = None
    batch_id: Optional[str] = None
    verification_status: str = "UNVERIFIED"
    blockchain_status: str = "PENDING"
    blockchain_tx_hash: Optional[str] = None
    blockchain_network: Optional[str] = None
    blockchain_anchor: Optional[str] = None
    created_at: datetime
    verified_at: Optional[datetime] = None


class EventBlockchainResponse(BaseModel):
    """Blockchain anchoring verification information for an event."""

    event_id: str
    blockchain_anchored: bool
    blockchain_status: str
    blockchain_network: Optional[str] = None
    blockchain_tx_hash: Optional[str] = None
    batch_id: Optional[str] = None
    root_hash: Optional[str] = None
    merkle_proof: Optional[List[Dict[str, str]]] = None
    anchored_at: Optional[datetime] = None
    contract_address: Optional[str] = None


class CreateBatchRequest(BaseModel):
    """Request to group pending integrity records into a new Merkle batch."""

    max_events: int = Field(50, ge=1, le=500, description="Max events to include in this batch")


class AnchorBatchRequest(BaseModel):
    """Request to anchor an existing batch root onto the blockchain."""

    batch_id: str = Field(..., description="Batch UUIDv4 to anchor")


class IntegrityBatchResponse(BaseModel):
    """Information regarding a Merkle-anchored integrity batch."""

    batch_id: str
    root_hash: str
    event_count: int
    status: str
    blockchain_status: str
    blockchain_tx_hash: Optional[str] = None
    blockchain_network: Optional[str] = None
    created_at: datetime
    anchored_at: Optional[datetime] = None


class IntegritySummaryResponse(BaseModel):
    """High-level metrics for the Data Integrity dashboard."""

    total_records: int
    verified_count: int
    tampered_count: int
    unverified_count: int
    blockchain_anchored_count: int
    blockchain_status: str
    blockchain_network: Optional[str] = None
    latest_root_hash: Optional[str] = None
    last_anchored_at: Optional[datetime] = None


class ChainVerificationResponse(BaseModel):
    """Audit outcome of verifying the sequential hash chain."""

    is_valid: bool
    evaluated_records: int
    error: Optional[str] = None
    broken_index: Optional[int] = None
