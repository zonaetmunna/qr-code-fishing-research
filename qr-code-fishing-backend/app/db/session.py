"""Database engine and session factory."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.base import Base

_engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """Create or return the singleton SQLAlchemy engine."""
    global _engine
    if _engine is None:
        url = get_settings().database_url
        connect_args = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(
            url,
            pool_pre_ping=True,
            connect_args=connect_args or {},
        )
    return _engine


def reset_engine() -> None:
    """Dispose engine (for tests when DATABASE_URL changes)."""
    global _engine, SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    SessionLocal = None


def _get_session_local() -> sessionmaker[Session]:
    global SessionLocal
    if SessionLocal is None:
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return SessionLocal


def new_session() -> Session:
    """Open a new ORM session (useful for scripts and tests)."""
    return _get_session_local()()


def init_db() -> None:
    """Create database tables if they do not exist, then apply additive upgrades."""
    from app.db.schema_upgrade import upgrade_schema
    from app.models import scan  # noqa: F401

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    upgrade_schema(engine)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for request-scoped use."""
    db = _get_session_local()()
    try:
        yield db
    finally:
        db.close()
