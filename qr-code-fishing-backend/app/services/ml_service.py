"""Service for the URL phishing model (character-level CNN trained on decoded QR URLs).

The model reads the decoded URL string, not the image. A QR code is a loss-less
encoding of its URL, so the phishing signal is in the text. See research/qr_code.ipynb.
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

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "ml")

# Candidate model filenames (first match wins).
_MODEL_FILES = (
    "phishing_url_model.keras",
    "phishing_url_model.h5",
    "model.keras",
    "model.h5",
)
_TOKENIZER_FILE = "url_tokenizer.json"


def load_model() -> None:
    """Load the trained URL model and its tokenizer into memory on startup."""
    global _model, _char_index, _maxlen
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
                "No ML model found in %s. ML classification will be skipped. "
                "Export phishing_url_model.keras + url_tokenizer.json from the notebook.",
                MODEL_DIR,
            )
            return

        tok_path = os.path.join(MODEL_DIR, _TOKENIZER_FILE)
        if not os.path.exists(tok_path):
            logger.warning(
                "Found model %s but tokenizer %s is missing. ML disabled "
                "(the model cannot encode URLs without it).",
                model_path,
                tok_path,
            )
            return

        with open(tok_path, "r", encoding="utf-8") as f:
            tok = json.load(f)
        _char_index = tok["char_index"]
        _maxlen = int(tok["maxlen"])

        logger.info("Loading URL model from %s ...", model_path)
        _model = tf.keras.models.load_model(model_path)
        logger.info(
            "Loaded URL phishing model (maxlen=%d, vocab=%d).",
            _maxlen,
            len(_char_index),
        )

    except ImportError:
        logger.warning("TensorFlow is not installed. ML classification will be skipped.")
    except Exception as e:
        logger.exception("Failed to load ML model: %s", e)
        _model = None


def normalize_url(url: str) -> str:
    """Strip formatting artifacts (scheme, www., case). MUST match the notebook exactly."""
    u = (url or "").strip().lower()
    if "://" in u:
        u = u.split("://", 1)[1]  # drop http:// / https://
    while u.startswith("www."):
        u = u[4:]                 # drop leading www.
    return u


def _encode(url: str) -> np.ndarray:
    """Encode a URL into a padded char-id sequence, matching training (0=pad, 1=OOV)."""
    norm = normalize_url(url)
    seq = [_char_index.get(ch, 1) for ch in norm[:_maxlen]]
    if len(seq) < _maxlen:
        seq = seq + [0] * (_maxlen - len(seq))
    return np.array([seq], dtype=np.int32)


def predict_url(url: str) -> Optional[float]:
    """
    Run the CNN on a decoded URL and return P(malicious) in [0.0, 1.0].

    Returns None if the model is unavailable, the input is empty, or an error occurs.
    """
    if _model is None or _char_index is None:
        return None
    if not url or not url.strip():
        return None

    try:
        x = _encode(url.strip())
        prediction = _model.predict(x, verbose=0)
        return float(prediction[0][0])
    except Exception as e:
        logger.exception("Error during URL ML prediction: %s", e)
        return None
