# How It Works — ML & Backend (Step by Step)

> This is the up-to-date explanation of the **current** system (URL-based ML model +
> FastAPI backend). It supersedes the older `docs/01`–`docs/06`, which describe an earlier
> image-CNN prototype that is no longer used.

---

## 0. The problem and the idea (1 paragraph)

Attackers hide a **phishing link inside a QR code** ("Quishing"). People scan it and land
on a fake login/payment page. A QR code is just a **loss-less encoding of text**, so a safe
QR and a phishing QR look like the same black-and-white squares — **the danger is the URL
inside, not the picture.** Therefore the system **decodes the QR to its URL** and a
**machine-learning model classifies the URL** as `safe`, `risky`, or `dangerous`.

```
QR image ──decode──▶ URL text ──ML model──▶ P(phishing) 0..1 ──▶ safe / risky / dangerous
```

---

# PART 1 — THE MACHINE LEARNING (step by step)

The ML has two phases: **(A) Training** (done once in Google Colab) and
**(B) Detection** (runs in the backend for every scan).

## A. Training the model (Colab notebook `research/qr_phishing_url_training.ipynb`)

### Step 1 — Collect the data
The model learns from labelled example URLs:
- **Phishing URLs** (label `1`) — from the public *Malicious URLs* dataset.
- **Legitimate URLs** (label `0`) — three sources combined for worldwide coverage:
  1. benign URLs from the dataset (full URLs with paths),
  2. ~40,000 **top global domains** (popular sites worldwide),
  3. ~10,000 **university domains worldwide** (so it learns the `.edu` / `.edu.bd` / `.ac.*`
     pattern and trusts schools/universities on its own).

### Step 2 — Balance the classes
Take an **equal number** of safe and phishing URLs so the model can't cheat on class size.

### Step 3 — Split the data
70% **train** (learn), 15% **validation** (tune), 15% **test** (final unbiased score).

### Step 4 — Normalize each URL
Strip formatting noise so the model focuses on real content. The **same** function runs in
training and in the backend, so they match exactly:
```
https://www.Google.com/Login  →  google.com/login   (drop scheme, drop www., lowercase)
```

### Step 5 — Turn the URL into numbers (tokenize)
Computers need numbers, not letters. Each **character** becomes an id, padded to length 200:
```
"evil.tk/login"  →  [12, 25, 19, 14, 7, 30, 14, ...]   (saved as url_tokenizer.json)
```

### Step 6 — Build the neural network (the "brain")
A modern **Transformer** (attention-based — same family as ChatGPT/BERT):
```
Input(200) → Embedding → Conv1D ×2 → Multi-Head Self-Attention → GlobalMaxPooling
           → Dense(64) → Dropout → Dense(1, sigmoid → 0..1)
```
- **Embedding** = a learned vector for each character.
- **Conv1D** = detects local patterns (`.tk`, `/login`, `@`).
- **Self-Attention** = weighs the important parts of the URL against each other.
- **Sigmoid output** = a probability from 0.0 (safe) to 1.0 (phishing).

### Step 7 — Train (the learning loop)
Repeat over all examples, ~15 times (each pass = one *epoch*):
1. Model **reads** a URL → **guesses** a score.
2. Compare to the true label → the gap is the **loss** (binary cross-entropy).
3. The optimizer (**Adam**) **adjusts** the model's internal numbers to reduce the loss.
4. Repeat. `EarlyStopping` keeps the best version.

> Nobody writes rules. The model **discovers the phishing patterns itself** from the examples.

### Step 8 — Evaluate
On the **test set it never saw**, measure **accuracy, precision, recall, F1** and a
**confusion matrix**. A *generalization test* also checks brand-new real URLs.

### Step 9 — Export
Two files are saved and copied into the backend:
- `phishing_url_model.keras` — the trained brain
- `url_tokenizer.json` — the character→number map

## B. Detection (every scan, in the backend `app/services/ml_service.py`)
```
new URL → normalize (same as training) → tokenize → model.predict → score 0..1
```
Then the score becomes a verdict:
| ML score | Verdict |
|---|---|
| > 0.8 | DANGEROUS |
| > 0.5 | RISKY |
| ≤ 0.5 | SAFE |

## C. What the model actually learns (the detection logic)
Statistical patterns that separate phishing from safe, e.g.:
- suspicious TLDs: `.tk`, `.cf`, `.ga`, `.xyz`
- sensitive path words: `login`, `verify`, `secure`, `update`, `password`
- raw IP hosts, the `@` credential trick, many sub-domains, look-alike brands (`paypa1`, `amaz0n`)
- vs. the clean shape of real, well-known domains

## D. The safety layer (why it's a hybrid)
No ML model is 100% perfect — it occasionally mis-scores a *rare unseen* legitimate site.
So, like real products (Google Safe Browsing), two **reputation signals** add precision:
1. **Trusted-domain allowlist** — famous brands (google, github, amazon…) are never overridden.
2. **Restricted-TLD rule** — `.edu`, `.gov`, `.ac.*` can't be registered by attackers, so they're trusted.

These signals **only mark known-good sites as safe — they never detect phishing.**
**All phishing detection is done by the ML model.**

---

# PART 2 — THE BACKEND (step by step)

**Tech:** FastAPI (Python), SQLAlchemy + PostgreSQL (Neon), TensorFlow (the model), pyzbar/OpenCV
(QR decode). Deployed on Hugging Face Spaces (Docker).

## Request flow for a scan

