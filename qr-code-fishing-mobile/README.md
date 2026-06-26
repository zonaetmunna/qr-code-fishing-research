# QR Code Phishing Detection — Mobile (Expo)

> **Research project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

Native iOS/Android app for the QR Code Phishing Detection project. Capture a QR
code with the camera (or pick a photo), upload it to the FastAPI backend, and
see a plain-language **safe / risky / dangerous** verdict — the same analysis
the web app provides.

- **Expo SDK 56** · Expo Router (file-based) · React Native 0.85 · React 19
- **NativeWind v4** (Tailwind CSS for React Native) for styling
- **expo-camera** + **expo-image-picker** to capture/pick the QR image
- Talks to the existing backend `POST /api/v1/scan` — **no backend changes**

The backend decodes the QR, runs phishing heuristics, **and** runs an ML visual
model on the image bytes, so the app uploads the actual photo rather than a
locally-decoded string.

## Prerequisites

- Node.js + npm
- The backend running and reachable (see repo root [`DEVELOPMENT.md`](../DEVELOPMENT.md))
- For device/emulator builds: Android Studio (Android) or Xcode (iOS, macOS only)

> ⚠️ This app uses native modules (camera, NativeWind/reanimated), so it runs in
> a **custom dev client** via `expo run:*` — **not** Expo Go.

## Setup

```powershell
npm install
Copy-Item .env.example .env   # then edit EXPO_PUBLIC_API_URL (see notes in the file)
```

`EXPO_PUBLIC_API_URL` must point at the backend in a way the device can reach:

| Target            | Value                              |
| ----------------- | ---------------------------------- |
| Physical device   | `http://<dev-machine-LAN-IP>:8000` |
| Android emulator  | `http://10.0.2.2:8000`             |
| iOS simulator     | `http://localhost:8000`            |

Start the backend bound to all interfaces so a device can reach it:

```powershell
Set-Location ..\qr-code-fishing-backend
py -3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Run

```powershell
npx expo run:android   # build + launch the custom dev client on Android
npx expo run:ios       # macOS only
```

After the first native build, `npm start` reloads JS over the dev client.

## Quality checks

```powershell
npx tsc --noEmit       # type check
npx expo lint          # lint
npx expo-doctor        # dependency / config sanity
```

## Project structure

```text
src/
  app/
    _layout.tsx          # root: theme provider + native tabs
    index.tsx            # Scan tab — camera / gallery -> upload -> result
    explore.tsx          # About tab — how it works
  components/
    qr-camera.tsx        # full-screen camera capture modal
    scan-result-card.tsx # renders a ScanResult
    ui/                  # NativeWindUI-style primitives (Button, Text, Card, Badge)
  lib/
    scan-api.ts          # API client + types (mirrors the web client + backend schema)
    classification-styles.ts # tier -> label + NativeWind classes
    utils.ts             # cn()
```
