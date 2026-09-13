"""LogForge Cryptographic Integrity & Blockchain Anchoring Database Models.

Stores immutable SHA-256 digests, tamper-evident hash chains, batch Merkle roots,
and on-chain verification metadata without persisting sensitive raw log payloads.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.base import Base


class EventIntegrityModel(Base):
    """Cryptographic integrity audit record for an ingested log event."""

    __tablename__ = "event_integrity"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )

    # Unique 1-to-1 reference to the corresponding event
    event_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("events.event_id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
        doc="ULPF UUIDv4 uniquely mapping to the raw security event",
    )

    # Cryptographic hash computed by ULPF engine over pristine raw_event
    sha256_hash: Mapped[str] = mapped_column(
        String(64),
        index=True,
        nullable=False,
        doc="Cryptographic SHA-256 hex digest of the raw log bytes",
    )

    # Algorithm identifier explicitly documented
    hash_algorithm: Mapped[str] = mapped_column(
        String(16),
        default="SHA-256",
        nullable=False,
        doc="Cryptographic hash algorithm standard (e.g. SHA-256)",
    )

    # Hash chain pointers for sequential tamper evidence
    previous_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        doc="SHA-256 digest of the previous integrity record (None for genesis)",
    )

    chain_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        doc="Chained cumulative hash: SHA256(previous_hash + current_event_hash)",
    )

    # Batch grouping reference for Merkle tree anchoring
    batch_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("integrity_batches.batch_id", ondelete="SET NULL"),
        index=True,
        nullable=True,
        doc="Reference to the batch under which this event was aggregated",
    )

    # Integrity verification state
    verification_status: Mapped[str] = mapped_column(
        String(32),
        default="UNVERIFIED",
        index=True,
        nullable=False,
        doc="Current cryptographic status: UNVERIFIED | VALID | TAMPERED | VERIFICATION_ERROR",
    )

    # Blockchain anchoring state
    blockchain_status: Mapped[str] = mapped_column(
        String(32),
        default="PENDING",
        index=True,
        nullable=False,
        doc="On-chain status: DISABLED | PENDING | SUBMITTED | CONFIRMED | FAILED | UNAVAILABLE",
    )

    # On-chain cryptographic references (zero raw data on-chain)
    blockchain_tx_hash: Mapped[Optional[str]] = mapped_column(
        String(66),
        nullable=True,
        doc="Transaction hash from the blockchain anchor transaction (0x...)",
    )

    blockchain_network: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        doc="Target blockchain identifier (e.g. local-evm, ethereum-sepolia, private-geth)",
    )

    blockchain_anchor: Mapped[Optional[str]] = mapped_column(
        String(66),
        nullable=True,
        doc="On-chain root hash or smart contract anchor state",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        doc="Integrity record creation timestamp",
    )

    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Most recent server-side verification timestamp",
    )

    # Relationships
    batch = relationship("IntegrityBatchModel", back_populates="events", foreign_keys=[batch_id])

    __table_args__ = (
        Index("ix_event_integrity_verification_created", "verification_status", "created_at"),
    )


    def __repr__(self) -> str:
        return (
            f"<EventIntegrity(id={self.id}, event_id='{self.event_id}', "
            f"status='{self.verification_status}', blockchain='{self.blockchain_status}')>"
        )


class IntegrityBatchModel(Base):
    """Aggregated batch of event hashes anchored to a Merkle tree root."""

    __tablename__ = "integrity_batches"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )

    batch_id: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        index=True,
        nullable=False,
        doc="UUIDv4 identifier for this integrity batch",
    )

    root_hash: Mapped[str] = mapped_column(
        String(64),
        index=True,
        nullable=False,
        doc="Deterministic Merkle root hash of all event hashes in this batch",
    )

    event_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        doc="Number of log events aggregated in this batch",
    )

    status: Mapped[str] = mapped_column(
        String(32),
        default="PENDING",
        nullable=False,
        doc="Batch status: PENDING | ANCHORED | FAILED",
    )

    blockchain_status: Mapped[str] = mapped_column(
        String(32),
        default="PENDING",
        index=True,
        nullable=False,
        doc="Blockchain status: DISABLED | PENDING | SUBMITTED | CONFIRMED | FAILED | UNAVAILABLE",
    )

    blockchain_tx_hash: Mapped[Optional[str]] = mapped_column(
        String(66),
        nullable=True,
        doc="Transaction hash of the anchor tx on the blockchain",
    )

    blockchain_network: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        doc="Blockchain network where root was anchored",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    anchored_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when blockchain confirmation was recorded",
    )

    # Relationships
    events = relationship("EventIntegrityModel", back_populates="batch")

    def __repr__(self) -> str:
        return (
            f"<IntegrityBatch(batch_id='{self.batch_id}', root_hash='{self.root_hash[:10]}...', "
            f"count={self.event_count}, status='{self.status}')>"
        )
