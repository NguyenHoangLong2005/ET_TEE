"""Query encoder for Sprint 5 search: turns a search phrase or an uploaded photo into the SAME 512-d CLIP
space as product_embeddings (Sprint 1, scripts/embeddings/colab_product_embeddings.py).

    pip install -r services/embedder/requirements.txt
    python services/embedder/app.py                     # http://127.0.0.1:8090

Same models and pinned revisions as Sprint 1 - a different revision would put queries in another space.
Runs offline from the Hugging Face cache (HF_HUB_OFFLINE=1); CPU is enough (~20-60 ms per text query,
~100 ms per image).

POST /embed/text   {"text": "..."}          -> {"vector": [512 floats], "model": ...}
POST /embed/image  multipart field "file"   -> {"vector": [...], "model": ...}
GET  /health
"""
import io
import os

os.environ.setdefault('HF_HUB_OFFLINE', '1')

import uvicorn  # noqa: E402
from fastapi import FastAPI, File, HTTPException, UploadFile  # noqa: E402
from PIL import Image, UnidentifiedImageError  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402
import torch  # noqa: E402
from sentence_transformers import SentenceTransformer  # noqa: E402

# Default thread count on Windows oversubscribes the CPU: a text query took ~3 s instead of tens of ms
torch.set_num_threads(int(os.environ.get('EMBEDDER_THREADS', '4')))

IMAGE_MODEL = "sentence-transformers/clip-ViT-B-32"
IMAGE_MODEL_REVISION = "327ab6726d33c0e22f920c83f2ff9e4bd38ca37f"
TEXT_MODEL = "sentence-transformers/clip-ViT-B-32-multilingual-v1"
TEXT_MODEL_REVISION = "58edf8cada9e398793dca955574a48cbb7f18be2"
MODEL = f"img={IMAGE_MODEL}@{IMAGE_MODEL_REVISION[:12]}|txt={TEXT_MODEL}@{TEXT_MODEL_REVISION[:12]}"

MAX_TEXT = 200
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 4000 * 4000

app = FastAPI(title='ET.TEE query embedder')
img_model = SentenceTransformer(IMAGE_MODEL, revision=IMAGE_MODEL_REVISION, device='cpu')
txt_model = SentenceTransformer(TEXT_MODEL, revision=TEXT_MODEL_REVISION, device='cpu')
# warm-up: the first real encode would otherwise pay for lazy initialisation (seconds on CPU)
img_model.encode(Image.new('RGB', (224, 224), (255, 255, 255)))
txt_model.encode('áo thun')


class TextQuery(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT)


def _out(vec):
    return {'vector': [float(x) for x in vec], 'model': MODEL}


@app.get('/health')
def health():
    return {'status': 'ok', 'model': MODEL}


@app.post('/embed/text')
def embed_text(q: TextQuery):
    text = q.text.strip()
    if not text:
        raise HTTPException(400, 'empty text')
    return _out(txt_model.encode(text, normalize_embeddings=True))


@app.post('/embed/image')
async def embed_image(file: UploadFile = File(...)):
    data = await file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, 'image larger than 5 MB')
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        raise HTTPException(400, 'not a readable image')
    # Same handling as Sprint 1: flatten transparency onto white, RGB
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGBA')
        bg = Image.new('RGB', img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        img = bg
    else:
        img = img.convert('RGB')
    return _out(img_model.encode(img, normalize_embeddings=True))


if __name__ == '__main__':
    uvicorn.run(app, host='127.0.0.1', port=int(os.environ.get('EMBEDDER_PORT', '8090')))
