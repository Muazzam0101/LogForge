from ..services.processing_service import ULPFEngine, ulpf_engine


def get_ulpf_engine() -> ULPFEngine:
    """Dependency provider for ULPF processing engine."""
    return ulpf_engine
