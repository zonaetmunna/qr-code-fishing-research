# How It Works — Complete Step‑by‑Step Flow

> Up‑to‑date explanation of the **current** system: a **4‑class deep‑learning** model
> (benign / phishing / malware / defacement) served by a FastAPI backend, with web + mobile
> apps. Supersedes the older `docs/01`–`docs/06` (an earlier image‑CNN / binary prototype).

---

## 0. The problem and the idea

Attackers hide a malicious link inside a QR code ("**Quishing**"). People scan it and land on a
fake login / payment / malware page. A QR code is just a **loss‑less encoding of text** — a safe
QR and a malicious QR look like the same black‑and‑white squares, so **the danger is the URL
inside, not the picture.** The system therefore **decodes the QR to its URL** and a
**machine‑learning model classifies the URL** into one of four classes; the app shows a
**safe / risky / dangerous** verdict with the threat type — and never opens the link.

```
QR image ──decode──▶ URL text ──ML model──▶ benign / phishing / malware / defacement
                                                   │
                                                   ▼
                                        safe / risky / dangerous (+ threat type)
```

---

# PART 1 — FULL END‑TO‑END FLOW (user tap → final response)

Every step from the moment the user acts to the moment they see a result.

### Step 1 — User acts (web or mobile app)
The user picks one of **three inputs**:
- **Camera** — takes a photo of the QR (Expo `expo-camera` / browser webcam).
- **Gallery / file** — picks an existing QR image.
- **Paste URL** — types/pastes a link directly (no image).

Frontend = **Next.js** (web, on Vercel) or **Expo / React Native** (mobile).

### Step 2 — App sends a request to the backend
- **Image** (camera/gallery) → `POST /api/v1/scan` as multipart `file` (the raw image bytes).
- **Pasted URL** → `POST /api/v1/scan-url` as JSON `{"url": "..."}`.

The app reads the backend URL from an env var (`EXPO_PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL`).

### Step 3 — Backend validates the input  · `app/api/routers/scan.py`
- Image: must be an `image/*` type and within the size limit (default 5 MB); rejects empty/too‑large.
- URL: must be non‑empty and within the max length.

### Step 4 — Decode the QR to text *(image path only)*  · `app/services/qr_decoder.py`
The image bytes are read with **OpenCV** (`cv2.imdecode` + NumPy) and decoded with **pyzbar**
(primary). If pyzbar finds nothing, **OpenCV `QRCodeDetector`** is the fallback. The decoded
**text payload** (e.g. a URL) is returned. *(For the `scan-url` endpoint this step is skipped — the
text is already provided.)*

### Step 5 — Detect the payload type  · `app/services/qr_payload.py`
`detect_payload_kind` classifies the text: **url / wifi / text / phone / email / sms / geo / other.**
Only **http(s) URLs** go through phishing analysis (`link_analysis_applied = true`). Other kinds
(e.g. Wi‑Fi) are parsed and shown safely — Wi‑Fi passwords are never stored.

### Step 6 — Heuristic checks (explanations, not the verdict)  · `app/services/phishing_analysis.py`
Fast rule checks produce **human‑readable warnings**: HTTP vs HTTPS, raw‑IP host, suspicious TLD
(`.tk`/`.cf`), the `@` credential trick, deep sub‑domains, URL shorteners, sensitive path words,
etc. These are shown as the "why", and serve as a transparent baseline — **the ML model makes the
actual decision.**

### Step 7 — ML preprocessing: build the two model inputs  · `app/services/ml_service.py`
The URL is **normalized** (drop `http(s)://`, drop `www.`, lowercase — identical to training), then:
- **(1) Character sequence** — each character → an integer id (from `url_tokenizer.json`'s
  `char_index`), padded to length 200.
- **(2) Brand‑similarity features** (4 numbers): `brand_or_subdomain`, `edit‑distance to nearest
  brand`, `near_miss (1–2 edits)`, `homoglyph`. Computed against the brand list in the tokenizer.

### Step 8 — Run the dual‑input model  · `phishing_url_model.keras`
Both inputs feed the network → **softmax over 4 classes**:
```
benign 0.01 | phishing 0.99 | malware 0.00 | defacement 0.00
```
The **highest probability (argmax)** is the predicted class + confidence.

