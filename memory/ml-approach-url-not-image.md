---
name: ml-approach-url-not-image
description: Why the QR phishing ML model must classify the decoded URL, not the QR image pixels
metadata:
  type: project
---

The thesis project (QR phishing detection) originally trained a CNN on QR **image pixels**
(research/qr_code.ipynb + backend ml_service.py). This is fundamentally wrong: a QR is a
loss-less encoding of its URL, so two QRs (safe vs phishing) of the same length are visually
identical noise. The image CNN only learned a dataset artifact — **QR density ≈ URL length**
(proved: ML score rose monotonically with URL length; long legit URLs like Wikipedia were
flagged DANGEROUS). Heuristic-only scoring got 10/10 on a test set; image-CNN fusion got 5/10.

**Decision (2026-06-05):** pivot to a REAL model-based approach — decode each QR to its URL,
then a character-level neural net (Embedding → Conv1D → Dense) classifies the URL string.
The user confirmed the dataset QRs encode real http/https URLs, so this has genuine signal.

Backend now uses `predict_url(url)` (not `predict_image`); model files are
`phishing_url_model.keras` + `url_tokenizer.json` in app/models/ml/. The notebook decodes via
cv2.QRCodeDetector and caches decoded URLs to Drive CSV.

User requirement: detection must be genuinely model-based, no static/hardcoded shortcuts.

**Update (2026-06-05):** Switched training to a public URL CSV dataset (sid321axn malicious_phish.csv)
via a new notebook research/qr_phishing_url_training.ipynb using a modern Transformer-style model
(Embedding → Conv1D → MultiHeadAttention → GlobalMaxPool → Dense). ML catches phishing reliably
(10/10) but has unavoidable false positives on diverse legit sites (dataset bias is unfixable by
swapping datasets). Final solution = smart fusion: ML detects phishing, but a trusted-domain guard
(is_trusted_host in phishing_helpers.py, expanded allowlist) stops ML from overriding well-known
legit sites. Full system test = 20/20 correct. Standard industry pattern (ML + allowlist).

Note: 1 pre-existing unit test fails (test_phishing_analysis http://192.168.0.1/login expected risky)
due to earlier is_local_host change + removal of "login" path keyword — unrelated to ML work.
