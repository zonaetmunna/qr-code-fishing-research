# Deploy the backend to Hugging Face Spaces (free) + Neon Postgres

This deploys the FastAPI + TensorFlow backend to a free Hugging Face **Docker Space**
(16 GB RAM — fits TensorFlow) using a free **Neon** Postgres database.

Files already prepared in this folder:
- `Dockerfile` — installs `libzbar0` (pyzbar) + deps, runs uvicorn on **port 7860**
- `README.md` — Hugging Face Space metadata (`sdk: docker`, `app_port: 7860`)
- `.dockerignore` — keeps the image small (but **includes** the ML model)

---

## Step 1 — Create the Neon database (you said you have the URL)
From the Neon dashboard, copy the connection string. It looks like:
```
postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require
```
Keep it for Step 4.

## Step 2 — Create the Hugging Face Space
1. Sign in at https://huggingface.co
2. **New → Space**
3. Owner: you · Space name: e.g. `qr-phishing-api`
4. **SDK: Docker** → **Blank** template
5. Visibility: Public (free) · Create Space

## Step 3 — Push the backend code to the Space
In a terminal, from the repo root:

```bash
# 1. Clone the empty Space (use your username/space name)
git clone https://huggingface.co/spaces/YOUR_USERNAME/qr-phishing-api hf-space

# 2. Copy the backend contents into it
#    (Windows PowerShell: Copy-Item -Recurse qr-code-fishing-backend\* hf-space\)
cp -r qr-code-fishing-backend/* hf-space/

cd hf-space

# 3. IMPORTANT: the model is *.keras which is normally gitignored.
#    Make sure it is added (force-add to be safe):
git add -f app/models/ml/phishing_url_model.keras app/models/ml/url_tokenizer.json
git add .

# 4. Confirm the model file is staged:
git status        # you must see app/models/ml/phishing_url_model.keras

git commit -m "Deploy QR phishing API"
git push
```
You'll be asked for your Hugging Face username + an **access token** (create one at
https://huggingface.co/settings/tokens with *write* role; use it as the password).

## Step 4 — Set environment variables (Space → Settings → Variables and secrets)
Add these (as **Secrets** for the DB, **Variables** for the rest):

| Name | Value |
|---|---|
| `DATABASE_URL` | your Neon URL from Step 1 |
| `CORS_ORIGINS` | your frontend URL(s), comma-separated, e.g. `https://your-frontend.vercel.app` (use `*` only for quick testing) |
| `MAX_UPLOAD_BYTES` | `5242880` (optional) |

The Space rebuilds automatically when you save.

## Step 5 — Wait for the build, then test
Build takes a few minutes (TensorFlow is large). When it shows **Running**, your API is at:
```
https://YOUR_USERNAME-qr-phishing-api.hf.space
```
Test it:
- Open `…hf.space/docs` (interactive API docs)
- `…hf.space/api/v1/health` → `{"status":"ok",...}`
- `…hf.space/api/v1/health/ready` → `{"database":true}` (confirms Neon is connected)

## Step 6 — Point your apps at the deployed API
- **Web** (`qr-code-fishing-frontend/.env`):
  `NEXT_PUBLIC_API_URL=https://YOUR_USERNAME-qr-phishing-api.hf.space`
- **Mobile** (`qr-code-fishing-mobile/.env`):
  `EXPO_PUBLIC_API_URL=https://YOUR_USERNAME-qr-phishing-api.hf.space`

---

## Notes
- **Free Space sleeps** after ~48 h idle; the first request wakes it (~30 s cold start), then it's fast.
- **Neon free** also auto-suspends; the first query wakes it (`pool_pre_ping` handles stale connections).
- If `health/ready` returns 503, re-check `DATABASE_URL` (must include `?sslmode=require`).
- If the model didn't deploy (ML skipped in logs), confirm `app/models/ml/phishing_url_model.keras`
  was committed to the Space (Step 3.3).
