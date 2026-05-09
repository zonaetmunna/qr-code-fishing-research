"""API tests for scan and health endpoints."""

from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    """Health returns 200 and service name."""
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "service" in body


def test_readiness(client: TestClient) -> None:
    """Ready endpoint returns database status when DB is reachable."""
    r = client.get("/api/v1/health/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ready"
    assert body["database"] is True
    assert "service" in body


@patch(
    "app.api.routers.scan.decode_qr_from_bytes",
    return_value="https://example.com",
)
def test_scan_success(mock_decode: object, client: TestClient) -> None:
    """Scan accepts image and returns analysis payload."""
    files = {"file": ("qr.png", BytesIO(b"\x89PNG fake"), "image/png")}
    r = client.post("/api/v1/scan", files=files)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "scan_id" in data
    assert data["payload_kind"] == "url"
    assert data["link_analysis_applied"] is True
    assert data["extracted_url"] == "https://example.com"
    assert data["classification"] in ("safe", "risky", "dangerous")
    assert isinstance(data["confidence"], (int, float))
    assert isinstance(data["indicators"], list)


def test_scan_rejects_non_image(client: TestClient) -> None:
    """Non-image uploads are rejected."""
    files = {"file": ("x.txt", BytesIO(b"hello"), "text/plain")}
    r = client.post("/api/v1/scan", files=files)
    assert r.status_code == 400


def test_scan_rejects_empty_upload(client: TestClient) -> None:
    """Empty file body is rejected."""
    files = {"file": ("qr.png", BytesIO(b""), "image/png")}
    r = client.post("/api/v1/scan", files=files)
    assert r.status_code == 400


@patch(
    "app.api.routers.scan.decode_qr_from_bytes",
    return_value='WIFI:T:WPA;S:Guest;P:secret123;H:false;;',
)
def test_scan_wifi_payload_redacts_password(_mock: object, client: TestClient) -> None:
    """Wi‑Fi QR is classified as wifi; password is not returned or stored verbatim."""
    files = {"file": ("qr.png", BytesIO(b"\x89PNG fake"), "image/png")}
    r = client.post("/api/v1/scan", files=files)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["payload_kind"] == "wifi"
    assert "secret123" not in data["extracted_url"]
    assert "secret123" not in str(data.get("wifi"))
    assert data.get("wifi") is not None
    assert data["wifi"]["ssid"] == "Guest"
    assert data["wifi"]["password_redacted"] is True
    assert data["link_analysis_applied"] is False
