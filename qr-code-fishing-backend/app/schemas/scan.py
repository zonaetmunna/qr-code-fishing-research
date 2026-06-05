"""Pydantic schemas for scan API requests and responses."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class Classification(str, Enum):
    """URL safety tier returned to clients."""

    SAFE = "safe"
    RISKY = "risky"
    DANGEROUS = "dangerous"


class PhishingAnalysisResult(BaseModel):
    """Output of the phishing heuristic engine."""

    classification: Classification
    confidence: float = Field(ge=0.0, le=100.0)
    indicators: list[str] = Field(default_factory=list)


class ScanUrlRequest(BaseModel):
    """Request body for analyzing a URL/text typed directly (no QR image)."""

    url: str = Field(..., min_length=1, description="URL or text to analyze.")


class WifiPayloadInfo(BaseModel):
    """Wi‑Fi QR metadata safe for clients (no password)."""

    ssid: str
    security: str
    hidden: bool
    password_redacted: bool = True


class ScanResponse(BaseModel):
    """API response after decoding and analyzing a QR image."""

    scan_id: int
    payload_kind: str = Field(
        ...,
        description="Decoded payload type: url, wifi, text, phone, email, sms, geo, other.",
    )
    extracted_url: str = Field(
        ...,
        description="Safe primary text: full URL for web links, redacted summary for Wi‑Fi, etc.",
    )
    classification: Classification
    confidence: float
    indicators: list[str]
    created_at: datetime
    wifi: WifiPayloadInfo | None = Field(
        default=None,
        description="Present when payload_kind is wifi and parsing succeeded.",
    )
    link_analysis_applied: bool = Field(
        default=True,
        description="True only when the payload was treated as a web URL for phishing heuristics.",
    )

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    """Simple health check payload."""

    status: str = "ok"
    service: str


class ReadinessResponse(BaseModel):
    """Readiness probe including database connectivity."""

    status: str = "ready"
    service: str
    database: bool
