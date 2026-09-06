from typing import Generator
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..services.processing_service import ULPFEngine, ulpf_engine


def get_ulpf_engine() -> ULPFEngine:
    """Dependency provider for ULPF processing engine."""
    return ulpf_engine


def get_database() -> Generator[Session, None, None]:
    """Dependency provider for database session."""
    yield from get_db()
