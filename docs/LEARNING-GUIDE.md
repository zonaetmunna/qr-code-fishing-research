# Learning Guide — The Machine Learning & System Concepts of This Project

> **Research project:** _An Explainable QR Code Analysis for Detecting Phishing and Malicious URLs Using Machine Learning_

A study guide to the concepts, algorithms, and technologies behind this thesis. Each topic
introduces the **proper academic term**, gives a **precise definition** and **mechanism**,
a small **illustration**, and **how this project applies it**. Read it top to bottom; the
concepts build on one another.

---

## 0 · Conceptual overview

The system performs **supervised text classification**: it decodes the Uniform Resource
Locator (URL) embedded in a QR code and assigns it to one of four classes
(benign, phishing, malware, defacement) using a trained neural network, then maps that class
to a user‑facing risk level (Safe / Risky / Dangerous) accompanied by an explanation.

```
   QR image ──► decode URL ──► encode as features ──► neural classifier ──► class + explanation
```

**Part 1** covers the machine‑learning model. **Part 2** covers the system that serves it.

---

## A worked example (referenced throughout)

To make the pipeline concrete, the malicious URL **`paypa1.com`** (a homoglyph of
`paypal.com`, using the digit *1* for the letter *l*) is traced through every stage:

```
 paypa1.com
   │  ① Tokenization & encoding   → integer sequence  [17, 2, 49, 17, 2, 28, 14, ...]
   │  ② Embedding                 → each token → a learned 64-dimensional vector
   │  ③ Convolution (Conv1D)      → local n-gram features ("pa1" flagged as atypical)
   │  ④ Self-attention            → relates "paypa1" to brand vocabulary globally
   │  ⑤ Brand-similarity features → edit distance 1 from "paypal" → near-miss = 1
   │  ⑥ Global max pooling        → fixed-length sequence representation
   │  ⑦ Softmax classifier        → P(phishing) = 0.98
   └─►  Prediction: phishing (Dangerous, confidence 0.98)
```

---

# PART 1 · The Machine-Learning Model

## 1. Machine learning and deep learning

**Definition.** *Machine learning (ML)* is the construction of algorithms that **learn a
mapping from inputs to outputs from labelled examples (data)** rather than from explicitly
programmed rules. This project uses *supervised learning* — training on inputs paired with
known correct labels.

*Deep learning* is the subfield of ML that uses **artificial neural networks** with multiple
layers, enabling **representation learning** (the model learns its own features from raw
data instead of relying on hand‑crafted ones).

```
   Artificial Intelligence ⊃ Machine Learning ⊃ Deep Learning ⊃ Transformer (this model)
```

**Application.** The model was trained on a labelled corpus of **402,684 URLs** to learn the
distinction between benign and malicious URLs without manually specified rules.

---

## 1.5 Dataset construction and data augmentation

**Definition.** Model performance depends on a **representative training corpus**. This
project constructs a *multi-source dataset* and enriches it with *data augmentation* — the
generation of synthetic training examples to expose the model to under-represented patterns.

**Multi-source corpus (402,684 URLs).** Four complementary sources are merged and deduplicated:

```
   • Labelled benchmark dataset            → all four classes
   • Live threat feeds — OpenPhish, URLhaus → recent, real phishing & malware URLs
   • Cisco Umbrella top-domains list        → diverse legitimate (benign) sites
   • ≈9,000 university domains (.edu/.ac.*)  → additional benign coverage
```

**Data augmentation.** Synthetic adversarial examples are generated for attack patterns scarce
in the raw data:
- *Typosquatting* — minor misspellings of a brand (e.g., `facebookk.com`).
- *Combosquatting* — a brand combined with extra tokens (e.g., `paypal-secure.com`).
- *Homoglyph substitution* — visually confusable characters (e.g., `paypa1.com`).
- *Hard negatives* — genuine brand domains with sensitive-looking paths (e.g.,
  `paypal.com/login`), labelled **benign**, to sharpen the benign/phishing boundary.

**Application.** The augmentation is the **primary driver of robustness to brand
impersonation**, as established by the ablation study (§16).

---

## 2. Tokenization and sequence encoding

**Definition.** *Tokenization* converts text into discrete units (*tokens*). This project
uses **character‑level tokenization**: each character is mapped to a unique integer index.
Inputs are then standardized to a **fixed sequence length** (200) by *padding* shorter
sequences with zeros and *truncating* longer ones.

```
   p   a   y   p   a   1   .   c   o   m
  17   2  49  17   2  28  14   4  16  15 | 0 0 … 0   (zero-padding to length 200)
```

