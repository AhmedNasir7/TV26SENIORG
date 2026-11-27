FROM python:3.11-slim

WORKDIR /app

# CPU-only torch build -- the default PyPI wheel pulls CUDA libraries that
# this box has no use for and would roughly triple the image size.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Bake the model weights into the image at build time so the container
# doesn't need network access (or a slow first request) at startup.
RUN python -c "from transformers import pipeline; pipeline('text-classification', model='martin-ha/toxic-comment-model')"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)" || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
