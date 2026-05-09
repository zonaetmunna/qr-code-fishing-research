"""Unit tests for phishing heuristic helpers."""

from app.services.phishing_helpers import (
    clip_indicators,
    parse_url_loose,
    score_shortener,
    score_url_length,
)


def test_parse_url_loose_adds_scheme() -> None:
    p = parse_url_loose("example.com/foo")
    assert p is not None
    assert p.hostname == "example.com"


def test_score_shortener_bitly() -> None:
    pts, msgs = score_shortener("bit.ly")
    assert pts > 0
    assert msgs


def test_score_url_length_long() -> None:
    long_url = "https://a.com/" + "x" * 250
    pts, msgs = score_url_length(long_url)
    assert pts > 0
    assert msgs


def test_clip_indicators_truncates() -> None:
    items = [f"item-{i}" for i in range(20)]
    out = clip_indicators(items, limit=5)
    assert len(out) == 6
    assert "more signal" in out[-1].lower()