**Application.** The character vocabulary (≈260 symbols) is constructed **exclusively from
the training partition** to prevent *data leakage* into validation and test data.

---

## 3. Embeddings (distributed representations)

**Definition.** An *embedding* is a learned, dense, low‑dimensional vector representation of
a discrete token. The *embedding layer* is a trainable lookup matrix of dimension
*(vocabulary × d)* that maps each token index to a *d*‑dimensional vector; semantically
similar tokens converge to nearby points in the embedding space.

```
   token 'p' (index 17)  →  [ 0.21, −0.47, 0.83, … ]   (d = 64 dimensions)
```

**Application.** A 64‑dimensional embedding transforms the 200‑token sequence into a
*200 × 64* matrix — the model's first learned representation of the URL.

---

## 4. One-dimensional convolution (Conv1D)

**Definition.** A *convolutional layer* applies a learnable filter (*kernel*) that slides
across the sequence, computing localized features through **weight sharing** — the same
filter detects a pattern regardless of its position. In one dimension, this captures **local
n‑gram patterns** in the character sequence.

```
   p a y p a 1 . c o m
   ▓▓▓ → ▓▓▓ → ▓▓▓ → ▓▓▓     (a kernel of width 5 sliding left-to-right)
```

**Application.** The convolutional layer extracts local lexical cues (e.g., `://`, `.tk`,
`-login`) prior to the self‑attention stage.

---

## 5. Self-attention and the Transformer ⭐

**Definition.** The *self‑attention mechanism* allows every position in a sequence to attend
to (weigh the relevance of) every other position, thereby modelling **long‑range
dependencies**. For each token it derives three vectors — a **Query (Q)**, **Key (K)**, and
**Value (V)** — and computes *scaled dot‑product attention*:

```
   Attention(Q, K, V) = softmax( (Q · Kᵀ) / √dₖ ) · V
```

*Multi‑head attention* performs this in several parallel subspaces (*heads*), each learning a
distinct dependency, then concatenates the results. The *Transformer* (Vaswani et al., 2017,
*"Attention Is All You Need"*) is the architecture built upon stacked self‑attention and
feed‑forward sub‑layers.

```
   https://paypal-secure-login.tk
           └──┬──┘            └┬┘
          brand token      atypical TLD
              └──── jointly attended ────┘  → impersonation signal
```

**Application.** The character tower employs **one Transformer encoder block with four
attention heads**, enabling it to relate distant, jointly informative substrings of the URL.

---

## 6. Residual connections and layer normalization

**Definition.** A *residual (skip) connection* adds a sub‑layer's input to its output
(`y = x + f(x)`), mitigating the *vanishing‑gradient problem* and preserving information in
deep networks. *Layer normalization* standardizes activations across the feature dimension
to stabilize and accelerate training.

**Application.** Following standard Transformer design, each sub‑layer (attention and
feed‑forward) is wrapped in an "Add & Norm" operation (residual connection + layer
normalization).

---

## 7. Position-wise feed-forward network

**Definition.** A *feed‑forward (fully connected / dense) layer* applies a learned affine
transformation followed by a non‑linear activation, mixing the information at each position.

**Application.** A two‑layer feed‑forward sub‑block (Dense 128 → Dense 64) processes each
position after attention; dense layers also appear in the brand‑feature tower and the
classification head.

---

## 8. Global max pooling

**Definition.** *Pooling* aggregates a variable‑length set of vectors into a single
fixed‑length vector. *Global max pooling* takes the maximum value of each feature across all
sequence positions, retaining the most salient activation.

```
   200 position vectors  ──(feature-wise maximum)──►  one 64-dimensional vector
```

**Application.** Reduces the *200 × 64* sequence representation to a single 64‑dimensional
summary of the URL.

---

## 9. Softmax activation and multi-class output

**Definition.** The *softmax function* converts a vector of real‑valued scores (*logits*)
into a **probability distribution** (non‑negative, summing to one). The *argmax* of this
distribution is the predicted class; the corresponding probability is the model's
*confidence*.

```
   benign 0.01   phishing 0.98   malware 0.01   defacement 0.00   →  argmax = phishing
```

**Application.** A softmax over four classes yields `[benign, phishing, malware,
defacement]`; the predicted class is mapped to Safe / Risky / Dangerous.

---

## 10. Loss function and optimization

**Definition.**
- A *loss function* quantifies the discrepancy between predictions and true labels. This
  project uses *categorical cross‑entropy*, which penalizes confident incorrect predictions.
