"""Heuristic phishing analysis (explainable indicators, modular helpers)."""

from __future__ import annotations

from urllib.parse import ParseResult

from app.schemas.scan import Classification, PhishingAnalysisResult
from app.services.phishing_helpers import (
    MAX_URL_CHARS,
    clip_indicators,
    parse_url_loose,
    score_ip_host,
    score_nonstandard_port,
    score_path_keywords,
    score_punycode,
    score_scheme,
    score_shortener,
    score_subdomain_depth,
    score_tld,
    score_url_length,
    score_userinfo,
    trusted_relief,
)


def _map_risk_to_output(risk_score: float) -> tuple[Classification, float]:
    """Map accumulated risk score to classification and confidence (0–100)."""
    if risk_score >= 45:
        classification = Classification.DANGEROUS
        confidence = min(97.0, 60.0 + risk_score * 0.5)
    elif risk_score >= 18:
        classification = Classification.RISKY
        confidence = min(92.0, 45.0 + risk_score * 0.8)
    else:
        classification = Classification.SAFE
        confidence = min(100.0, max(55.0, 95.0 - risk_score * 1.2))
    return classification, round(confidence, 1)


def _accumulate(parsed: ParseResult, raw_for_length: str) -> tuple[float, list[str]]:
    """Run all host/path/port heuristics and return risk score plus indicators."""
    risk = 0.0
    indicators: list[str] = []
    host = (parsed.hostname or "").lower()

    if not host:
        return risk, indicators

    parts = host.split(".")

    for fn in (
        lambda: score_scheme(parsed.scheme),
        lambda: score_ip_host(host),
        lambda: score_tld(parts),
        lambda: score_subdomain_depth(parts),
        lambda: score_punycode(host),
        lambda: score_shortener(host),
        lambda: score_nonstandard_port(parsed),
        lambda: score_path_keywords(parsed.path or ""),
        lambda: score_url_length(raw_for_length),
    ):
        pts, msgs = fn()
        risk += pts
        indicators.extend(msgs)

    relief_pts, relief_msgs = trusted_relief(host)
    risk += relief_pts
    indicators.extend(relief_msgs)

    return risk, indicators


def analyze_url(url: str) -> PhishingAnalysisResult:
    """
    Score a URL using lightweight heuristics.

    Returns classification, confidence 0–100, and human-readable indicators.
    Replaceable by ML or threat-intel feeds without changing the API contract.
    """
    if not url or not url.strip():
        return PhishingAnalysisResult(
            classification=Classification.RISKY,
            confidence=55.0,
            indicators=["Empty or missing URL cannot be verified."],
        )

    raw = url.strip()
    if len(raw) > MAX_URL_CHARS:
        return PhishingAnalysisResult(
            classification=Classification.RISKY,
            confidence=62.0,
            indicators=[f"URL exceeds maximum length ({MAX_URL_CHARS} characters)."],
        )

    after_scheme = raw.split("://", 1)[-1]
    u_pts, u_msgs = score_userinfo(after_scheme)

    parsed = parse_url_loose(raw)
    if parsed is None:
        return PhishingAnalysisResult(
            classification=Classification.DANGEROUS,
            confidence=88.0,
            indicators=["URL could not be parsed; treat as unsafe."],
        )

    host = (parsed.hostname or "").lower()
    if not host:
        return PhishingAnalysisResult(
            classification=Classification.DANGEROUS,
            confidence=90.0,
            indicators=["No hostname present in URL."],
        )

    risk_score = float(u_pts)
    indicators = list(u_msgs)

    more_risk, more_msgs = _accumulate(parsed, raw)
    risk_score += more_risk
    indicators.extend(more_msgs)

    classification, confidence = _map_risk_to_output(risk_score)

    if not indicators:
        indicators.append("No strong phishing signals detected by basic heuristics.")

    return PhishingAnalysisResult(
        classification=classification,
        confidence=confidence,
        indicators=clip_indicators(indicators),
    )
