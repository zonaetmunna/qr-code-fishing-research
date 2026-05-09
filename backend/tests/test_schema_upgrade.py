"""Tests for additive DB schema upgrades."""

from sqlalchemy import Column, Float, Integer, JSON, String, Text, create_engine, text
from sqlalchemy.orm import declarative_base

from app.db.schema_upgrade import upgrade_schema

LegacyBase = declarative_base()


class LegacyScan(LegacyBase):
    __tablename__ = "scan_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    extracted_url = Column(Text, nullable=False)
    classification = Column(String(32), nullable=False)
    confidence = Column(Float, nullable=False)
    indicators = Column(JSON, nullable=False)


def test_upgrade_adds_payload_kind() -> None:
    """Old table without payload_kind gets the column after upgrade."""
    engine = create_engine("sqlite:///:memory:")
    LegacyBase.metadata.create_all(bind=engine)
    with engine.connect() as c:
        cols = [r[1] for r in c.execute(text("PRAGMA table_info(scan_records)")).fetchall()]
    assert "payload_kind" not in cols

    upgrade_schema(engine)

    with engine.connect() as c:
        cols = [r[1] for r in c.execute(text("PRAGMA table_info(scan_records)")).fetchall()]
    assert "payload_kind" in cols
