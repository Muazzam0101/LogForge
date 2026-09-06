"""LogForge Database Session & Connection Management."""
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from ..core.config import settings
from ..core.logging import logger

# Build engine kwargs based on dialect
engine_kwargs = {"echo": settings.DB_ECHO}

if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL pool settings
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_pre_ping": True,
    })

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding an isolated database session per request."""
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as exc:
        db.rollback()
        # Log clean message without leaking passwords or raw credentials
        logger.error("Database transaction error: %s", exc.__class__.__name__)
        raise
    finally:
        db.close()


def is_database_available() -> bool:
    """Checks if the configured database is reachable."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            return True
    except Exception as exc:
        logger.warning("Database connectivity check failed: %s", exc.__class__.__name__)
        return False
