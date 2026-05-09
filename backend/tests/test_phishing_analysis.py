"""Unit tests for heuristic phishing analysis."""

import pytest

from app.schemas.scan import Classification
from app.services.phishing_analysis import analyze_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://www.google.com/search?q=test", Classification.SAFE),
        ("http://192.168.0.1/login", Classification.RISKY),
        ("http://user:cred@evil.tk/verify", Classification.DANGEROUS),
    ],
)
def test_analyze_url_classification(url: str, expected: Classification) -> None:
    """Known patterns map to expected tiers."""
    result = analyze_url(url)
    assert result.classification == expected
    assert 0.0 <= result.confidence <= 100.0
    assert len(result.indicators) >= 1


def test_at_symbol_increases_risk() -> None:
    """URLs with userinfo '@' are flagged strongly."""
    r = analyze_url("http://account@192.168.0.1/")
    assert r.classification == Classification.DANGEROUS


def test_empty_url_is_risky() -> None:
    """Empty input is not treated as safe."""
    r = analyze_url("")
    assert r.classification != Classification.SAFE


def test_shortener_host_is_flagged() -> None:
    """Known shortener domains increase risk tier."""
    r = analyze_url("https://bit.ly/abc123")
    assert r.classification in (Classification.RISKY, Classification.DANGEROUS)
    assert any("Short link" in i or "short" in i.lower() for i in r.indicators)
