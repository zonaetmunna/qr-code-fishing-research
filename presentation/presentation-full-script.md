# Presentation — Full Speaker Script & Notes

> **Research project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

This is the **complete spoken content** behind `thesis-presentation.pptx` (25 slides,
organized into four sections). The slides are deliberately concise — everything you
should *say*, every number you must defend, and the likely examiner questions are
written out here. Read it as your script.

**Structure of the deck**
1. Title · 2. Outline
**Section 01 — Background & the Problem:** 3. The threat · 4. The gap · 5. Research question & objectives · 6. Related work
**Section 02 — Approach & Design:** 7. Core idea · 8. Methodology · 9. Dataset · 10. Features · 11. Model · 12. System
**Section 03 — Results & Findings:** 13. Headline results · 14. Per-class metrics · 15. Generalization · 16. Ablation · 17. Demonstration
**Section 04 — Discussion & Conclusion:** 18. Contributions · 19. Limitations & future work · 20. Conclusion · 21. Thank you

⏱️ **Timing:** aim for ~15–18 minutes — roughly 40–50 seconds per content slide; pause
on the section dividers; spend extra time on **Slide 16 (Ablation)** — it is the
intellectual heart of the defense.

---

## Slide 1 — Title
**Say:** "Good morning. My thesis is *An Explainable QR Code Analysis for Detecting
Phishing and Malicious URLs Using Machine Learning*. I'll cover why QR-code phishing is
a growing problem, the machine-learning system we built, how well it performs, and — most
importantly — an honest account of *what* drives that performance."

## Slide 2 — Outline
**Say:** "The talk has four parts: the background and problem; our approach — data,
features, and model; the results, including a generalization test and an ablation study;
and finally our contributions, limitations, and conclusions."

---
## ▸ Section 01 divider — Background & the Problem
**Say (while the divider is up):** "Let me start with the problem and the research
question."

## Slide 3 — The threat
**Say:** "QR codes are everywhere — payments, menus, transit, banking, advertising. The
key fact is that **a QR code is just a lossless visual encoding of text**: a safe code
and a malicious code are visually identical patterns of squares, and you can't see the
URL before you scan. Attackers exploit this with **'quishing'** — hiding phishing,
malware, or defacement URLs inside ordinary-looking codes. Security surveys by Vidas and
Krombholz confirm it's a real, under-defended attack surface."
*Land this line:* the human eye cannot distinguish a safe QR from a dangerous one.

## Slide 4 — The gap
**Say:** "The problem is that today's scanners just decode and open the link, with **no
security check**. Our central insight: the danger is in the **decoded URL, not the
image**. So we treat this as URL-text classification, not image classification — more
direct, more data-efficient, and not fooled by appearance. And the verdict has to be
**explainable**, so a non-technical user can trust it."

## Slide 5 — Research question & objectives
**Say:** "That leads to our research question, on screen: *can a machine-learning model
reliably and explainably classify the URL inside a QR code into benign, phishing,
malware, or defacement — and generalize to brand-impersonation attacks it has never
seen?* Our objectives followed directly: a novel explainable model; **four classes**
mapped to Safe/Risky/Dangerous; validation on a held-out set **and** on unseen brand
attacks; and a human-readable explanation for every prediction."

## Slide 6 — Related work
**Say:** "Positioning the work: URL-based ML like Aljofey's character-CNN and Yang's
ensemble reaches 95–99%, but on web/email URLs, not QR. Explainable-AI work — Shafin,
Mohi — uses SHAP/LIME on features. QR-specific studies are mostly image-based and binary.
So the gaps we target are: few QR-specific detectors; mostly binary not multi-class;
limited explainability; and almost no **held-out brand generalization test** — which is
how you prove a model learned a pattern instead of a list."

---
## ▸ Section 02 divider — Approach & Design
**Say:** "Now, how we built it."

## Slide 7 — Core idea
**Say:** "The most important design decision: **classify the URL text, not the QR image**.
A QR code carries no danger of its own — it just encodes a URL. Learning malice from the
image is indirect and data-hungry; learning it from the decoded text is direct and
efficient. This one decision shaped everything — the dataset, the features, the model,
and the system — and it's also what makes the system explainable."

## Slide 8 — Methodology
**Say:** "We followed an agile, iterative methodology — six phases, each producing a
concrete deliverable, shown here. The key point is that it's a **loop, not a line**:
findings from evaluation fed back into preprocessing and training, and we repeated until
performance stabilized."

