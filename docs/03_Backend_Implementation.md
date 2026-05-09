# Backend Implementation Details

This document dives into the specific roles and implementations of the core backend files within the `qr-code-fishing-backend/app/` directory.

## Core API Routing

### `api/routers/scan.py`
This is the primary traffic controller for the application. 
*   **Endpoints**: Defines `/health`, `/health/ready` (checks DB connectivity), and `/scan`.
*   **The `/scan` Endpoint**: Acts as the orchestrator. It expects an `UploadFile`, reads it into bytes, and delegates tasks to the various services (Decoder, Heuristics, ML).
*   **Error Handling**: Catches exceptions like `QRDecodeError` and returns clean `HTTPException` responses (e.g., HTTP 400 for bad images).

## Business Logic Services

### `services/ml_service.py`
This service isolates the heavy Machine Learning operations.
*   **Dynamic Loading**: Contains `load_model()`, which is triggered by FastAPI's lifespan events in `main.py`. It looks for `model.h5` in the `models/ml/` folder and loads it globally into memory using TensorFlow. If the file is missing, it catches the error gracefully, allowing the server to run purely on heuristics without crashing.
*   **Inference**: Contains `predict_image(image_bytes)`. Uses the `Pillow` library to resize images strictly to 128x128x3 before passing them to the loaded Keras model.

### `services/qr_decoder.py`
Handles the visual decoding of the QR matrix into a string.
*   **Primary Engine**: Uses `pyzbar.decode` which is highly accurate for clean QR codes.
*   **Fallback Engine**: If `pyzbar` fails, it falls back to `cv2.QRCodeDetector()`.
*   **URL Prioritization**: If a QR code contains multiple payloads, it iterates through them and returns the first one that begins with `http://` or `https://` to ensure the phishing engine receives a verifiable link.

### `services/phishing_analysis.py`
The rule-based threat engine.
*   **Risk Accumulation**: The `_accumulate` function evaluates the parsed URL against multiple helper functions (e.g., `score_ip_host`, `score_shortener`, `score_punycode`).
*   **Classification Mapping**: Converts the numerical risk score into an Enum (`SAFE`, `RISKY`, `DANGEROUS`) and generates a confidence percentage based on the severity of the flagged rules.
