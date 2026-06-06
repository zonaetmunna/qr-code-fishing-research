"""QR upload and analysis endpoints."""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.repositories.scan_repository import create_scan
from app.schemas.scan import (
    Classification,
    HealthResponse,
    ReadinessResponse,
    ScanResponse,
    ScanUrlRequest,
    WifiPayloadInfo,
)
from app.services.phishing_analysis import analyze_url
from app.services.phishing_helpers import (
    MAX_URL_CHARS,
    is_trusted_host,
    is_trusted_tld,
    parse_url_loose,
)
from app.services.qr_decoder import QRDecodeError, decode_qr_from_bytes
from app.services.qr_payload import build_scan_payload, detect_payload_kind
from app.services.ml_service import predict_url

router = APIRouter(prefix="/api/v1", tags=["scan"])
_settings = get_settings()
logger = logging.getLogger(__name__)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness probe for orchestration (does not check the database)."""
    return HealthResponse(service=_settings.app_name)


@router.get("/health/ready", response_model=ReadinessResponse)
def readiness(db: Session = Depends(get_db)) -> ReadinessResponse:
    """Readiness probe: verifies a database connection."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as e:
        logger.warning("Database readiness check failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Database unavailable.",
        ) from e
    return ReadinessResponse(service=_settings.app_name, database=True)


@router.post("/scan", response_model=ScanResponse)
async def scan_qr(
    file: UploadFile = File(..., description="QR code image (PNG, JPEG, etc.)"),
    db: Session = Depends(get_db),
) -> ScanResponse:
    """
    Decode any QR payload (URL, Wi‑Fi, text, …). Phishing heuristics run only for http(s) URLs.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file upload.")
    if len(raw_bytes) > _settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {_settings.max_upload_bytes} bytes).",
        )

    try:
        raw_payload = decode_qr_from_bytes(raw_bytes)
    except QRDecodeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if len(raw_payload) > MAX_URL_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Decoded payload exceeds maximum length ({MAX_URL_CHARS} characters).",
        )

    return _analyze_and_store(db, raw_payload)


@router.post("/scan-url", response_model=ScanResponse)
def scan_url(payload: ScanUrlRequest, db: Session = Depends(get_db)) -> ScanResponse:
    """
    Analyze a URL/text typed or pasted directly (no QR image).

    Same pipeline as ``/scan`` after decoding: payload classification, phishing
    heuristics + ML for http(s) URLs, and persistence.
    """
    raw_payload = payload.url.strip()
    if not raw_payload:
        raise HTTPException(status_code=400, detail="URL or text is required.")
    if len(raw_payload) > MAX_URL_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum length ({MAX_URL_CHARS} characters).",
        )
    return _analyze_and_store(db, raw_payload)


def _analyze_and_store(db: Session, raw_payload: str) -> ScanResponse:
    """Classify a decoded payload, run heuristics + ML, persist, and build the response."""
    kind = detect_payload_kind(raw_payload)
    safe_summary, precomputed, wifi_meta = build_scan_payload(raw_payload, kind)

    link_analysis_applied = precomputed is None
    if precomputed is None:
        analysis = analyze_url(raw_payload)
        stored = raw_payload
    else:
        analysis = precomputed
        stored = safe_summary

    # ML-PRIMARY decision for web links: the trained model sets the verdict.
    # Heuristic findings remain as warnings; a trusted-domain safety net forces SAFE.
    if link_analysis_applied:
        ml_prob = predict_url(raw_payload)
        if ml_prob is not None:
            parsed = parse_url_loose(raw_payload)
            host = (parsed.hostname or "").lower() if parsed else ""

            if is_trusted_host(host) or is_trusted_tld(host):
                # Safety net: well-known brands and restricted edu/gov TLDs (which an
                # attacker cannot register) are treated as safe regardless of the ML score.
                analysis.classification = Classification.SAFE
                analysis.confidence = 95.0
                analysis.indicators.insert(
                    0,
                    f"ML URL risk score: {ml_prob*100:.1f}% "
                    "(trusted domain / restricted TLD — treated as safe).",
                )
            else:
                # The ML score is the primary verdict.
                if ml_prob > 0.8:
                    analysis.classification = Classification.DANGEROUS
                elif ml_prob > 0.5:
                    analysis.classification = Classification.RISKY
                else:
                    analysis.classification = Classification.SAFE
                # Confidence = distance from the 0.5 boundary, scaled to 50–100%.
                analysis.confidence = round(50.0 + abs(ml_prob - 0.5) * 100.0, 1)
                analysis.indicators.insert(
                    0, f"ML URL risk score: {ml_prob*100:.1f}% (primary verdict)."
                )

    wifi_info: WifiPayloadInfo | None = None
    if wifi_meta is not None:
        wifi_info = WifiPayloadInfo(
            ssid=str(wifi_meta.get("ssid", "")),
            security=str(wifi_meta.get("security", "")),
            hidden=bool(wifi_meta.get("hidden")),
            password_redacted=bool(wifi_meta.get("password_redacted", True)),
        )

    try:
        record = create_scan(
            db,
            payload_kind=kind.value,
            extracted_summary=stored,
            analysis=analysis,
        )
    except SQLAlchemyError as e:
        logger.exception("Scan could not be saved: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Could not save scan result. Try again later.",
        ) from e

    logger.info(
        "scan_completed scan_id=%s payload_kind=%s classification=%s confidence=%s",
        record.id,
        kind.value,
        analysis.classification.value,
        record.confidence,
    )

    return ScanResponse(
        scan_id=record.id,
        payload_kind=kind.value,
        extracted_url=stored,
        classification=analysis.classification,
        confidence=record.confidence,
        indicators=list(record.indicators),
        created_at=record.created_at,
        wifi=wifi_info,
        link_analysis_applied=link_analysis_applied,
    )
