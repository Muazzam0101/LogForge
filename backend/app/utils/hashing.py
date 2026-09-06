import hashlib


def compute_sha256(raw_log: str) -> str:
    """Computes a cryptographic SHA-256 hex digest for the pristine raw log.

    This forms the baseline for tamper-evidence and future blockchain integrity
    verification without mutating the raw string.
    """
    if raw_log is None:
        raise ValueError("Cannot compute hash of None raw_log")
    return hashlib.sha256(raw_log.encode("utf-8")).hexdigest()
