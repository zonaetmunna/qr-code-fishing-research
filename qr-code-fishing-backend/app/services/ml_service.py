"""Service for the URL threat model.

The model reads the decoded URL string (not the image) and classifies it into one of
``classes`` (benign / phishing / malware / defacement). The current model is **dual-input**:

* (1) a character sequence of the URL, and
* (2) a small vector of **brand-similarity features** (edit-distance to nearest known brand,
  exact-match, near-miss, homoglyph-match).

The feature computation here MUST match the training notebook
(research/qr_phishing_url_training.ipynb, `sim_features`) exactly, or predictions break — the
same rule as `normalize_url`. The brand list + class order are loaded from `url_tokenizer.json`.

A legacy single-input model (no features) still works: feature computation is skipped when the
loaded model has only one input.
"""

import json
import logging
import os
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Globals populated on startup by load_model().
_model = None
_char_index: Optional[dict] = None
_maxlen: int = 0
_classes: Optional[list[str]] = None    # None => binary (single sigmoid) model
_brands: list[str] = []                 # brand reference for similarity features
_brand_set: frozenset = frozenset()
_dual_input: bool = False               # True when the model also takes the feature vector

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "ml")

_MODEL_FILES = (
    "phishing_url_model.keras",
    "phishing_url_model.h5",
    "model.keras",
    "model.h5",
)
_TOKENIZER_FILE = "url_tokenizer.json"

# Reverse homoglyph map: look-alike chars back to letters (paypa1 -> paypal). Must match the
# notebook's REV_HOMOGLYPH.
_REV_HOMOGLYPH = {"0": "o", "1": "l", "3": "e", "4": "a", "5": "s",
                  "8": "b", "7": "t", "9": "g", "2": "z", "$": "s", "@": "a"}
_NFEAT = 4


def load_model() -> None:
    """Load the trained URL model and its tokenizer/brands into memory on startup."""
    global _model, _char_index, _maxlen, _classes, _brands, _brand_set, _dual_input
    try:
        import tensorflow as tf  # imported lazily so a missing TF only disables ML

        model_path = None
        for name in _MODEL_FILES:
            candidate = os.path.join(MODEL_DIR, name)
            if os.path.exists(candidate):
                model_path = candidate
                break

        if model_path is None:
            logger.warning(
                "No ML model found in %s. ML classification will be skipped.", MODEL_DIR
            )
            return

        tok_path = os.path.join(MODEL_DIR, _TOKENIZER_FILE)
        if not os.path.exists(tok_path):
            logger.warning("Model found but tokenizer %s missing. ML disabled.", tok_path)
            return

        with open(tok_path, "r", encoding="utf-8") as f:
            tok = json.load(f)
        _char_index = tok["char_index"]
        _maxlen = int(tok["maxlen"])
        _classes = list(tok["classes"]) if tok.get("classes") else None
        _brands = list(tok.get("brands") or [])
        _brand_set = frozenset(_brands)

        logger.info("Loading URL model from %s ...", model_path)
        _model = tf.keras.models.load_model(model_path)
        _dual_input = len(getattr(_model, "inputs", [None])) == 2
        logger.info(
            "Loaded URL model (maxlen=%d, classes=%s, brands=%d, dual_input=%s).",
            _maxlen,
            _classes if _classes else "binary",
            len(_brands),
            _dual_input,
        )

    except ImportError:
        logger.warning("TensorFlow is not installed. ML classification will be skipped.")
    except Exception as e:
        logger.exception("Failed to load ML model: %s", e)
        _model = None


def normalize_url(url: str) -> str:
    """Strip scheme, www., case. MUST match the notebook exactly."""
    u = (url or "").strip().lower()
    if "://" in u:
        u = u.split("://", 1)[1]
    while u.startswith("www."):
        u = u[4:]
    return u


