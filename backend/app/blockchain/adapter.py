"""Abstract Blockchain Adapter Interface for LogForge Integrity Anchoring.

Provides modular decoupling between core log processing and blockchain backends.
Ensures zero vendor lock-in, air-gapped compatibility, and non-blocking operation.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class AnchorReceipt:
    """Receipt returned after anchoring a Merkle root on-chain."""

    tx_hash: str
    batch_id: str
    root_hash: str
    network: str
    status: str  # CONFIRMED | PENDING | FAILED | UNAVAILABLE
    block_number: Optional[int] = None
    timestamp: Optional[datetime] = None
    contract_address: Optional[str] = None
    error: Optional[str] = None


class BlockchainAdapter(ABC):
    """Abstract interface defining required operations for on-chain integrity anchoring."""

    @abstractmethod
    def anchor_hash(self, batch_id: str, root_hash: str) -> AnchorReceipt:
        """Anchors a batch root hash on the blockchain.

        IMPORTANT: NEVER send raw logs or sensitive data to this method.
        Only the 32-byte (64 hex char) root hash and batch identifier are anchored.
        """
        pass

    @abstractmethod
    def verify_anchor(self, batch_id: str, root_hash: str) -> bool:
        """Queries the blockchain/contract to verify that root_hash is recorded for batch_id."""
        pass

    @abstractmethod
    def get_transaction(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """Retrieves transaction verification metadata from the blockchain."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the blockchain connection/node is reachable."""
        pass
