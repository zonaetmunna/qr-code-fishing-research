import axios from 'axios';

// Mirrors the FastAPI ScanResponse contract — see
// qr-code-fishing-backend/app/schemas/scan.py and the web client
// qr-code-fishing-frontend/lib/scan-api.ts. Keep these in sync.

export type Classification = 'safe' | 'risky' | 'dangerous';

export type PayloadKind =
  | 'url'
  | 'wifi'
  | 'text'
  | 'phone'
  | 'email'
  | 'sms'
  | 'geo'
  | 'other';

export type WifiPayloadInfo = {
  ssid: string;
  security: string;
  hidden: boolean;
  password_redacted: boolean;
};

export type ScanResult = {
  scan_id: number;
  payload_kind: PayloadKind;
  extracted_url: string;
  classification: Classification;
  confidence: number;
  indicators: string[];
  created_at: string;
  wifi: WifiPayloadInfo | null;
  link_analysis_applied: boolean;
  /** Specific threat class when not safe: "phishing" | "malware" | "defacement" | null. */
  threat_type: string | null;
};

// On a phone, `localhost` is the device itself — set EXPO_PUBLIC_API_URL to the
// dev machine's LAN IP (e.g. http://192.168.1.5:8000). The Android emulator can
// reach the host via http://10.0.2.2:8000. See .env.example.
const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

const client = axios.create({
  baseURL,
  timeout: 60_000,
});

/** The base URL the client is talking to — handy for debugging connectivity. */
export const apiBaseURL = baseURL;

/** Turn a failed scan request into a short user-facing message. */
export function formatScanError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : 'Unknown error';
  }
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return (
      detail
        .map((d: { msg?: string }) => d.msg ?? '')
        .join(' ')
        .trim() || err.message
    );
  }
  if (err.code === 'ERR_NETWORK') {
    return `Could not reach the API at ${baseURL}. Is the backend running and reachable from this device?`;
  }
  return err.message || 'Request failed';
}

// React Native's FormData accepts a `{ uri, name, type }` descriptor where the
// web uses a File object — this is the one real difference from the web client.
type ImageAsset = {
  uri: string;
  /** MIME type, e.g. "image/jpeg". Defaults to image/jpeg when omitted. */
  mimeType?: string | null;
  /** Original file name, if known. */
  fileName?: string | null;
};

/** POST a QR image (camera capture or gallery pick) and return the analysis. */
export async function scanQrImage(asset: ImageAsset): Promise<ScanResult> {
  const type = asset.mimeType ?? 'image/jpeg';
  const name = asset.fileName ?? `qr.${type.split('/')[1] ?? 'jpg'}`;
  const body = new FormData();
  // The `as any` is required: RN's FormData typing doesn't model the file
  // descriptor object, but the runtime expects exactly this shape.
  body.append('file', { uri: asset.uri, name, type } as any);
  const { data } = await client.post<ScanResult>('/api/v1/scan', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** POST a URL/text typed directly (no QR image) and return the analysis. */
export async function scanUrl(url: string): Promise<ScanResult> {
  const { data } = await client.post<ScanResult>('/api/v1/scan-url', { url });
  return data;
}

/** Human-readable payload kind for UI badges. */
export function formatPayloadKind(kind: PayloadKind): string {
  const labels: Record<PayloadKind, string> = {
    url: 'Web link',
    wifi: 'Wi‑Fi',
    text: 'Plain text',
    phone: 'Phone',
    email: 'Email',
    sms: 'SMS',
    geo: 'Location',
    other: 'Other',
  };
  return labels[kind] ?? kind;
}
