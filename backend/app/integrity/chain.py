"""LogForge Tamper-Evident Hash Chain Utility.

Links sequential event integrity records into an immutable audit chain,
ensuring that any deletion, reordering, or modification of historical records
breaks subsequent chain hashes and is immediately detected.
"""
import hashlib
from typing import List, Optional, Tuple

GENESIS_PREVIOUS_HASH = "0" * 64


def compute_chain_hash(previous_hash: Optional[str], current_event_hash: str) -> str:
    """Computes a deterministic chained hash: SHA256(previous_hash + current_event_hash).

    Args:
        previous_hash: Hash of the preceding integrity record, or None for the genesis record.
        current_event_hash: Cryptographic SHA-256 hash of the pristine raw log event.

    Returns:
        Hex-encoded SHA-256 chained digest.
    """
    prev = (previous_hash or GENESIS_PREVIOUS_HASH).lower().strip()
    curr = current_event_hash.lower().strip()
    return hashlib.sha256((prev + curr).encode("utf-8")).hexdigest()


def verify_chain_sequence(records: List[dict]) -> Tuple[bool, Optional[str], Optional[int]]:
    """Verifies that an ordered sequence of integrity records forms an unbroken hash chain.

    Args:
        records: Chronologically ordered list of records with keys:
                 'event_id', 'sha256_hash', 'previous_hash', 'chain_hash'.

    Returns:
        (is_valid, error_message, broken_at_index)
    """
    if not records:
        return True, None, None

    # Verify first record
    first = records[0]
    expected_first_chain = compute_chain_hash(first.get("previous_hash"), first["sha256_hash"])
    if first.get("chain_hash") and first["chain_hash"].lower() != expected_first_chain:
        return (
            False,
            f"Genesis chain hash mismatch for event {first.get('event_id')}",
            0,
        )

    # Verify subsequent records
    for i in range(1, len(records)):
        prev_rec = records[i - 1]
        curr_rec = records[i]

        # 1. previous_hash pointer must match the previous chain_hash (or previous sha256_hash)
        expected_prev_pointer = prev_rec.get("chain_hash") or prev_rec.get("sha256_hash")
        actual_prev_pointer = curr_rec.get("previous_hash")

        if actual_prev_pointer and expected_prev_pointer:
            if actual_prev_pointer.lower() != expected_prev_pointer.lower():
                return (
                    False,
                    f"Broken pointer at index {i} (event {curr_rec.get('event_id')}): "
                    f"expected previous_hash '{expected_prev_pointer}', got '{actual_prev_pointer}'",
                    i,
                )

        # 2. current chain_hash must equal SHA256(previous_hash + current_sha256)
        if curr_rec.get("chain_hash"):
            recalculated = compute_chain_hash(actual_prev_pointer, curr_rec["sha256_hash"])
            if curr_rec["chain_hash"].lower() != recalculated:
                return (
                    False,
                    f"Chain hash calculation mismatch at index {i} (event {curr_rec.get('event_id')}): "
                    f"recorded '{curr_rec.get('chain_hash')}', calculated '{recalculated}'",
                    i,
                )

    return True, None, None