### Step 9 — Decide the verdict  · `app/api/routers/scan.py`
```
(optional) reputation safety net          → off by default
elif host IS exactly a known brand/subdomain (is_known_brand)  → SAFE  (verified legitimate)
elif predicted class == benign            → SAFE
else (phishing / malware / defacement):
        confidence > 0.8  → DANGEROUS  (+ threat_type)
        else              → RISKY      (+ threat_type)
```
Result: a **tier** (safe / risky / dangerous), a **confidence %**, a **threat_type**, and the
indicator list (ML verdict + heuristic warnings).

### Step 10 — Save the scan  · `app/repositories/scan_repository.py`
The scan (decoded URL, verdict, confidence, indicators, timestamp) is stored in
**PostgreSQL (Neon)** — an audit trail / history.

### Step 11 — Return the JSON response
```json
{
  "scan_id": 117,
  "payload_kind": "url",
  "extracted_url": "https://paypa1.com",
  "classification": "dangerous",
  "confidence": 99.1,
  "threat_type": "phishing",
  "indicators": ["ML class: phishing (99.1%) — model verdict.", "..."],
  "link_analysis_applied": true,
  "created_at": "2026-06-22T19:42:00Z",
  "wifi": null
}
```

### Step 12 — App shows the result
The web/mobile app displays the colored **tier** (safe / risky / dangerous), the **threat type**,
the **confidence**, the **decoded URL**, and the **reasons** (indicators). The user decides whether
to open the link — the app never opens it for them.

```
USER (web/mobile)
  └─(1) scan camera / upload / paste URL
        └─(2) POST /api/v1/scan  or  /scan-url
              └─(3) validate
                    └─(4) decode QR → URL        [pyzbar / OpenCV]
                          └─(5) detect payload kind
                                └─(6) heuristic warnings
                                      └─(7) normalize + 2 inputs (chars + features)
                                            └─(8) dual-input model → 4 probabilities
                                                  └─(9) decide verdict + threat_type
                                                        └─(10) save to Neon Postgres
                                                              └─(11) JSON response
                                                                    └─(12) app shows result
```

---

# PART 2 — THE MACHINE‑LEARNING MODEL

## 2A. What the model is
A **supervised deep‑learning** classifier (deep learning = a branch of machine learning). It is a
**dual‑input neural network**:

```
(1) URL characters ─▶ Embedding ─▶ Conv1D (CNN) ─▶ Multi-Head Self-Attention (Transformer)
                                   ─▶ GlobalMaxPooling ─▶ Dense
                                                                       │
(2) brand-similarity features (4) ─▶ Dense(16) ────────────────────────┤
                                                                       ▼
                                            Concatenate ─▶ Dense ─▶ softmax (4 classes)
```
- **CNN (`Conv1D`)** — detects local character patterns (`.tk`, `/login`, `@`).
- **Transformer (self‑attention)** — weighs the important parts of the URL against each other
  (same family as BERT/ChatGPT), at character level.
- **Feature MLP** — learns from the brand‑similarity numbers.
- **Output** — one of `benign / phishing / malware / defacement`.

## 2B. How it is trained (Colab notebook `research/qr_phishing_url_training.ipynb`)
1. **Build the dataset (4 classes):** labelled URLs from the *Malicious URLs* dataset
   (benign / phishing / malware / defacement) **+ live feeds** (OpenPhish → phishing,
   URLhaus → malware, so the data is recent, not only 2021) **+** top global domains and
   university domains as benign.
2. **Attack augmentation** — synthesise typosquats, combosquats and subdomain‑abuse of real brands
   (labelled phishing) **+ hard‑negative benign** (real brands with `login`/`secure` paths and
   subdomains), so the model learns the boundary `paypal.com = safe` vs `paypa1.com = attack`.
   Local Bangladesh brands are seeded; a few throwaway brands are held out for the generalization test.
3. **Sample + split + class weights** — keep lots of data per class, split 70/15/15 (stratified),
   and use **class weights** to handle imbalance (no class ignored).
4. **Tokenize + features** — character ids (length 200) **and** the 4 brand‑similarity features.
5. **Train** the dual‑input network (Adam, `EarlyStopping`, fixed seed for reproducibility).
6. **Evaluate** on the unseen test set: accuracy, per‑class precision/recall/F1, 4×4 confusion
   matrix, ROC/AUC, confidence histogram, and a **safe‑vs‑threat** (false‑negative) view.
