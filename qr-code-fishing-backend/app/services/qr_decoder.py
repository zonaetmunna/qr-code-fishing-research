"""Decode QR codes from image bytes using pyzbar with OpenCV fallback."""

from __future__ import annotations

import cv2
import numpy as np
from pyzbar import pyzbar


class QRDecodeError(Exception):
    """Raised when the image cannot be decoded or contains no QR payload."""


def _decode_with_pyzbar(image_bgr: np.ndarray) -> list[str]:
    """Return text payloads from pyzbar."""
    decoded = pyzbar.decode(image_bgr)
    out: list[str] = []
    for obj in decoded:
        try:
            text = obj.data.decode("utf-8")
        except UnicodeDecodeError:
            text = obj.data.decode("latin-1", errors="replace")
        out.append(text.strip())
    return out


def _decode_with_opencv(image_bgr: np.ndarray) -> list[str]:
    """Fallback: OpenCV QRCodeDetector."""
    det = cv2.QRCodeDetector()
    ok, decoded_text, _points = det.detectAndDecode(image_bgr)
    if ok and decoded_text:
        return [decoded_text.strip()]
    return []


def decode_qr_from_bytes(image_bytes: bytes) -> str:
    """
    Decode the first URL-like or text payload from a QR image.

    Raises:
        QRDecodeError: Invalid image or no QR found.
    """
    if not image_bytes:
        raise QRDecodeError("Empty file.")

    nparr = np.frombuffer(image_bytes, dtype=np.uint8)
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise QRDecodeError("Could not read image data.")

    texts = _decode_with_pyzbar(image_bgr)
    if not texts:
        texts = _decode_with_opencv(image_bgr)
    if not texts:
        raise QRDecodeError("No QR code found in image.")

    # Prefer first payload that looks like a URL; otherwise return first string.
    for t in texts:
        if t.lower().startswith(("http://", "https://")):
            return t
    for t in texts:
        if "://" in t or "." in t:
            return t
    return texts[0]
