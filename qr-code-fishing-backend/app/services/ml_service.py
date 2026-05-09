"""Service for loading and running the Keras CNN model for QR image classification."""

import io
import logging
import os
from typing import Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Global variable to hold the loaded model
_model = None

# Model configuration matching the training notebook
IMG_HEIGHT = 128
IMG_WIDTH = 128
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "ml")


def load_model() -> None:
    """Load the trained Keras model into memory on application startup."""
    global _model
    try:
        # Import tensorflow only when needed to save memory if model is missing
        import tensorflow as tf

        # Look for possible model filenames
        model_paths = [
            os.path.join(MODEL_DIR, "model.h5"),
            os.path.join(MODEL_DIR, "model.keras"),
            os.path.join(MODEL_DIR, "phishing_model.h5"),
            os.path.join(MODEL_DIR, "phishing_model.keras"),
        ]

        loaded_path = None
        for path in model_paths:
            if os.path.exists(path):
                logger.info("Found ML model at %s, loading...", path)
                _model = tf.keras.models.load_model(path)
                loaded_path = path
                break

        if _model is None:
            logger.warning(
                "No ML model found in %s. "
                "ML classification will be skipped. "
                "Please place your exported model.h5 in the qr-code-fishing-backend/app/models/ml/ directory.",
                MODEL_DIR,
            )
        else:
            logger.info("Successfully loaded ML model from %s", loaded_path)

    except ImportError:
        logger.warning("TensorFlow is not installed. ML classification will be skipped.")
    except Exception as e:
        logger.exception("Failed to load ML model: %s", e)


def predict_image(image_bytes: bytes) -> Optional[float]:
    """
    Process the uploaded QR image bytes and run the CNN model to get a risk score.
    Returns:
        float: The probability [0.0, 1.0] of being malicious.
        None: If the model is not loaded or an error occurs.
    """
    global _model
    if _model is None:
        return None

    try:
        # Open image from bytes and convert to RGB (3 channels)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # Resize to match model input shape
        img = img.resize((IMG_WIDTH, IMG_HEIGHT))
        
        # Convert to numpy array and normalize
        img_array = np.array(img) / 255.0
        
        # Expand dimensions to match batch size (1, 128, 128, 3)
        img_batch = np.expand_dims(img_array, axis=0)

        # Run prediction
        prediction = _model.predict(img_batch, verbose=0)
        
        # Extract the scalar probability from the output array (e.g., [[0.85]])
        risk_prob = float(prediction[0][0])
        return risk_prob

    except Exception as e:
        logger.exception("Error during ML image prediction: %s", e)
        return None
