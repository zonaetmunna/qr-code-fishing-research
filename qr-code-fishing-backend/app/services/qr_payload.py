"""
Classify QR text payloads (URL, Wi‑Fi, phone, …) and build privacy-safe summaries.

Phishing heuristics apply only to http(s) URLs. Wi‑Fi QR codes embed passwords;
those are never returned or stored in clear text.
"""

from __future__ import annotations

import re
from enum import StrEnum

from app.schemas.scan import Classification, PhishingAnalysisResult


class PayloadKind(StrEnum):
    """High-level kind of decoded QR content."""

    URL = "url"
    WIFI = "wifi"
    TEXT = "text"
    PHONE = "phone"
    EMAIL = "email"
    SMS = "sms"
    GEO = "geo"
    OTHER = "other"


NOT_URL_PHISHING: PhishingAnalysisResult = PhishingAnalysisResult(
    classification=Classification.SAFE,
    confidence=0.0,
    indicators=[
        "Phishing link scoring applies only to http(s) web addresses. "
        "This QR does not encode a plain web URL, so URL-specific heuristics were not run."
    ],
)


def detect_payload_kind(raw: str) -> PayloadKind:
    """Best-effort classification from the raw string (first line / trimmed)."""
    s = raw.strip()
    low = s.lower()
    if low.startswith(("http://", "https://")):
        return PayloadKind.URL
    # Wi‑Fi QR (common Android/iOS hotspot sharing)
    if low.startswith("wifi:"):
        return PayloadKind.WIFI
    if low.startswith("mailto:"):
        return PayloadKind.EMAIL
    if low.startswith("sms:") or low.startswith("smsto:"):
        return PayloadKind.SMS
    if low.startswith("tel:"):
        return PayloadKind.PHONE
    if low.startswith("geo:"):
        return PayloadKind.GEO
    # Looks like URL without scheme (domain.tld/path)
    if "://" in s and not low.startswith("wifi:"):
        return PayloadKind.URL
    if re.match(r"^[a-z0-9.-]+\.[a-z]{2,}(/|$)", low):
        return PayloadKind.URL
    return PayloadKind.TEXT if len(s) < 4000 else PayloadKind.OTHER


def parse_wifi_payload(raw: str) -> dict[str, str | bool] | None:
    """
    Parse ``WIFI:T:...;S:...;P:...`` style payloads.

    Escaping in SSID/password is only partially handled; exotic encodings may need a richer parser.
    """
    s = raw.strip()
    if not s.lower().startswith("wifi:"):
        return None
    body = s[5:].strip()
    if body.endswith(";;"):
        body = body[:-2]
    fields: dict[str, str] = {}
    for segment in body.split(";"):
        if not segment.strip():
            continue
        if ":" not in segment:
            continue
        key, _, val = segment.partition(":")
        fields[key.strip().upper()] = val.strip()
    security = fields.get("T", "")
    ssid = fields.get("S", "")
    password = fields.get("P", "")
    hidden = str(fields.get("H", "")).lower() in ("true", "1", "yes")
    return {
        "security": security,
        "ssid": ssid,
        "password": password,
        "hidden": hidden,
    }


def wifi_safe_summary(parsed: dict[str, str | bool]) -> str:
    """Human-readable, storage-safe line (password never included)."""
    ssid = str(parsed.get("ssid") or "(hidden SSID)")
    sec = str(parsed.get("security") or "unknown")
    hid = "hidden SSID" if parsed.get("hidden") else "visible SSID"
    return f"Wi‑Fi network · SSID: {ssid} · Security: {sec} · {hid} · Password: [not stored]"


def wifi_public_meta(parsed: dict[str, str | bool]) -> dict[str, str | bool]:
    """Subset safe to return to clients (no password)."""
    return {
        "ssid": str(parsed.get("ssid") or ""),
        "security": str(parsed.get("security") or ""),
        "hidden": bool(parsed.get("hidden")),
        "password_redacted": True,
    }


def build_scan_payload(
    raw: str,
    kind: PayloadKind,
) -> tuple[str, PhishingAnalysisResult | None, dict[str, str | bool] | None]:
    """
    Return (safe_stored_summary, phishing_result_or_none, wifi_meta_or_none).

    For URLs, stored value is the raw URL (length already bounded by caller).
    For Wi‑Fi, stored value is a redacted summary; password is never persisted.
    """
    if kind == PayloadKind.URL:
        return raw, None, None

    if kind == PayloadKind.WIFI:
        parsed = parse_wifi_payload(raw)
        if parsed:
            summary = wifi_safe_summary(parsed)
            return summary, NOT_URL_PHISHING, wifi_public_meta(parsed)
        return (
            "Wi‑Fi QR (could not parse fields; password not shown).",
            NOT_URL_PHISHING,
            None,
        )

    if kind in (PayloadKind.PHONE, PayloadKind.EMAIL, PayloadKind.SMS, PayloadKind.GEO):
        # Short schemes — store as-is (no passwords in standard tel/mailto payloads)
        return raw.strip(), NOT_URL_PHISHING, None

    if kind == PayloadKind.TEXT:
        preview = raw.strip()
        if len(preview) > 500:
            preview = preview[:500] + "…"
        return (
            f"Plain text ({len(raw)} chars): {preview}",
            NOT_URL_PHISHING,
            None,
        )

    preview = raw.strip()
    if len(preview) > 500:
        preview = preview[:500] + "…"
    return (
        f"Other payload ({len(raw)} chars): {preview}",
        NOT_URL_PHISHING,
        None,
    )
