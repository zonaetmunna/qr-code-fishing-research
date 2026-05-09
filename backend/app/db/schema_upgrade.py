"""
Additive schema upgrades for existing databases.

``Base.metadata.create_all()`` creates missing tables but does not add new columns
to tables that already exist. After model changes (e.g. new ``payload_kind``), we
apply small ALTERs when needed.
"""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def upgrade_schema(engine: Engine) -> None:
    """Ensure required columns exist on ``scan_records``."""
    try:
        inspector = inspect(engine)
    except Exception:  # noqa: BLE001 — inspection should not block startup
        logger.exception("Schema inspection failed")
        return

    if not inspector.has_table("scan_records"):
        return

    columns = {c["name"] for c in inspector.get_columns("scan_records")}
    if "payload_kind" in columns:
        return

    logger.info("Applying schema upgrade: add scan_records.payload_kind")
    ddl = (
        "ALTER TABLE scan_records ADD COLUMN payload_kind VARCHAR(32) "
        "NOT NULL DEFAULT 'url'"
    )
    with engine.begin() as conn:
        conn.execute(text(ddl))
