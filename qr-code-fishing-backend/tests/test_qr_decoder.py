"""Tests for QR decoding."""

import io

import qrcode
import pytest

from app.services.qr_decoder import QRDecodeError, decode_qr_from_bytes


def _png_bytes_for_url(url: str) -> bytes:
    """Build a minimal PNG containing a QR code for ``url``."""
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_decode_valid_qr() -> None:
    """Decoder extracts embedded URL from generated QR."""
    raw = _png_bytes_for_url("https://example.com/path")
    assert decode_qr_from_bytes(raw) == "https://example.com/path"


def test_decode_empty_raises() -> None:
    """Empty bytes raise."""
    with pytest.raises(QRDecodeError, match="Empty"):
        decode_qr_from_bytes(b"")