```
            ┌──────────────── POST /api/v1/scan  (QR image)
Client ─────┤
            └──────────────── POST /api/v1/scan-url  (URL text directly)
                                   │
                                   ▼
   1. Validate input (image type / size, or non-empty URL)
                                   │
              (image path only) ▼
   2. Decode QR → URL text        │   app/services/qr_decoder.py  (pyzbar → OpenCV fallback)
                                   ▼
   3. Detect payload kind         │   app/services/qr_payload.py  (url / wifi / text / phone / …)
                                   ▼
   4. URL heuristics (warnings)   │   app/services/phishing_analysis.py
                                   ▼
   5. ML model → P(phishing)      │   app/services/ml_service.py  (predict_url)
                                   ▼
   6. Decide verdict (ML-primary) │   app/api/routers/scan.py
        + trusted-domain / TLD safety net
                                   ▼
   7. Save the scan to PostgreSQL │   app/repositories/scan_repository.py  (Neon)
                                   ▼
   8. Return JSON  →  classification, confidence, ML score, indicators, decoded payload
```

## What each backend file does
| File | Role |
|---|---|
| `app/main.py` | Starts FastAPI; on startup loads the ML model + creates DB tables |
| `app/api/routers/scan.py` | The endpoints + the decision/fusion logic |
| `app/services/qr_decoder.py` | Decodes the QR image to text (pyzbar, OpenCV fallback) |
| `app/services/qr_payload.py` | Classifies payload (url/wifi/text…); Wi-Fi passwords never stored |
| `app/services/phishing_analysis.py` + `phishing_helpers.py` | URL heuristics + trusted-domain / TLD signals |
| `app/services/ml_service.py` | Loads the model + tokenizer; `predict_url()` |
| `app/repositories/scan_repository.py` | Saves each scan to the database |
| `app/models/scan.py` + `app/schemas/scan.py` | DB table + API request/response shapes |
| `app/core/config.py` | Reads settings from env vars (DATABASE_URL, CORS_ORIGINS) |

## API endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Is the service alive |
| GET | `/api/v1/health/ready` | Is the database reachable |
| POST | `/api/v1/scan` | Analyze a QR **image** (multipart `file`) |
| POST | `/api/v1/scan-url` | Analyze a **URL/text** (`{"url": "..."}`) |
| GET | `/docs` | Interactive API docs |

## What the response looks like
```json
{
  "scan_id": 42,
  "payload_kind": "url",
  "extracted_url": "http://apple-id-verify.cf/login",
  "classification": "dangerous",
  "confidence": 96.7,
  "indicators": [
    "ML URL risk score: 96.7% (primary verdict).",
    "Uses HTTP instead of HTTPS (no transport encryption).",
    "TLD '.cf' is frequently abused in phishing campaigns."
  ],
  "link_analysis_applied": true
}
```

## The database (why it's there)
Every scan is stored in PostgreSQL (Neon) — decoded URL, verdict, confidence, indicators,
timestamp. This gives an **audit trail / history** and is where future analytics would come from.

---

# PART 3 — FULL END-TO-END FLOW

```
User → Web (Vercel) / Mobile (Expo)
   │   scans QR (camera / upload)  OR  pastes a URL
   ▼
FastAPI backend (Hugging Face Spaces)
   1. decode QR → URL
   2. ML model scores the URL (0..1)        ← the intelligence
   3. + reputation signals for precision
   4. save to Neon Postgres
   ▼
JSON → app shows: SAFE / RISKY / DANGEROUS + ML score + reasons
   ▼
User decides whether to open the link
```

- **Frontend (web):** Next.js on Vercel. Three input methods: upload, camera, paste URL.
- **Mobile:** Expo / React Native. Same three methods.
- **Backend:** FastAPI + TensorFlow + Neon on Hugging Face Spaces.

---

# PART 4 — LIKELY TEACHER QUESTIONS (with answers)

**Q: Why analyze the URL and not the QR image?**
A QR is a loss-less encoding of text; two QRs look identical. The phishing signal is in the
URL, not the pixels. So we decode the QR and analyze the URL — that's where detection is possible.

**Q: What ML model is it and why?**
A character-level **Transformer** (self-attention) — the modern standard for URL/text
classification (same family as BERT/ChatGPT). It reads the raw URL and learns phishing patterns.

**Q: How does it "learn" without rules?**
Supervised learning: it sees ~80,000 labelled URLs and adjusts itself (loss → optimizer) until
it can separate phishing from safe. It discovers patterns (TLDs, keywords, IPs, `@`) on its own.

**Q: How do you measure it works?**
Accuracy, precision, recall, F1 and a confusion matrix on a held-out test set, plus a
generalization test on brand-new URLs (Section 6 & 7 of the notebook).

**Q: Why is there a trusted list / TLD rule — isn't it supposed to be ML?**
The **detection is 100% ML**. Those signals only prevent false alarms on known-good sites
(famous brands, `.edu`/`.gov`). Every real security product (Google, Microsoft) combines ML
with such reputation signals — pure ML alone is never 100% on every unseen legit site.

**Q: What are the limitations?**
The model can occasionally misjudge a very rare/new legitimate site (mitigated by the
reputation layer), and it depends on training-data quality. Future work: more diverse data,
explicit lexical features, threat-intel feeds.

**Q: What's the tech stack?**
Next.js (web) + Expo (mobile) → FastAPI + TensorFlow + PostgreSQL/Neon (backend),
deployed on Vercel + Hugging Face Spaces. QR decode via pyzbar/OpenCV.
