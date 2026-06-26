# Development & maintenance commands

> **Research project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

Reference for **QR Code Phishing Detection**: backend (FastAPI), frontend (Next.js), and database (PostgreSQL or SQLite).

Paths below assume the repo root:

`D:\Skills\PERSONAL-PROEJECT\research-project\qr-code-fishing`

Adjust if your clone lives elsewhere.

---

## Prerequisites

- **Python 3.11+** (3.13 works) with `pip`
- **Node.js** + **npm** (for the Next.js app)
- **PostgreSQL** (local install or Docker), *or* use **SQLite** for quick local API runs
- **Git** (optional, for version control)

On Windows, the Python launcher is often `py -3` instead of `python`.

---

## Environment files

| Location | Purpose |
|----------|---------|
| `qr-code-fishing-backend/.env` | API + database URL (do **not** commit real secrets) |
| `qr-code-fishing-backend/.env.example` | Template — copy to `.env` and edit |
| `qr-code-fishing-frontend/.env.local` | Optional; copy from `.env.example` |
| `qr-code-fishing-frontend/.env.example` | `NEXT_PUBLIC_API_URL` for the browser |

**Create backend env (first time):**

```powershell
Copy-Item "backend\.env.example" "backend\.env"
# Edit backend\.env: DATABASE_URL, CORS_ORIGINS, etc.
```

**Frontend API URL (first time):**

```powershell
Copy-Item "qr-code-fishing-frontend\.env.example" "qr-code-fishing-frontend\.env.local"
# Set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 (or your API host)
```

---

## Database (PostgreSQL via Docker)

From the **repo root**:

```powershell
docker compose up -d
```

Stop:

```powershell
docker compose down
```

Default stack (see `docker-compose.yml`): Postgres on port **5432**, database name **`qr_phishing`**, user **`postgres`** / password **`postgres`** — override in `qr-code-fishing-backend/.env` `DATABASE_URL` if you change credentials.

**SQLite (no Postgres):** set in `qr-code-fishing-backend/.env`:

```env
DATABASE_URL=sqlite:///./qr_phishing.db
```

---

## Backend (FastAPI)

Working directory: **`backend`**

### Install dependencies

```powershell
Set-Location "backend"
py -3 -m pip install -r requirements.txt
```

(Linux/macOS: `python3 -m pip install -r requirements.txt`)

### Run API (development, auto-reload)

```powershell
Set-Location "backend"
py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000  
- OpenAPI docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/api/v1/health  

### Run tests

```powershell
Set-Location "backend"
py -3 -m pytest tests -v
```

### Upgrade pip (optional)

```powershell
py -3 -m pip install --upgrade pip
```

---

## Frontend (Next.js)

Working directory: **`qr-code-fishing-frontend`**

### Install dependencies

```powershell
Set-Location "qr-code-fishing-frontend"
npm install
```

### Development server

```powershell
Set-Location "qr-code-fishing-frontend"
npm run dev
```

Default app: http://localhost:3000  

Ensure `NEXT_PUBLIC_API_URL` matches your API (e.g. `http://127.0.0.1:8000`).

### Production build

```powershell
Set-Location "qr-code-fishing-frontend"
npm run build
npm run start
```

### Quality checks

```powershell
Set-Location "qr-code-fishing-frontend"
npm run lint
npm run typecheck
npm run format
npm run test
```

---

## Mobile (Expo)

Working directory: **`qr-code-fishing-mobile`**

Native iOS/Android app (Expo SDK 56 + Expo Router + NativeWind). It uploads a QR
photo to the same backend `POST /api/v1/scan` — no backend changes.

> ⚠️ Uses native modules (camera, reanimated), so it runs in a **custom dev
> client** via `expo run:*`, **not** Expo Go.

### Install dependencies

```powershell
Set-Location "qr-code-fishing-mobile"
npm install
Copy-Item .env.example .env
# Set EXPO_PUBLIC_API_URL so the device can reach the API (see below).
```

### Point the app at the backend

On a phone, `localhost` is the phone itself. Set `EXPO_PUBLIC_API_URL` in
`qr-code-fishing-mobile\.env`:

| Target            | Value                              |
|-------------------|------------------------------------|
| Physical device   | `http://<dev-machine-LAN-IP>:8000` |
| Android emulator  | `http://10.0.2.2:8000`             |
| iOS simulator     | `http://localhost:8000`            |

And run the backend bound to all interfaces so the device can reach it:

```powershell
Set-Location "qr-code-fishing-backend"
py -3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Run the app

```powershell
Set-Location "qr-code-fishing-mobile"
npx expo run:android   # or: npx expo run:ios (macOS only)
```

After the first native build, `npm start` reloads JS over the dev client.

### Quality checks

```powershell
Set-Location "qr-code-fishing-mobile"
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

---

## Typical full-stack dev session

1. Start Postgres (Docker) **or** point `DATABASE_URL` to your Postgres / SQLite.  
2. Terminal A — backend:

   ```powershell
   Set-Location "backend"
   py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

3. Terminal B — frontend:

   ```powershell
   Set-Location "qr-code-fishing-frontend"
   npm run dev
   ```

4. Open http://localhost:3000 and exercise upload + scan.

---

## Maintenance snippets

### Backend: reinstall deps after `requirements.txt` changes

```powershell
Set-Location "backend"
py -3 -m pip install -r requirements.txt
```

### Frontend: clean install

```powershell
Set-Location "qr-code-fishing-frontend"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

(Linux/macOS: delete `node_modules` and lockfile manually, then `npm install`.)

### Check API responds

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/health" -UseBasicParsing
```

Or open the health URL in a browser.

---

## Security notes

- Never commit `qr-code-fishing-backend/.env` or real passwords.  
- Use `.env.example` for placeholders only.  
- Rotate credentials if they were ever committed or shared.
