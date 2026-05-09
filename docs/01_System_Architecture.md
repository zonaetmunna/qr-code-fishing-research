# System Architecture

The QR Code Phishing Detection project is composed of a modern, multi-tier architecture designed for performance, modularity, and security.

## High-Level Architecture Overview

The system is broken down into four main components:
1.  **Frontend**: User Interface and Interaction.
2.  **Backend**: API and Business Logic.
3.  **Machine Learning**: Threat Detection Engine.
4.  **Database**: Data persistence.

---

### 1. Frontend (Next.js & React)
**Location:** `/qr-code-fishing-frontend/`

The frontend is built using **Next.js** (App Router paradigm) with React, styled with PostCSS. 
*   **Role**: Provides the interface for users to upload QR code images. 
*   **Interaction**: Sends HTTP POST requests containing multipart form data (the image bytes) to the backend API (`/api/v1/scan`).
*   **Display**: Parses the JSON response from the backend and visually displays the safety classification (`SAFE`, `RISKY`, or `DANGEROUS`) and the confidence indicators.

### 2. Backend (FastAPI - Python)
**Location:** `/qr-code-fishing-backend/`

The backend serves as the orchestrator of the entire system, built on **FastAPI** for high concurrency and auto-generated OpenAPI documentation.
*   **API Layer (`app/api/routers/scan.py`)**: Exposes the `/scan` and `/health` endpoints. Handles HTTP validation and exceptions.
*   **QR Decoding (`app/services/qr_decoder.py`)**: Takes raw image bytes and uses `pyzbar` (with an `OpenCV` fallback) to extract the embedded text/URL.
*   **Heuristic Engine (`app/services/phishing_analysis.py`)**: Runs rule-based checks on the extracted URL string (e.g., checking for raw IPs, unusual lengths, or weird ports).

### 3. Machine Learning (TensorFlow/Keras)
**Location:** `/qr-code-fishing-backend/app/models/ml/` and `/qr-code-fishing-backend/app/services/ml_service.py`

This tier runs alongside the heuristic engine, analyzing visual artifacts rather than string patterns.
*   **Implementation**: A custom Convolutional Neural Network (CNN) trained in Google Colab (`research/qr_code.ipynb`) and exported as an `.h5` file.
*   **Integration**: Loaded into memory upon FastAPI startup via `ml_service.py`. It accepts the raw QR code image bytes, resizes them to 128x128 pixels, and computes a phishing risk probability between 0 and 1.
*   **Decision Fusion**: The backend evaluates the ML score. If the ML score is high (e.g., >80% confidence of maliciousness), it overrides the heuristic score.

### 4. Database (SQLite + SQLAlchemy)
**Location:** `/qr-code-fishing-backend/qr_phishing.db`

*   **Role**: Stores historical scan records for analytics and auditing.
*   **ORM**: Uses SQLAlchemy to manage database sessions and map Python objects to SQL tables (`app/repositories/scan_repository.py`).
*   **Schema**: Records the decoded URL, the final classification, the confidence score, and the array of indicators that led to the decision.
