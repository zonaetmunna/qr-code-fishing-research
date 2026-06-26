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
from app.services.ml_service import is_known_brand, predict_url_full

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

    # ML-BASED decision for web links: the trained model alone sets the verdict.
    # The static trusted-domain / restricted-TLD allowlist is an OPTIONAL false-positive
    # guard (off by default — see Settings.use_reputation_safety_net); it never detects a
    # threat, it can only mark a known-good site safe. Heuristics remain as explanations only.
    threat_type: str | None = None
    if link_analysis_applied:
        ml = predict_url_full(raw_payload)
        if ml is not None:
            label, conf = ml          # argmax class + its probability (same as the notebook)
            pct = round(conf * 100, 1)
            parsed = parse_url_loose(raw_payload)
            host = (parsed.hostname or "").lower() if parsed else ""

            safety_net = _settings.use_reputation_safety_net and (
                is_trusted_host(host) or is_trusted_tld(host)
            )
            if safety_net:
                # Optional reputation guard (disabled by default): force SAFE for known-good.
                analysis.classification = Classification.SAFE
                analysis.confidence = 95.0
                analysis.indicators.insert(
                    0, f"ML class: {label} ({pct}%) — trusted domain / restricted TLD (safety net)."
                )
            elif is_known_brand(raw_payload):
                # Verified exact brand / subdomain match (the model's own brand-similarity signal):
                # the host literally IS a known brand domain, so it is legitimate by definition.
                analysis.classification = Classification.SAFE
                analysis.confidence = 99.0
                analysis.indicators.insert(
                    0, "Exact match to a known brand domain — verified legitimate (not a look-alike)."
                )
            elif label == "benign":
                analysis.classification = Classification.SAFE
                analysis.confidence = pct
                analysis.indicators.insert(0, f"ML class: benign ({pct}%) — model verdict.")
            else:
                # A threat class won the argmax: report it and grade by its confidence.
                analysis.classification = (
                    Classification.DANGEROUS if conf > 0.8 else Classification.RISKY
                )
                analysis.confidence = pct
                threat_type = label
                analysis.indicators.insert(0, f"ML class: {label} ({pct}%) — model verdict.")

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
        threat_type=threat_type,
    )
