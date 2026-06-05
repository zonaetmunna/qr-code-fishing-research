# QR Code Phishing Detection ("Quishing" Detector)

A research/thesis project that detects phishing in QR codes. A QR code is a
loss-less encoding of its URL, so the system **decodes the QR to its URL** and a
**machine-learning model classifies the URL** as safe / risky / dangerous, backed
by URL heuristics and a trusted-domain safety net.

> **Live API:** https://zonaet-qrcode-fishing.hf.space
> ( [interactive docs](https://zonaet-qrcode-fishing.hf.space/docs) )

---

## 1. What's in this repo

| Folder | What it is | Stack |
|---|---|---|
| `qr-code-fishing-backend/` | REST API + ML inference + DB | FastAPI, TensorFlow, SQLAlchemy |
| `qr-code-fishing-frontend/` | Web app | Next.js, React, Tailwind |
| `qr-code-fishing-mobile/` | Mobile app | Expo / React Native |
| `research/` | ML training notebooks (Google Colab) | TensorFlow / Keras |
| `docs/` | Architecture & research write-ups | — |
| `deploy-backend.ps1` | One-command backend re-deploy script | PowerShell |
| `hf-space/` | Local clone of the Hugging Face Space (deploy target; not committed to this repo) | — |

## 2. How it works

```
User → [ Web / Mobile app ]
            │  scan image (camera / upload)  OR  paste URL
            ▼
     POST /api/v1/scan       (QR image  → decode → URL)
     POST /api/v1/scan-url   (URL text directly)
            ▼
     [ FastAPI backend ]
        1. decode QR (pyzbar / OpenCV)         → URL text
        2. ML model (char-level CNN/Transformer) → P(phishing)
        3. URL heuristics + trusted-domain guard
        4. save scan to Postgres (Neon)
            ▼
     JSON: classification, confidence, ML score, warnings
            ▼
     App shows SAFE / RISKY / DANGEROUS + reasons
```

**Three ways to scan** (web + mobile): 📁 upload image · 📷 camera · 🔗 paste URL.

The detection is **ML-primary**: the model's phishing score sets the verdict; a
trusted-domain allowlist prevents false alarms on well-known sites (e.g. google.com).

## 3. API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Liveness |
| GET | `/api/v1/health/ready` | Readiness (checks the database) |
| POST | `/api/v1/scan` | Analyze a QR **image** (multipart `file`) |
| POST | `/api/v1/scan-url` | Analyze a **URL/text** (`{"url": "..."}`) |
| GET | `/docs` | Interactive Swagger docs |

---

## 4. Local development

### Backend (FastAPI)
Requires Python 3.11+ and the system library **zbar** (for `pyzbar`).
```bash
cd qr-code-fishing-backend
pip install -r requirements.txt
# create .env (see qr-code-fishing-backend/.env.example):
#   DATABASE_URL=postgresql://...        (or sqlite:///./qr_phishing.db)
#   CORS_ORIGINS=http://localhost:3000
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
The ML model files must be present at
`qr-code-fishing-backend/app/models/ml/phishing_url_model.keras` and `url_tokenizer.json`.
If missing, ML is skipped gracefully (heuristics still run).

### Web (Next.js)
```bash
cd qr-code-fishing-frontend
pnpm install
# .env:  NEXT_PUBLIC_API_URL=http://localhost:8000   (or the live HF URL)
pnpm dev        # http://localhost:3000
```

### Mobile (Expo)
```bash
cd qr-code-fishing-mobile
npm install
# .env:  EXPO_PUBLIC_API_URL=https://zonaet-qrcode-fishing.hf.space
#  (on a phone, localhost won't reach your PC — use the live URL or your LAN IP)
npx expo start -c
```

---

## 5. Deployment (all free)

| Part | Host | Why |
|---|---|---|
| Backend (API + ML + DB) | **Hugging Face Spaces** (Docker) | 16 GB RAM free — fits TensorFlow |
| Database | **Neon** (serverless Postgres) | free + persistent |
| Web frontend | **Vercel** | native Next.js host, free |
| Mobile | **Expo** (EAS / Expo Go) | — |

### 5.1 Backend → Hugging Face Spaces + Neon

The backend has **TensorFlow**, which needs ~1 GB RAM — most free hosts (512 MB)
crash on startup. **Hugging Face Spaces** (free, 16 GB RAM) fits it; **Neon** provides
a free, persistent Postgres database. Detailed guide:
[`qr-code-fishing-backend/DEPLOY.md`](qr-code-fishing-backend/DEPLOY.md).

### One-time setup

1. **Neon** — create a free Postgres at https://neon.tech, copy the connection
   string (must start with `postgresql://` and end with `?sslmode=require`).
2. **Hugging Face Space** — https://huggingface.co → New → Space → **SDK: Docker** → Blank.
   This project's Space: `zonaet/qrcode-fishing`.
3. **Push the backend** to the Space (from the repo root):
   ```powershell
   git clone https://huggingface.co/spaces/zonaet/qrcode-fishing hf-space
   Copy-Item -Recurse -Force qr-code-fishing-backend\* hf-space\
   cd hf-space
   Remove-Item -Force .env, qr_phishing.db -ErrorAction SilentlyContinue
   git lfs track "*.keras"                 # model must go via Git LFS on HF
   git add .gitattributes
   git add .
   git commit -m "Deploy QR phishing API"
   git push                                # HF username + WRITE token as password
   ```
4. **Set secrets** on the Space → Settings → *Variables and secrets*:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Neon URL (`postgresql://...?sslmode=require`) |
   | `CORS_ORIGINS` | your frontend URL (or `*` while testing) |
5. Wait for the build, then verify:
   - `…hf.space/api/v1/health` → `{"status":"ok"}`
   - `…hf.space/api/v1/health/ready` → `{"database":true}`

### The files that make HF work (already in the backend folder)
- `Dockerfile` — installs `libzbar0` + deps, runs uvicorn on **port 7860** (HF's port)
- `README.md` — HF Space metadata (`sdk: docker`, `app_port: 7860`)
- `.dockerignore` — keeps the image small

### Updating the deployment (after the one-time setup)
From the repo root, after editing backend code or replacing the model files:
```powershell
.\deploy-backend.ps1 "describe the change"
```
This copies the backend into `hf-space/`, strips secrets, commits, and pushes —
Hugging Face then rebuilds automatically. **The API URL stays the same, so the web
and mobile apps need no changes** (unless you change the API request/response shape).

### 5.2 Web frontend → Vercel (free)

Deployed directly from local with the Vercel CLI (no GitHub required). Config lives in
`qr-code-fishing-frontend/vercel.json`.

```powershell
cd qr-code-fishing-frontend
vercel login                       # one time
vercel                             # first deploy: set up project, dir = ./
vercel env add NEXT_PUBLIC_API_URL # paste the HF URL; select Production/Preview/Development
vercel --prod                      # production deploy
```
- Set `NEXT_PUBLIC_API_URL=https://zonaet-qrcode-fishing.hf.space` in Vercel **before**
  the production deploy (env vars are baked in at build time).
- After it's live, set the backend's `CORS_ORIGINS` secret on Hugging Face to the
  Vercel URL (e.g. `https://qr-code-fishing.vercel.app`) so the browser is allowed.
- Re-deploy after changes: `vercel --prod` from `qr-code-fishing-frontend/`.

> Alternative: import the GitHub repo on vercel.com and set **Root Directory** to
> `qr-code-fishing-frontend` + the same env var (gives auto-deploy on push).

### 5.3 Mobile app (Expo)

The app reads `EXPO_PUBLIC_API_URL` (set it to the live HF URL in
`qr-code-fishing-mobile/.env`). For a shareable build use Expo EAS:
```bash
cd qr-code-fishing-mobile
npm install -g eas-cli
eas build --platform android --profile preview   # APK to share/install
```
For quick testing, `npx expo start` + Expo Go on your phone (the API is public, so any
network works).

---

## 6. Environment variables

| Where | Variable | Example |
|---|---|---|
| Backend | `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` |
| Backend | `CORS_ORIGINS` | `https://your-frontend.app` (comma-separated) |
| Backend | `MAX_UPLOAD_BYTES` | `5242880` |
| Web | `NEXT_PUBLIC_API_URL` | `https://zonaet-qrcode-fishing.hf.space` |
| Mobile | `EXPO_PUBLIC_API_URL` | `https://zonaet-qrcode-fishing.hf.space` |

`.env` files are local only and must **never** be committed/deployed (they hold secrets).
On Hugging Face, set these as Space *secrets/variables* instead.

---

## 7. The ML model

- **Trained in Colab:** `research/qr_phishing_url_training.ipynb` (trains a
  character-level model on a URL dataset, e.g. the Kaggle *Malicious URLs* dataset).
- **Inputs:** the decoded URL string (NOT the QR image pixels — those carry no
  phishing signal). URLs are normalized (strip scheme / `www.` / case) the same way
  in training and in `app/services/ml_service.py`.
- **Exports:** `phishing_url_model.keras` + `url_tokenizer.json` → place both in
  `qr-code-fishing-backend/app/models/ml/`, then redeploy.
- The model is the **primary** detector; URL heuristics and a trusted-domain
  allowlist add precision.

---

## 8. Notes & gotchas

- **Free Space sleeps** after ~48 h idle; the first request wakes it (~30 s cold
  start), then it's fast. **Neon** also auto-suspends and wakes on first query.
- The HF model file must be **Git LFS** (`*.keras`) — `git lfs track "*.keras"`.
- Keep `Dockerfile` port and HF `app_port` both at **7860**.
- Rotate the Neon password if it ever leaks; update the `DATABASE_URL` secret after.
