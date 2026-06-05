# FastAPI + TensorFlow backend for Hugging Face Spaces (Docker SDK).
# HF Spaces routes external traffic to port 7860.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TF_CPP_MIN_LOG_LEVEL=2

# System libraries: libzbar0 -> pyzbar (QR decode); libgl1/glib -> OpenCV.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libzbar0 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# App code + the trained model files (app/models/ml/*.keras, *.json).
COPY app ./app

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
