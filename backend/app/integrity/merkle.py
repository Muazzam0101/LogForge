"""Deterministic Binary Merkle Tree for LogForge Batch Integrity Anchoring.

Implements standard binary Merkle tree construction with deterministic odd-node
duplication (RFC 6962 / Bitcoin standard) to compute cryptographic root hashes
and verifiable audit proofs without exposing raw logs or full datasets.
"""
import hashlib
from typing import Any, Dict, List, Optional, Tuple


def hash_pair(left: str, right: str) -> str:
    """Computes SHA-256 digest of concatenated left and right child hex hashes."""
    combined = (left + right).encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


class MerkleTree:
    """Deterministic binary Merkle Tree built over a sequence of SHA-256 leaf hashes."""

    def __init__(self, leaf_hashes: List[str]):
        if not leaf_hashes:
            raise ValueError("Cannot construct a Merkle Tree with empty leaf hashes.")
        
        # Store sanitized lowercase leaves
        self.leaves: List[str] = [h.lower().strip() for h in leaf_hashes]
        self.levels: List[List[str]] = []
        self._build_tree()

    def _build_tree(self) -> None:
        """Constructs all tree levels bottom-up from leaves to the root."""
        current_level = list(self.leaves)
        self.levels.append(current_level)

        while len(current_level) > 1:
            next_level: List[str] = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                # If odd number of nodes at this level, duplicate the last node
                right = current_level[i + 1] if (i + 1 < len(current_level)) else left
                parent = hash_pair(left, right)
                next_level.append(parent)

            self.levels.append(next_level)
            current_level = next_level

    @property
    def root(self) -> str:
        """Returns the 64-character SHA-256 Merkle root hex digest."""
        return self.levels[-1][0]

    def get_audit_proof(self, leaf_index: int) -> List[Dict[str, str]]:
        """Generates a cryptographic Merkle audit proof for the leaf at leaf_index.

        Returns:
            List of proof steps, each containing:
                - 'sibling': hex hash of the sibling node
                - 'position': 'left' or 'right' indicating sibling's relative position
        """
        if leaf_index < 0 or leaf_index >= len(self.leaves):
            raise IndexError(f"Leaf index {leaf_index} out of bounds (total leaves: {len(self.leaves)})")

        proof: List[Dict[str, str]] = []
        idx = leaf_index

        for level in self.levels[:-1]:
            is_right_child = (idx % 2 == 1)
            if is_right_child:
                sibling_idx = idx - 1
                sibling_hash = level[sibling_idx]
                proof.append({"sibling": sibling_hash, "position": "left"})
            else:
                # Right sibling, or duplicate if at odd end
                sibling_idx = idx + 1 if (idx + 1 < len(level)) else idx
                sibling_hash = level[sibling_idx]
                proof.append({"sibling": sibling_hash, "position": "right"})

            idx //= 2

        return proof

    @staticmethod
    def verify_proof(leaf_hash: str, proof: List[Dict[str, str]], expected_root: str) -> bool:
        """Verifies a Merkle audit proof against the expected root hash.

        Does not require the full tree; can be verified independently off-chain or on-chain.
        """
        current_hash = leaf_hash.lower().strip()
        expected = expected_root.lower().strip()

        for step in proof:
            sibling = step["sibling"].lower().strip()
            position = step["position"]

            if position == "left":
                current_hash = hash_pair(sibling, current_hash)
            elif position == "right":
                current_hash = hash_pair(current_hash, sibling)
            else:
                raise ValueError(f"Invalid proof position: {position}")

        return hashlib.sha256(current_hash.encode("utf-8")).hexdigest() == hashlib.sha256(expected.encode("utf-8")).hexdigest() if current_hash == expected else False