- *Backpropagation* computes the gradient of the loss with respect to each parameter.
- *Gradient descent* iteratively updates parameters in the direction that reduces the loss;
  the *Adam* optimizer is an adaptive variant that scales the step size per parameter.

**Application.** Training minimizes sparse categorical cross‑entropy using Adam for up to
15 *epochs* (full passes over the training data) with a batch size of 128.

---

## 11. Overfitting, generalization, and regularization

**Definition.** *Overfitting* occurs when a model fits the training data so closely that it
fails to *generalize* to unseen data. *Regularization* techniques counteract this:
- *Dropout* — randomly deactivates a fraction of units during training, reducing co‑adaptation.
- *Early stopping* — halts training when validation performance ceases to improve.
- *Learning‑rate scheduling* (ReduceLROnPlateau) — reduces the step size when progress stalls.

**Application.** All three are employed; the close agreement between training and validation
curves indicates the model generalizes rather than memorizes.

---

## 12. Class imbalance and class weighting

**Definition.** *Class imbalance* arises when classes are unequally represented, biasing the
classifier toward the majority class. *Class weighting* assigns higher loss weight to
minority‑class errors to counterbalance this.

**Application.** The dataset is balanced by sampling, and class weighting compensates for the
comparatively smaller malware class.

---

## 13. Data partitioning and leakage

**Definition.** The dataset is partitioned into a *training set* (parameter estimation), a
*validation set* (model selection and early stopping), and a *test set* (final, unbiased
evaluation). *Data leakage* — the inadvertent flow of test information into training — must be
prevented to obtain an honest estimate of performance.

**Application.** A held‑out test set of **41,167 URLs** is evaluated once; the vocabulary is
derived solely from the training partition to avoid leakage.

---

## 14. Evaluation metrics

**Definitions.**
- *Accuracy* — proportion of correct predictions.
- *Precision* — TP / (TP + FP); the reliability of positive predictions.
- *Recall (sensitivity)* — TP / (TP + FN); the proportion of true positives detected.
- *F1‑score* — the harmonic mean of precision and recall.
- *Confusion matrix* — a contingency table of true versus predicted classes.
- *ROC curve / AUC* — the receiver operating characteristic plots the true‑positive rate
  against the false‑positive rate across thresholds; the *Area Under the Curve* summarizes
  discriminative ability (1.0 = perfect, 0.5 = chance).

**Application.** Reported results: 91.2% accuracy, 0.95 precision/recall on the threat class,
and a safe‑versus‑threat ROC‑AUC of 0.97.

---

## 14.5 Generalization evaluation

**Definition.** *Generalization* is a model's ability to perform correctly on data it has
never encountered during training. Strong test‑set accuracy alone can be misleading if the
test data resembles the training data too closely, so this project adds a dedicated
generalization assessment.

**Held‑out brand test.** Look‑alike attacks were synthesized from three brands —
**dropbox, reddit, and pickaboo** — that were *deliberately excluded* from the augmentation
process. Correct detection of these unseen impersonations demonstrates that the model learned
the **general pattern** of brand impersonation rather than memorizing specific brand names.

```
   dropbox-login.com · redditt.com · pickab0o.com   (brands NOT seen in training)
        └──────────── correctly flagged as non-benign ────────────┘
```

**Application.** The model correctly flagged the held‑out impersonations, providing evidence
of genuine generalization rather than memorization (a form of overfitting, §11).

---

## 15. Feature engineering: edit distance and homoglyph normalization

**Definition.** *Feature engineering* is the manual construction of informative input
variables.
- *Levenshtein (edit) distance* — the minimum number of single‑character insertions,
  deletions, or substitutions transforming one string into another; a small distance to a
  known brand indicates probable typosquatting.
- *Homoglyph normalization* — mapping visually confusable characters to their canonical forms
  (`0→o`, `1→l`) to reveal impersonation.

```
   paypal  vs  paypa1   →  edit distance = 1   →  near-miss feature = 1
```

**Application.** Four engineered *brand‑similarity features* (exact match, minimum edit
distance, near‑miss, homoglyph) are computed against 65 reference brand domains using the
RapidFuzz library.

---

## 16. The dual-input architecture

**Definition.** A *dual‑input (multi‑input) architecture* processes two distinct
representations through separate sub‑networks (*towers*) whose outputs are *concatenated*
before classification.