7. **Generalization test** — real‑world URLs + held‑out brand look‑alikes.
8. **Export** two files for the backend (below).

## 2C. The two deployed files (how inference works)
| File | Role |
|---|---|
| **`phishing_url_model.keras`** | the trained network (architecture + weights) — the "brain" |
| **`url_tokenizer.json`** | `char_index` (char→id), `maxlen`, `classes` (output order), `brands` (for the features) — the "translator" |

At startup `ml_service.load_model()` loads both. For each URL it uses `char_index`+`maxlen` to build
input 1, `brands` to build input 2, runs the `.keras` model, and maps the argmax index back to a
class name via `classes`. **Both files must come from the same training run** — the backend's
`normalize_url` and `sim_features` are byte‑for‑byte identical to the notebook, or predictions break.

---

# PART 3 — THE BACKEND

**Tech:** FastAPI (Python) · SQLAlchemy + PostgreSQL (Neon) · TensorFlow (the model) ·
pyzbar + OpenCV (QR decode). Deployed on **Hugging Face Spaces** (Docker).

## What each file does
| File | Role |
|---|---|
| `app/main.py` | starts FastAPI; on startup loads the ML model + creates DB tables |
| `app/api/routers/scan.py` | the endpoints + the verdict/decision logic |
| `app/services/qr_decoder.py` | decodes the QR image to text (pyzbar → OpenCV fallback) |
| `app/services/qr_payload.py` | classifies the payload (url/wifi/text…); redacts Wi‑Fi passwords |
| `app/services/phishing_analysis.py` + `phishing_helpers.py` | URL heuristics (explanations) |
| `app/services/ml_service.py` | loads model + tokenizer; `sim_features`, `predict_url_full`, `is_known_brand` |
| `app/repositories/scan_repository.py` | saves each scan to the database |
| `app/models/scan.py` + `app/schemas/scan.py` | DB table + API request/response shapes |
| `app/core/config.py` | settings from env (DATABASE_URL, CORS_ORIGINS, use_reputation_safety_net) |

## API endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | service alive |
| GET | `/api/v1/health/ready` | database reachable |
| POST | `/api/v1/scan` | analyze a QR **image** (multipart `file`) |
| POST | `/api/v1/scan-url` | analyze a **URL/text** (`{"url": "..."}`) |
| GET | `/docs` | interactive API docs |

## Deployment
- **Backend** → Hugging Face Docker Space (`hf-space/` is the Space's git repo; push there to deploy).
  The two model files ship inside the image (`COPY app ./app`).
- **Web frontend** → Vercel. **Mobile** → Expo (EAS build).
- DB → Neon Postgres. The app's API URL is set per environment.

---

# PART 4 — LIKELY TEACHER QUESTIONS

**Q: Is this machine learning?** Yes — it's **deep learning** (a neural network: CNN + Transformer
+ MLP), which is a branch of machine learning. It **learns its weights from labelled data** via
gradient descent — supervised ML.

**Q: Why analyze the URL, not the QR image?** A QR is a loss‑less encoding of text; two QRs look
identical. The phishing signal is in the **URL**, so we decode it and analyze the text.

**Q: Why a CNN *and* a Transformer?** The `Conv1D` (CNN) catches local patterns; the self‑attention
(Transformer) weighs the whole URL. The combo is the modern standard for URL/text classification.

**Q: What are the brand‑similarity features for?** A character model can't reliably separate
`facebook.com` from `facebookk.com`. The features (edit‑distance, exact/subdomain match, homoglyph)
give the model the brand‑relationship signal it needs — they're **learned inputs**, not rules.

**Q: Why is there a brand‑match safeguard / does that mean it's not ML?** Detection is **100% ML**.
The safeguard only confirms a host that *is exactly* a known brand/subdomain (a verifiable fact) as
safe — it never *detects* a threat. Every real product (Google Safe Browsing, Microsoft SmartScreen)
combines ML with such reputation signals.

**Q: How do you know it works?** Accuracy, per‑class precision/recall/F1, confusion matrix, ROC/AUC,
and a held‑out generalization test in the notebook (Sections 6–7).

**Q: Limitations?** URL‑only (can't see a shortener's destination, page content, or a brand‑new
unknown domain); malware/defacement generalize less than phishing; needs retraining to add brands.
Future work: similarity/metric‑learning (Siamese) model, threat‑intel feeds, page‑content analysis.
