"""ORM model for persisted QR scan results."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ScanRecord(Base):
    """Stores one QR decode + phishing analysis outcome."""

    __tablename__ = "scan_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    payload_kind: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default="url",
    )
    extracted_url: Mapped[str] = mapped_column(Text, nullable=False)
    classification: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    indicators: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