```
   character sequence ─► Transformer encoder tower ──┐
                                                      ├─► concatenate ─► dense ─► softmax(4)
   4 brand features   ─► dense feature tower ─────────┘
```

**Application.** This project's model is a **dual‑input Transformer** (≈130,196 parameters).

> **Critical finding (ablation study).** A controlled *ablation* — retraining with the
> brand‑feature tower removed — showed the character‑only model attains comparable accuracy.
> The engineered features therefore contribute principally to **explainability** (providing
> human‑readable signals) rather than to classification accuracy; the *data augmentation* is
> the primary driver of robustness.

---

# PART 2 · The Serving System

## 17. REST API and the FastAPI framework

**Definition.** A *backend* is server‑side software exposing an *Application Programming
Interface (API)*. A *RESTful API* communicates over HTTP using methods such as `GET` and
`POST`, typically exchanging *JSON*. *FastAPI* is a Python web framework for building such
APIs; an *ASGI server* (Uvicorn) executes the application.

**Application.** The model and tokenizer are loaded once at startup. The endpoint `/scan`
accepts an uploaded image and `/scan-url` accepts a URL directly, both under the `/api/v1`
prefix.

## 18. QR decoding (pyzbar / OpenCV)

**Definition.** *QR decoding* extracts the embedded text from a QR‑code image. *pyzbar*
performs the decoding; *OpenCV* (a computer‑vision library) and *Pillow* / *NumPy* handle
image loading and array conversion.

**Application.** Uploaded images are decoded server‑side; only http(s) payloads proceed to
classification.

## 19. Persistence: relational database and ORM

**Definition.** A *relational database* stores data in tables; *PostgreSQL* is the database
management system used (hosted on Neon). An *Object‑Relational Mapper (ORM)* — *SQLAlchemy* —
maps database rows to Python objects, abstracting raw SQL.

**Application.** Each classification outcome is persisted to the `scan_records` table.

## 20. Containerization and deployment

**Definition.** *Containerization* (*Docker*) packages an application with all dependencies
into a portable, reproducible image. *Deployment* makes the application accessible over the
network; the backend runs on *Hugging Face Spaces* and the web client on *Vercel*.

## 21. End-to-end request flow

```
  Client (web / mobile)        Backend (FastAPI)                       Client
  ────────────────────         ──────────────────────                  ──────────
  1. submit QR image  ──────►  2. decode URL (pyzbar)
                               3. normalize + extract features
                               4. classify (dual-input Transformer)
                               5. map to risk level + indicators
                               6. persist to PostgreSQL
                               7. return JSON answer   ──────────────►  8. render result + explanation
                                                              (prior to opening any link)
```

---

## Glossary of key terms

| Term | Definition |
|---|---|
| Supervised learning | Learning a mapping from labelled input–output examples |
| Representation learning | Automatic learning of features from raw data |
| Tokenization | Converting text into discrete units (tokens) |
| Embedding | A learned dense vector representation of a token |
| Convolution | Localized feature extraction via a sliding shared filter |
| Self-attention | Mechanism relating all sequence positions to one another |
| Transformer | An architecture based on stacked self-attention |
| Softmax | Function producing a probability distribution over classes |
| Cross-entropy | Loss measuring divergence between predicted and true distributions |
| Backpropagation | Algorithm computing gradients of the loss w.r.t. parameters |
| Optimizer (Adam) | Adaptive gradient-descent method for parameter updates |
| Overfitting | Failure to generalize beyond the training data |
| Regularization | Techniques (dropout, early stopping) that improve generalization |
| ROC-AUC | Area under the receiver operating characteristic curve |
| Levenshtein distance | Minimum single-character edits between two strings |
| Data augmentation | Generating synthetic training examples to cover scarce patterns |
| Typosquatting | Brand impersonation via a misspelled / look-alike domain |
| Generalization | Performing correctly on data not seen during training |
| Ablation study | Removing a component to isolate its contribution |
| REST API | HTTP-based interface for client–server communication |
| ORM | Object-Relational Mapper (e.g., SQLAlchemy) |
| Containerization | Packaging software with dependencies (Docker) |

---

## Recommended references

- Vaswani, A. et al. (2017). *Attention Is All You Need.* NeurIPS. — the Transformer.
- Kingma, D. P. & Ba, J. (2015). *Adam: A Method for Stochastic Optimization.* ICLR.
- Goodfellow, I., Bengio, Y. & Courville, A. (2016). *Deep Learning.* MIT Press. — foundational text.
- Alammar, J. *The Illustrated Transformer* — accessible visual exposition of self-attention.
