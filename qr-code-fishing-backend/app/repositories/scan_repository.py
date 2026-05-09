"""Persistence helpers for scan records."""

import logging

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.scan import ScanRecord
from app.schemas.scan import PhishingAnalysisResult

logger = logging.getLogger(__name__)


def create_scan(
    db: Session,
    payload_kind: str,
    extracted_summary: str,
    analysis: PhishingAnalysisResult,
) -> ScanRecord:
    """
    Insert a new scan row and return the ORM object.

    ``extracted_summary`` must be safe to store (URLs as-is; Wi‑Fi passwords masked).
    """
    row = ScanRecord(
        payload_kind=payload_kind,
        extracted_url=extracted_summary,
        classification=analysis.classification.value,
        confidence=analysis.confidence,
        indicators=list(analysis.indicators),
    )
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to persist scan record")
        raise
    return row