def _levenshtein(a: str, b: str) -> int:
    """Standard Levenshtein edit distance (matches rapidfuzz used in training)."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[len(b)]


def sim_features(url: str) -> list[float]:
    """Brand-similarity features [brand_or_subdomain, min_edit_norm, near_miss, homoglyph].

    MUST match the notebook's `sim_features` exactly.
    """
    host = normalize_url(url).split("/")[0].split(":")[0]
    # host is a brand OR a subdomain of a brand (paypal.com, accounts.google.com,
    # en.wikipedia.org). Subdomain-abuse like paypal.com.evil.tk does NOT match.
    brand_or_sub = 1.0 if any(host == b or host.endswith("." + b) for b in _brands) else 0.0
    md = min((_levenshtein(host, b) for b in _brands), default=99) if _brands else 99
    near = 1.0 if 1 <= md <= 2 else 0.0
    norm = "".join(_REV_HOMOGLYPH.get(c, c) for c in host)
    homo = 1.0 if (norm in _brand_set and brand_or_sub == 0.0) else 0.0
    return [brand_or_sub, min(md, 5) / 5.0, near, homo]


def is_known_brand(url: str) -> bool:
    """True if the URL's host IS a known brand or a subdomain of one (a verifiable fact, not a
    guess) — e.g. paypal.com, www.paypal.com, accounts.google.com, en.wikipedia.org. Used as a
    precision safeguard: an exact brand/subdomain match is legitimate by definition. Subdomain
    abuse like ``paypal.com.evil.tk`` does NOT match (the brand is not the suffix)."""
    if not _brands:
        return False
    host = normalize_url(url).split("/")[0].split(":")[0]
    return any(host == b or host.endswith("." + b) for b in _brands)


def _encode(url: str) -> np.ndarray:
    """Encode a URL into a padded char-id sequence, matching training (0=pad, 1=OOV)."""
    norm = normalize_url(url)
    seq = [_char_index.get(ch, 1) for ch in norm[:_maxlen]]
    if len(seq) < _maxlen:
        seq = seq + [0] * (_maxlen - len(seq))
    return np.array([seq], dtype=np.int32)


def _raw_predict(url: str) -> Optional[np.ndarray]:
    """Run the model and return its 1-D output vector, or None if unavailable."""
    if _model is None or _char_index is None:
        return None
    if not url or not url.strip():
        return None
    try:
        x = _encode(url.strip())
        if _dual_input:
            f = np.array([sim_features(url.strip())], dtype=np.float32)
            out = _model.predict([x, f], verbose=0)
        else:
            out = _model.predict(x, verbose=0)
        return np.asarray(out)[0]
    except Exception as e:
        logger.exception("Error during URL ML prediction: %s", e)
        return None


def predict_url_full(url: str) -> Optional[tuple[str, float]]:
    """
    Classify a decoded URL by argmax (same as the notebook). Returns ``(label, confidence)``
    where label is "benign"/"phishing"/"malware"/"defacement" (or "phishing"/"benign" for a
    legacy binary model), and confidence is that class's probability. None if unavailable.
    """
    vec = _raw_predict(url)
    if vec is None:
        return None
    if vec.shape[0] == 1:  # legacy binary sigmoid = P(phishing)
        p = float(vec[0])
        return ("phishing", p) if p >= 0.5 else ("benign", 1.0 - p)
    names = _classes if (_classes and len(_classes) == vec.shape[0]) else [
        f"class_{i}" for i in range(vec.shape[0])
    ]
    idx = int(vec.argmax())
    return names[idx], float(vec[idx])


def predict_url(url: str) -> Optional[float]:
    """Backward-compatible: P(not benign) in [0,1], or None. (Not used for the verdict.)"""
    vec = _raw_predict(url)
    if vec is None:
        return None
    if vec.shape[0] == 1:
        return float(vec[0])
    names = _classes if (_classes and len(_classes) == vec.shape[0]) else [
        f"class_{i}" for i in range(vec.shape[0])
    ]
    benign_idx = names.index("benign") if "benign" in names else 0
    return float(1.0 - vec[benign_idx])