## Slide 9 — Dataset
**Say:** "We built about **402,684 URLs** from four sources: a labelled benchmark with all
four classes; **live feeds** from OpenPhish and URLhaus for current attacks; Cisco
Umbrella top domains plus nine thousand university domains for benign coverage. Then we
added **brand-attack augmentation** — synthetic typosquatting, combosquatting, homoglyph,
and crucially **hard negatives**: real brand domains with sensitive paths like
`paypal.com/login`, labelled benign, to force the model to learn the true difference."

## Slide 10 — Feature engineering
**Say:** "Each URL becomes two representations. First a **200-character sequence**, with
the vocabulary built only from the training split to avoid leakage. Second, **four
brand-similarity features** versus 65 seed brands: exact brand match, minimum edit
distance, near-miss, and homoglyph. These expose impersonation explicitly. And the
**exact same code** computes these in training and in the live backend — that
consistency is essential or predictions break."

## Slide 11 — Model
**Say:** "The model has two towers. The character tower is a Transformer encoder —
embedding, a 1-D convolution, multi-head self-attention with residuals and layer norm, a
feed-forward block, and global max pooling. The second tower is a small dense network over
the four features. They're concatenated into a softmax over the four classes. It's
deliberately **lightweight — about 130,000 parameters** — so it's fast and easy to
retrain."

## Slide 12 — System implementation
**Say:** "We didn't stop at a notebook. A **FastAPI** backend loads the model once and
exposes a `/scan` endpoint for an uploaded QR image and `/scan-url` for a URL directly.
For images it decodes the QR server-side with **pyzbar**, runs the model, maps the result
to Safe/Risky/Dangerous with indicators, and stores it in **PostgreSQL**. A **Next.js**
web app and an **Expo/React-Native** mobile app consume the API. The backend is a Docker
container on Hugging Face Spaces; the web app is on Vercel."

---
## ▸ Section 03 divider — Results & Findings
**Say:** "Now the results."

## Slide 13 — Headline results
**Say:** "The headline numbers: **91.2% four-class accuracy**, **93%** on the practical
safe-versus-threat decision, a **0.97 ROC-AUC**, and about **62 milliseconds per URL** on
CPU. On a held-out set of roughly 41,000 URLs, with 0.95 precision and recall on threats.
These are competitive with prior detectors at 95–99%, but on a **harder** setting — four
classes, QR-decoded URLs, and a held-out brand test — so a direct numeric comparison
isn't strictly fair."

## Slide 14 — Per-class metrics
**Say:** "Breaking it down per class: malware and defacement score highest, around 0.95,
because their URLs are structurally distinctive — long random paths, odd extensions. The
hardest boundary is **benign versus phishing**, and that's **by design** — our hard
negatives deliberately put login-style paths on genuine domains to make that distinction
realistic and difficult."

## Slide 15 — Generalization
**Say:** "A key validation step. We built look-alike attacks from three brands —
**dropbox, reddit, pickaboo — that we deliberately withheld** from the augmentation. The
model still flagged them. That proves it learned the **general pattern** of impersonation,
not a memorized brand list. The training and validation curves track closely, so no
overfitting."

## Slide 16 — Ablation ⭐ (the heart of the defense)
**Say:** "Now the most important slide, and I want to be completely transparent. We ran an
**ablation**: we removed the brand-feature tower and retrained a **character-only** model
on the same data. The result — on the right — is that the two perform **almost
identically**, within 0.3 of a percent. So the explicit brand features did **not**
increase accuracy. The honest reason: the **augmentation already teaches** the character
tower the impersonation patterns, so the extra features are redundant *for accuracy*. But
they are **not** wasted — they provide the explicit, human-readable signals, like edit
distance and homoglyph match, that **power the explanation** shown to the user, which a
character-only model keeps locked in its weights. So in one line: **augmentation drives
the accuracy; the brand features drive the explainability.**"
*Why say this:* examiners reward an honest negative result; re-running it gives the same
numbers, so honesty is also the safe choice.

## Slide 17 — Demonstration
**Say:** "Here's the system in practice — web on the left, mobile on the right. The user
scans or pastes a URL and immediately gets a verdict, a confidence score, and the
contributing indicators, **before** any link opens. Both clients call the same backend, so
verdicts are identical." *(If live demo allowed: `paypa1.com` → Dangerous; `github.com/login` → Safe.)*

---
## ▸ Section 04 divider — Discussion & Conclusion
**Say:** "Finally, contributions and conclusions."

## Slide 18 — Contributions
**Say:** "Our contributions: a **URL-text approach** to quishing that avoids the weak
image signal; a **dual-input architecture** plus an ablation that honestly establishes the
features' true role; a **four-class** formulation for finer risk; a **held-out brand
generalization test** that most comparable work omits; and an **explainable, deployed
prototype** on web and mobile."

