# Test QR Code Samples

> **Research project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

Sample QR-code images used for manual and demonstration testing of the QR phishing
detection system. None of these are referenced by application code; they are inputs
for trying the web/mobile apps and the backend `/scan` endpoint.

| Folder | Contents |
|---|---|
| `demo_qr/` | PNG demo QR codes — `SAFE_*` (legitimate) and `PHISH_*` (phishing) URLs |
| `demo_qr_jpg/` | JPG variants of the demo QR codes |
| `test-qr/` | Brand QR codes (facebook, google, instagram, meta, youtube) |

> Automated unit tests live with their packages: `qr-code-fishing-backend/tests/`,
> `qr-code-fishing-frontend/lib/*.test.ts`, and `hf-space/tests/`.
