"""Tests for QR payload classification and Wi‑Fi parsing."""

from app.services.qr_payload import (
    PayloadKind,
    build_scan_payload,
    detect_payload_kind,
    parse_wifi_payload,
)


def test_detect_wifi() -> None:
    assert detect_payload_kind("WIFI:T:WPA;S:Home;;") == PayloadKind.WIFI


def test_detect_url() -> None:
    assert detect_payload_kind("https://a.com/x") == PayloadKind.URL


def test_parse_wifi_roundtrip() -> None:
    raw = "WIFI:T:WPA2;S:MyNet;P:pass;H:true;;"
    p = parse_wifi_payload(raw)
    assert p is not None
    assert p["ssid"] == "MyNet"
    assert p["password"] == "pass"
    assert p["security"] == "WPA2"
    assert p["hidden"] is True


def test_build_scan_payload_wifi_masks() -> None:
    raw = "WIFI:T:WPA;S:X;P:secret;;"
    summary, pre, meta = build_scan_payload(raw, PayloadKind.WIFI)
    assert pre is not None
    assert "secret" not in summary
    assert meta is not None
    assert "password_redacted" in meta
