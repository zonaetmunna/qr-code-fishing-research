"""Pytest fixtures: test DB and FastAPI client."""

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

os.environ["DATABASE_URL"] = "sqlite:///./test_qr_phishing.db"

from app.core.config import get_settings  # noqa: E402
from app.db.session import get_db, init_db, reset_engine  # noqa: E402


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """SQLite file DB for integration tests."""
    get_settings.cache_clear()
    reset_engine()
    init_db()
    from app.db.session import new_session

    session = new_session()
    try:
        yield session
    finally:
        session.close()
        reset_engine()
        get_settings.cache_clear()
        try:
            os.remove("test_qr_phishing.db")
        except OSError:
            pass


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """HTTP client with overridden DB session."""
    from app.main import app

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
