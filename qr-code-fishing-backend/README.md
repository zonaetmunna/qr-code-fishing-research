---
title: QR Phishing Detection API
emoji: 🔒
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# QR Phishing Detection API

FastAPI backend that decodes QR codes and detects phishing URLs with a
character-level ML model (TensorFlow), plus URL heuristics and a trusted-domain
safety net.

## Endpoints
- `GET  /api/v1/health` — liveness
- `GET  /api/v1/health/ready` — readiness (checks the database)
- `POST /api/v1/scan` — analyze a QR **image** (multipart `file`)
- `POST /api/v1/scan-url` — analyze a **URL/text** directly (`{"url": "..."}`)
- `GET  /docs` — interactive API docs

## Configuration (set as Space "Variables and secrets")
- `DATABASE_URL` — Postgres URL (e.g. a free Neon database)
- `CORS_ORIGINS` — comma-separated allowed origins (your frontend URL)
- `MAX_UPLOAD_BYTES` — optional, default 5 MB

Runs on port 7860 (Hugging Face Spaces default).
