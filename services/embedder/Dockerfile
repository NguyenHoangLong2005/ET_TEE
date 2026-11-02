# CLIP query encoder. Models are baked into the image at build time because app.py runs with HF_HUB_OFFLINE=1.
FROM python:3.12-slim
WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/hf-cache \
    PYTHONUNBUFFERED=1
# CPU-only torch: the default wheel pulls in CUDA (several GB) that a VPS cannot use
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install -r requirements.txt
# Download as the runtime user: a chown afterwards would copy the 1 GB model cache into another layer
RUN useradd --system --uid 10001 app && chown app:app /app
USER app
# Same models and pinned revisions as app.py - a different revision would put queries in another space
RUN python -c "from sentence_transformers import SentenceTransformer as S; \
S('sentence-transformers/clip-ViT-B-32', revision='327ab6726d33c0e22f920c83f2ff9e4bd38ca37f', device='cpu'); \
S('sentence-transformers/clip-ViT-B-32-multilingual-v1', revision='58edf8cada9e398793dca955574a48cbb7f18be2', device='cpu')"
COPY app.py .
EXPOSE 8090
# app.py's __main__ binds 127.0.0.1, which is unreachable from other containers
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