## Slide 19 — Limitations & future work
**Say:** "Honest limitations: bare root brands like paypal.com are occasionally flagged —
mitigated in the system by an exact brand-match safeguard; benign-versus-phishing
confusion on sensitive paths; a smaller malware class; rule-based indicators rather than
formal SHAP/LIME; and URL-only analysis. Future work follows directly: a SHAP/LIME
attribution layer; production deployment with on-device inference; destination-page
analysis; larger or pretrained models; and continuous retraining on live feeds."

## Slide 20 — Conclusion
**Say:** "To conclude: quishing is best tackled at the URL level, not the image. Our
dual-input Transformer reached 91.2% across four classes and 93% on the safe-versus-threat
decision, generalizes to impersonation it never saw, explains every verdict, and runs as a
working web and mobile prototype. The ablation makes the contribution honest — the system
works, and we know precisely *why*."

## Slide 21 — Thank you
**Say:** "Thank you. I'm happy to take questions."

---

# Q&A Preparation — anticipated examiner questions

**Q: Why a Transformer, not a CNN or classical ML?**
Self-attention lets the model relate characters across the whole URL (a brand token early,
a suspicious TLD late) more naturally than a fixed-window CNN. That said, our ablation shows
the character tower alone is strong; the choice is about representation quality, and it stays
tiny (~130k params).

**Q: Your ablation shows the features don't help accuracy — why keep them?**
Two reasons: (1) **explainability** — they are the concrete signals the system shows the user
("edit-distance 1 from paypal.com", "homoglyph of facebook"); a character model's reasoning is
opaque. (2) The **deployment safeguard** (exact brand-match → legitimate) is built on the same
brand list. We report this honestly rather than hide it.

**Q: Is 91% good enough to deploy?**
On the security-relevant safe-vs-threat view it's 93%, 0.95 recall on threats, 0.97 ROC-AUC,
plus a brand-match safeguard. It's a strong research prototype; production hardening and
destination-page analysis are explicitly future work, so we don't over-claim.

**Q: How do you know it isn't memorizing?**
The held-out brand generalization test (Slide 15) — withheld brands were still flagged — plus
closely tracking train/val curves (no overfitting).

**Q: Why four classes if you only show three risk levels?**
Four classes give a finer, more diagnostic signal and enable per-class evaluation; we map them
to Safe/Risky/Dangerous only for the user-facing verdict.

**Q: A malicious URL on a brand-new domain not in any feed?**
The model judges from URL *text* patterns (TLD, length, tokens, host structure,
brand-similarity), not a blocklist, so it can flag novel hosts; continuous retraining keeps it
current; destination-page analysis (future work) adds a second signal.

**Q: Could an attacker evade it?**
Yes — a clean URL pointing to a malicious page is the main evasion, which is exactly why
destination-page analysis is future work. The homoglyph features and brand-match safeguard
harden the typosquat path.

**Q: Why does it flag paypal.com?**
A genuine root brand often appears as the *target* of impersonation in training, so its text
carries a "phishing-adjacent" signal the pure model hasn't fully learned to discount. The exact
brand-match safeguard resolves it in the deployed system — a model-level, not system-level,
limitation.

**Q: Is the explanation real or just a label?**
Real but rule-based: the result card lists concrete indicators (class + confidence, brand match,
suspicious TLD, homoglyph). A formal SHAP/LIME layer is future work — we don't claim it exists.

**Q: Dataset balance?**
Balanced by sampling, with class weighting for the smaller malware class; more malware data is
future work.

---

# Quick-reference facts (memorize)

| Fact | Value |
|---|---|
| Dataset | 402,684 URLs · 4 sources + brand-attack augmentation |
| Classes | benign · phishing · malware · defacement → Safe / Risky / Dangerous |
| Model | dual-input Transformer (char tower + brand-feature tower), ~130,196 params |
| Char input | 200-char sequence, vocab from train split only |
| Brand features | exact match · min edit distance · near-miss · homoglyph (vs 65 brands) |
| Test set | ~41,167 held-out URLs |
| 4-class accuracy | 91.23% (test loss 0.226) |
| Safe-vs-threat | 93% · 0.95 P/R on threat · ROC-AUC 0.97 |
| Inference | ~62 ms/URL on CPU (~16 URLs/sec) |
| Ablation | char-only ≈ dual-input (within 0.3%) → augmentation drives accuracy; features drive explainability |
| Generalization | flagged withheld brands (dropbox, reddit, pickaboo) |
| Stack | FastAPI · pyzbar/OpenCV · PostgreSQL (Neon) · Next.js · Expo/React Native · Docker on HF Spaces · Vercel |
