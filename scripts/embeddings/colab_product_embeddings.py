# %% [markdown]
# # Product embeddings: Google Colab GPU (embedding generation, NOT training)
#
# Notebook này **chỉ chạy inference** bằng model có sẵn để tạo vector cho từng sản phẩm.
# Không fine-tune, không train, không cập nhật trọng số model.
#
# ```
# Supabase (public.products, ...)  --đọc, READ ONLY-->  Colab GPU
#   ảnh chính  -> sentence-transformers/clip-ViT-B-32               -> v_image (512)
#   text tiếng Việt -> sentence-transformers/clip-ViT-B-32-multilingual-v1 -> v_text (512)
#   e = L2( 0.7 * L2(v_image) + 0.3 * L2(v_text) )   (không có ảnh / ảnh lỗi -> e = L2(v_text))
#   -> checkpoint parquet (Google Drive) -> product_embeddings.parquet -> UPSERT public.product_embeddings
# ```
#
# Backend Spring Boot (`GET /api/products/{slug}/similar`) đọc `public.product_embeddings` bằng pgvector.
#
# **Quyền với database:** notebook chỉ ĐỌC dữ liệu sản phẩm (mọi truy vấn đọc chạy trong transaction
# `READ ONLY`) và chỉ GHI (INSERT ... ON CONFLICT DO UPDATE) vào `public.product_embeddings`.
# Không đụng `products`, `orders`, `users`, inventory hay schema `ettee`.
#
# File này được sinh từ `scripts/embeddings/colab_product_embeddings.py` (bản .py dự phòng, cùng nội dung).
# Hướng dẫn: `scripts/embeddings/COLAB_README.md`.
#
# **Cách chạy:** sửa cell **3. Cấu hình** nếu cần, rồi `Runtime -> Run all`. Mặc định `RUN_MODE = "test"` (20 sản phẩm).

# %% [markdown]
# ## 1. Cài đặt môi trường: phát hiện Colab, GPU/CUDA

# %%
import os
import sys
import subprocess

IN_COLAB = 'google.colab' in sys.modules
print('Python', sys.version.split()[0], '| Google Colab:', IN_COLAB)
try:
    out = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total,driver_version', '--format=csv,noheader'],
                         capture_output=True, text=True, timeout=20)
    print('nvidia-smi:', out.stdout.strip() or out.stderr.strip() or '(không có output)')
except Exception as e:  # noqa: BLE001
    print('nvidia-smi không chạy được (không có GPU?):', type(e).__name__)

# %% [markdown]
# ## 2. Cài dependencies
#
# Colab đã có sẵn `torch`, `numpy`, `pandas`, `pyarrow`, `Pillow`, `requests`. Chỉ cài thêm phần thiếu
# (không nâng cấp `torch` để giữ đúng bản CUDA của Colab).

# %%
def _pip(*pkgs):
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', *pkgs], check=True)

try:
    import sentence_transformers  # noqa: F401
except ImportError:
    _pip('sentence-transformers>=3.0')
try:
    import psycopg2  # noqa: F401
except ImportError:
    _pip('psycopg2-binary>=2.9')
try:
    import pyarrow  # noqa: F401
except ImportError:
    _pip('pyarrow>=14')

import hashlib
import io
import json
import math
import random
import re
import shutil
import threading
import time
import zipfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, unquote

import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras
import requests
import sentence_transformers
import torch
from PIL import Image, ImageFile
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ImageFile.LOAD_TRUNCATED_IMAGES = False  # ảnh bị cắt dở = ảnh lỗi, không "đoán" phần còn thiếu
print('torch', torch.__version__, '| CUDA available:', torch.cuda.is_available(),
      '| sentence-transformers', sentence_transformers.__version__, '| psycopg2', psycopg2.__version__)

# %% [markdown]
# ## 3. Cấu hình
#
# | RUN_MODE | Số sản phẩm (lát cắt của catalog) |
# |---|---|
# | `"test"` | 20 (Giai đoạn A, mặc định) |
# | `"100"`  | 100 (Giai đoạn B) |
# | `"500"`  | 500 (Giai đoạn C) |
# | `"full"` | toàn bộ catalog (Giai đoạn D) |
#
# Catalog được sắp theo một thứ tự giả ngẫu nhiên **cố định** (`md5(id)`), nên 20 SP của test nằm trong
# 100 SP của giai đoạn B, 100 nằm trong 500... Sản phẩm đã có embedding (cùng dữ liệu nguồn) sẽ được bỏ qua,
# nên chuyển giai đoạn không tính lại phần đã làm.

# %%
RUN_MODE = "test"            # "test" | "100" | "500" | "full"
LIMIT = None                 # None = theo RUN_MODE; hoặc đặt số nguyên để ghi đè
BATCH_SIZE = None            # None = tự chọn theo VRAM; hoặc số nguyên (vd 64)
IMAGE_WEIGHT = 0.7
TEXT_WEIGHT = 0.3

UPLOAD_TO_DB = True          # False = chỉ tạo + kiểm tra + export parquet, không ghi DB
FORCE_RECOMPUTE = False      # True = tính lại cả sản phẩm đã có embedding cùng dữ liệu nguồn
RETRY_FAILED_IMAGES = True   # SP có URL ảnh nhưng lần trước tải lỗi (đang text-only) -> thử tải lại
USE_GOOGLE_DRIVE = True      # lưu checkpoint/ảnh cache/parquet lên Drive để sống sót khi Colab disconnect
DRIVE_SUBDIR = "fashion-embeddings"

CHUNK_SIZE = 256             # số sản phẩm mỗi checkpoint (mất kết nối chỉ mất tối đa 1 chunk)
IMAGE_WORKERS = 16           # số luồng tải ảnh song song
IMAGE_TIMEOUT = (10, 30)     # (connect, read) giây
IMAGE_RETRIES = 3
IMAGE_MAX_BYTES = 20 * 1024 * 1024
UPLOAD_CHUNK = 200           # số dòng mỗi transaction khi upsert

# Ảnh có đường dẫn tương đối (/images/...) nằm trong web/public ở máy local, Colab không thấy.
# Chạy local: python scripts/embeddings/package_local_images.py -> upload local_images.zip vào
# MyDrive/<DRIVE_SUBDIR>/. Nếu không có zip, các sản phẩm đó dùng fallback text-only (có thống kê).
LOCAL_IMAGES_ZIP_NAME = "local_images.zip"
RELATIVE_IMAGE_BASE_URL = None   # hoặc "https://<frontend-domain>" nếu web đã deploy

# Model: KHÔNG đổi riêng lẻ. Text model được distill vào đúng không gian của image model này.
IMAGE_MODEL = "sentence-transformers/clip-ViT-B-32"
IMAGE_MODEL_REVISION = "327ab6726d33c0e22f920c83f2ff9e4bd38ca37f"
TEXT_MODEL = "sentence-transformers/clip-ViT-B-32-multilingual-v1"
TEXT_MODEL_REVISION = "58edf8cada9e398793dca955574a48cbb7f18be2"
EMBEDDING_DIM = 512
MODEL_NAME = "clip-ViT-B-32 (image) + clip-ViT-B-32-multilingual-v1 (text)"

# ---- kiểm tra cấu hình ----
_MODE_LIMITS = {"test": 20, "100": 100, "500": 500, "full": None}
assert RUN_MODE in _MODE_LIMITS, f"RUN_MODE phải là một trong {list(_MODE_LIMITS)}"
SCOPE_LIMIT = LIMIT if LIMIT is not None else _MODE_LIMITS[RUN_MODE]
assert IMAGE_WEIGHT >= 0 and TEXT_WEIGHT > 0, "TEXT_WEIGHT phải > 0 (fallback text-only cần text)"
if abs(IMAGE_WEIGHT + TEXT_WEIGHT - 1) > 1e-9:
    print(f"! IMAGE_WEIGHT + TEXT_WEIGHT = {IMAGE_WEIGHT + TEXT_WEIGHT} (không bằng 1). Vẫn chạy được vì vector "
          "cuối được chuẩn hoá L2, chỉ tỉ lệ giữa hai trọng số là có ý nghĩa.")

# model_version ghi vào DB (VARCHAR(150)) và là một phần của input_hash: đổi model/revision/trọng số
# -> hash đổi -> sản phẩm được tính lại.
MODEL_VERSION = (f"img={IMAGE_MODEL}@{IMAGE_MODEL_REVISION[:12]}|txt={TEXT_MODEL}@{TEXT_MODEL_REVISION[:12]}"
                 f"|w={IMAGE_WEIGHT:g}/{TEXT_WEIGHT:g}")
# hash của riêng phần model (không gồm trọng số): cho phép đổi trọng số mà không chạy lại model
MODALITY_VERSION = f"img={IMAGE_MODEL}@{IMAGE_MODEL_REVISION}|txt={TEXT_MODEL}@{TEXT_MODEL_REVISION}"
assert len(MODEL_VERSION) <= 150, len(MODEL_VERSION)

if IN_COLAB and USE_GOOGLE_DRIVE:
    from google.colab import drive
    drive.mount('/content/drive')
    BASE_DIR = Path('/content/drive/MyDrive') / DRIVE_SUBDIR
elif IN_COLAB:
    BASE_DIR = Path('/content') / DRIVE_SUBDIR
    print('! USE_GOOGLE_DRIVE=False: checkpoint nằm trên đĩa tạm của Colab, MẤT khi runtime bị reset.')
else:
    BASE_DIR = Path(os.environ.get('EMBEDDINGS_OUTPUT_DIR', 'colab_output')).resolve()

_slug = hashlib.sha1(MODALITY_VERSION.encode()).hexdigest()[:10]
CHECKPOINT_DIR = BASE_DIR / 'checkpoints' / _slug
IMAGE_CACHE_DIR = BASE_DIR / 'image_cache'
EXPORT_PATH = BASE_DIR / 'product_embeddings.parquet'
REPORT_DIR = BASE_DIR / 'reports'
for d in (CHECKPOINT_DIR, IMAGE_CACHE_DIR, REPORT_DIR):
    d.mkdir(parents=True, exist_ok=True)
LOCAL_IMAGE_ROOT = None
_zip = BASE_DIR / LOCAL_IMAGES_ZIP_NAME
if _zip.exists():
    LOCAL_IMAGE_ROOT = Path('/content/local_images') if IN_COLAB else BASE_DIR / 'local_images'
    if not (LOCAL_IMAGE_ROOT / '.extracted').exists():
        with zipfile.ZipFile(_zip) as zf:
            zf.extractall(LOCAL_IMAGE_ROOT)
        (LOCAL_IMAGE_ROOT / '.extracted').touch()

print('RUN_MODE', RUN_MODE, '| scope limit', SCOPE_LIMIT or 'toàn bộ', '| weights', IMAGE_WEIGHT, '/', TEXT_WEIGHT)
print('MODEL_VERSION', MODEL_VERSION)
print('output dir   ', BASE_DIR)
print('local images ', LOCAL_IMAGE_ROOT or f'(không có {LOCAL_IMAGES_ZIP_NAME}: ảnh /images/... -> fallback text)')

# %% [markdown]
# ## 4. Kết nối Supabase/PostgreSQL
#
# Secret đọc từ **Colab Secrets** (biểu tượng chìa khoá ở thanh bên trái, bật "Notebook access") hoặc biến môi trường.
# Không bao giờ in secret ra output.
#
# Cách 1: `DATABASE_URL` = `postgresql://USER:PASSWORD@HOST:PORT/DBNAME`
# Cách 2: `DB_URL` (dạng `jdbc:postgresql://HOST:PORT/DBNAME?...` giống file `.env` của backend, hoặc `postgresql://HOST:PORT/DBNAME`)
#        + `DB_USERNAME` + `DB_PASSWORD`
# Tuỳ chọn: `HF_TOKEN` (model public, token chỉ giúp tải nhanh/ít bị giới hạn hơn).

# %%
def get_secret(name):
    if IN_COLAB:
        try:
            from google.colab import userdata
            value = userdata.get(name)
            if value:
                return value
        except Exception:  # SecretNotFoundError / NotebookAccessError -> thử env
            pass
    return os.environ.get(name) or None


def db_params():
    url = get_secret('DATABASE_URL')
    user, password = get_secret('DB_USERNAME') or get_secret('DB_USER'), get_secret('DB_PASSWORD')
    if not url:
        url = get_secret('DB_URL')
    if not url:
        raise RuntimeError('Thiếu secret DATABASE_URL (hoặc DB_URL + DB_USERNAME + DB_PASSWORD). Xem COLAB_README.md')
    url = url.strip()
    if url.startswith('jdbc:'):
        url = url[len('jdbc:'):]
    u = urlparse(url)
    if u.scheme not in ('postgresql', 'postgres'):
        raise RuntimeError('DATABASE_URL/DB_URL phải bắt đầu bằng postgresql:// hoặc jdbc:postgresql://')
    params = dict(host=u.hostname, port=u.port or 5432, dbname=(u.path or '/postgres').lstrip('/') or 'postgres',
                  user=unquote(u.username) if u.username else user,
                  password=unquote(u.password) if u.password else password)
    if not params['user'] or not params['password']:
        raise RuntimeError('Thiếu user/password: đặt trong DATABASE_URL hoặc secret DB_USERNAME + DB_PASSWORD')
    return params


def connect(retries=3):
    params = db_params()
    for attempt in range(1, retries + 1):
        try:
            conn = psycopg2.connect(**params, sslmode='require', connect_timeout=15,
                                    application_name='colab-product-embeddings',
                                    keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=5)
            conn.autocommit = False
            return conn
        except psycopg2.OperationalError as e:
            # chỉ in loại lỗi + dòng đầu (không chứa password)
            print(f'  ! kết nối DB lỗi (lần {attempt}/{retries}): {str(e).splitlines()[0][:200]}')
            if attempt == retries:
                raise
            time.sleep(5 * attempt)


def read_query(conn, sql, params=None, setup=()):
    """Mọi truy vấn ĐỌC chạy trong transaction READ ONLY rồi rollback: Postgres sẽ từ chối nếu có lệnh ghi.
    setup: các câu lệnh cấu hình chạy trước trong cùng transaction (vd set_config(..., true))."""
    with conn.cursor() as cur:
        cur.execute('SET TRANSACTION READ ONLY')
        for stmt in setup:
            cur.execute(stmt)
        cur.execute(sql, params)
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
    conn.rollback()
    return pd.DataFrame(rows, columns=cols)


hf_token = get_secret('HF_TOKEN')
if hf_token:
    os.environ['HF_TOKEN'] = hf_token  # huggingface_hub tự đọc; không in ra
del hf_token

conn = connect()
_info = read_query(conn, "SELECT current_database() AS db, current_user AS usr, "
                         "split_part(version(), ' ', 2) AS pg, "
                         "(SELECT extversion FROM pg_extension WHERE extname = 'vector') AS pgvector")
print('Kết nối DB OK:', _info.iloc[0].to_dict())

# Bảng đích phải do Flyway migration V20261006000000__product_embeddings_pgvector.sql tạo sẵn.
# Notebook KHÔNG tạo/sửa schema.
_schema = read_query(conn, """
    SELECT a.attname AS column_name, format_type(a.atttypid, a.atttypmod) AS type
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('public.product_embeddings') AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum""")
if _schema.empty:
    raise RuntimeError('Không có bảng public.product_embeddings. Chạy migration Flyway '
                       'V20261006000000__product_embeddings_pgvector.sql trước (khởi động backend).')
_types = dict(zip(_schema.column_name, _schema.type))
_expected = {'product_id': 'bigint', 'embedding': f'vector({EMBEDDING_DIM})', 'source': 'character varying(10)',
             'model_version': 'character varying(150)', 'input_hash': 'character varying(64)'}
for col, typ in _expected.items():
    assert _types.get(col) == typ, f'public.product_embeddings.{col}: mong đợi {typ}, thực tế {_types.get(col)}'
_idx = read_query(conn, "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' "
                        "AND tablename = 'product_embeddings' AND indexdef ILIKE %s", ('%hnsw%',))
_cnt = read_query(conn, 'SELECT count(*) AS n FROM public.product_embeddings').n[0]
print('public.product_embeddings OK:', _types, '| HNSW index:', list(_idx.indexname) or 'KHÔNG CÓ', '| rows hiện có:', _cnt)

# %% [markdown]
# ## 5. Đọc sản phẩm (READ ONLY) và tạo text đầu vào
#
# Text chỉ ghép từ các trường **có thật** trong DB; trường NULL/rỗng bị bỏ qua, không bịa thêm.
# Thứ tự: tên → danh mục/loại → chất liệu → style → màu (tối đa 3 màu phổ biến nhất của variant) → đối tượng
# → tags → thương hiệu → mô tả (chỉ khi khác tên). Text model cắt ở 128 token nên phần quan trọng đặt trước.
#
# Ánh xạ mã sang tiếng Việt (là dịch giá trị có thật, không thêm thông tin): `product_type` (tshirt → áo thun...),
# `target_group`/`gender` (men → nam, girl → bé gái...). Bỏ: material = "Mixed" (không mang thông tin),
# tag trùng mã target_group/product_type, và mọi giá trị đã xuất hiện trong text.

# %%
PRODUCTS_SQL = """
SELECT p.id, p.slug, p.name, p.description, p.brand, p.product_type, p.material, p.style,
       p.target_group, p.gender, p.status, p.updated_at, c.name AS category_name,
       (SELECT string_agg(DISTINCT t.tag, ',') FROM public.product_style_tags t WHERE t.product_id = p.id) AS style_tags,
       (SELECT string_agg(DISTINCT t.tag, ',') FROM public.product_recommendation_tags t WHERE t.product_id = p.id) AS reco_tags,
       (SELECT string_agg(x.color, ', ' ORDER BY x.n DESC, x.color) FROM (
            SELECT v.color, count(*) AS n FROM public.product_variants v
            WHERE v.product_id = p.id AND coalesce(v.color, '') <> ''
            GROUP BY v.color ORDER BY n DESC, v.color LIMIT 3) x) AS colors,
       (SELECT i.image_url FROM public.product_images i WHERE i.product_id = p.id
        ORDER BY i.is_primary DESC NULLS LAST, i.sort_order NULLS LAST, i.id LIMIT 1) AS image_url
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
ORDER BY md5(p.id::text), p.id
LIMIT %(limit)s
"""

PRODUCT_TYPE_VI = {
    'tshirt': 'áo thun', 'polo': 'áo polo', 'shirt': 'áo sơ mi', 'pants': 'quần', 'shorts': 'quần short',
    'skirt': 'chân váy', 'dress': 'váy đầm', 'outerwear': 'áo khoác', 'accessories': 'phụ kiện',
    'homewear': 'đồ mặc nhà',
}
TARGET_GROUP_VI = {'men': 'nam', 'women': 'nữ', 'kids': 'trẻ em', 'family': 'gia đình'}
GENDER_VI = {'men': 'nam', 'women': 'nữ', 'girl': 'bé gái', 'boy': 'bé trai'}
# giá trị là mã hệ thống (không phải mô tả): bỏ khỏi tags / danh mục
CODE_VALUES = set(PRODUCT_TYPE_VI) | set(TARGET_GROUP_VI) | set(GENDER_VI) | {'accessories', 'unisex'}


def _clean(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return ''
    return re.sub(r'\s+', ' ', str(v)).strip()


def build_text(row):
    name = _clean(row['name'])
    parts, seen = [name], name.lower()

    def add(value, prefix=''):
        nonlocal seen
        value = _clean(value)
        if value and value.lower() not in seen:
            parts.append(prefix + value)
            seen += ' | ' + value.lower()

    category = _clean(row['category_name'])
    if category and category.lower() not in CODE_VALUES:
        add(category)
    add(PRODUCT_TYPE_VI.get(_clean(row['product_type']), ''))
    material = _clean(row['material'])
    if material.lower() != 'mixed':
        add(material, 'chất liệu ')
    add(row['style'], 'phong cách ')
    add(row['colors'], 'màu ')
    gender, target = _clean(row['gender']).lower(), _clean(row['target_group']).lower()
    if gender in ('girl', 'boy'):
        add(GENDER_VI[gender], 'dành cho ')
    elif target in TARGET_GROUP_VI:
        add(TARGET_GROUP_VI[target], 'dành cho ')
    elif gender in GENDER_VI:
        add(GENDER_VI[gender], 'dành cho ')
    if gender == 'unisex':
        add('unisex')
    tags = []
    for src in (row['style_tags'], row['reco_tags']):
        for t in _clean(src).split(','):
            t = t.strip()
            if t and t.lower() not in CODE_VALUES and t.lower() not in seen and t.lower() not in [x.lower() for x in tags]:
                tags.append(t)
    if tags:
        add(', '.join(sorted(tags, key=str.lower)))
    add(row['brand'], 'thương hiệu ')
    # mô tả thường là gạch đầu dòng "- a - b": đổi thành câu, cắt 200 ký tự (đặt cuối nên bị cắt token trước)
    desc = re.sub(r'(^|\s)[-•–]\s+', r'\1', _clean(row['description'])).strip(' .;')
    if desc and desc.lower() not in name.lower():
        add(desc[:200].rsplit(' ', 1)[0] if len(desc) > 200 else desc)
    return ', '.join(parts)


def sha256(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


products = read_query(conn, PRODUCTS_SQL, {'limit': SCOPE_LIMIT})
products['text_input'] = products.apply(build_text, axis=1)
products['image_url'] = products['image_url'].where(products['image_url'].notna(), None)
# input_hash: model + trọng số + text + url ảnh. Không đổi -> không tính lại.
products['input_hash'] = [sha256(f"{MODEL_VERSION}\n{t}\n{u or ''}")
                          for t, u in zip(products.text_input, products.image_url)]
# modal_hash: chỉ model + text + url ảnh -> tái dùng vector ảnh/text đã tính khi chỉ đổi trọng số
products['modal_hash'] = [sha256(f"{MODALITY_VERSION}\n{t}\n{u or ''}")
                          for t, u in zip(products.text_input, products.image_url)]
assert products.id.is_unique

print(f'Đọc {len(products)} sản phẩm (scope {SCOPE_LIMIT or "toàn bộ"}). '
      f'Có ảnh: {products.image_url.notna().sum()}, không ảnh: {products.image_url.isna().sum()}, '
      f'ảnh đường dẫn tương đối: {products.image_url.fillna("").str.startswith("/").sum()}')
print('target_group:', products.target_group.value_counts(dropna=False).to_dict())
print('\nVí dụ text thực tế đưa vào text model:')
for _, r in products.head(8).iterrows():
    print(f"- [{r.id}] {r['name']}\n    -> \"{r.text_input}\"")

# %% [markdown]
# ## 6. Load model (inference only, eval mode, không train)

# %%
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
if DEVICE == 'cuda':
    _props = torch.cuda.get_device_properties(0)
    VRAM_GB = _props.total_memory / 1024 ** 3
    print(f'GPU: {_props.name}, VRAM {VRAM_GB:.1f} GB')
else:
    VRAM_GB = 0
    print('! Không có CUDA: chạy CPU (chậm). Trên Colab: Runtime -> Change runtime type -> T4 GPU.')

if BATCH_SIZE is None:
    BATCH_SIZE = 256 if VRAM_GB >= 14 else 128 if VRAM_GB >= 7 else 64 if VRAM_GB >= 3.5 else 32
print('BATCH_SIZE =', BATCH_SIZE, '(tự giảm một nửa khi gặp CUDA OOM)')

from sentence_transformers import SentenceTransformer

_t = time.time()
img_model = SentenceTransformer(IMAGE_MODEL, revision=IMAGE_MODEL_REVISION, device=DEVICE)
txt_model = SentenceTransformer(TEXT_MODEL, revision=TEXT_MODEL_REVISION, device=DEVICE)
img_model.eval()
txt_model.eval()
for _m in (img_model, txt_model):
    for _p in _m.parameters():
        _p.requires_grad_(False)
print(f'Load model OK ({time.time() - _t:.0f}s). Text max_seq_length = {txt_model.max_seq_length} token')

with torch.inference_mode():
    _probe_img = img_model.encode([Image.new('RGB', (224, 224), (255, 255, 255))], convert_to_numpy=True)
    _probe_txt = txt_model.encode(['áo thun nam cotton màu trắng'], convert_to_numpy=True)
print('Image embedding dim:', _probe_img.shape[1], '| Text embedding dim:', _probe_txt.shape[1])
assert _probe_img.shape[1] == EMBEDDING_DIM and _probe_txt.shape[1] == EMBEDDING_DIM

_tok_lens = [len(txt_model.tokenizer(t, add_special_tokens=True)['input_ids']) for t in products.text_input]
_over = sum(l > txt_model.max_seq_length for l in _tok_lens)
print(f'Độ dài text (token): median {int(np.median(_tok_lens))}, max {max(_tok_lens)}; '
      f'{_over}/{len(_tok_lens)} text bị cắt ở {txt_model.max_seq_length} token (phần cuối = tags/brand/mô tả)')

# %% [markdown]
# ## 7. Tải ảnh: timeout, retry, HTTP error, URL không tồn tại, ảnh hỏng, không có ảnh
#
# Mỗi ảnh lỗi chỉ làm sản phẩm đó chuyển sang fallback text-only, không dừng pipeline.
# Ảnh tải được được cache trên Drive (`image_cache/`), lần chạy lại/resume không tải lại.

# %%
_thread_local = threading.local()


def _session():
    s = getattr(_thread_local, 'session', None)
    if s is None:
        s = requests.Session()
        retry = Retry(total=IMAGE_RETRIES, connect=IMAGE_RETRIES, read=IMAGE_RETRIES, backoff_factor=1.0,
                      status_forcelist=(429, 500, 502, 503, 504), allowed_methods=('GET',),
                      respect_retry_after_header=True, raise_on_status=False)
        s.mount('http://', HTTPAdapter(max_retries=retry))
        s.mount('https://', HTTPAdapter(max_retries=retry))
        s.headers['User-Agent'] = 'Mozilla/5.0 (product-embedding-pipeline)'
        _thread_local.session = s
    return s


def _decode(data):
    with Image.open(io.BytesIO(data)) as probe:
        probe.verify()  # phát hiện file hỏng/cắt dở
    img = Image.open(io.BytesIO(data))
    img.load()
    if min(img.size) < 32:
        raise ValueError(f'ảnh quá nhỏ {img.size}')
    if img.mode in ('RGBA', 'LA', 'P'):
        rgba = img.convert('RGBA')  # nền trong suốt -> nền trắng (mặc định sẽ thành nền đen)
        bg = Image.new('RGB', rgba.size, (255, 255, 255))
        bg.paste(rgba, mask=rgba.getchannel('A'))
        return bg
    return img.convert('RGB')


def fetch_image(url):
    """-> (PIL.Image | None, status). status: ok | cached | no_image | http_<code> | timeout | connection_error |
    too_large | not_image | decode_error | relative_unavailable | error_<Type>"""
    if not url:
        return None, 'no_image'
    try:
        if url.startswith('/'):
            if LOCAL_IMAGE_ROOT is not None and (LOCAL_IMAGE_ROOT / url.lstrip('/')).is_file():
                return _decode((LOCAL_IMAGE_ROOT / url.lstrip('/')).read_bytes()), 'ok'
            if not RELATIVE_IMAGE_BASE_URL:
                return None, 'relative_unavailable'
            url = RELATIVE_IMAGE_BASE_URL.rstrip('/') + url
        cached = IMAGE_CACHE_DIR / hashlib.sha1(url.encode()).hexdigest()
        if cached.exists():
            try:
                return _decode(cached.read_bytes()), 'cached'
            except Exception:  # noqa: BLE001 - cache hỏng -> tải lại
                cached.unlink(missing_ok=True)
        resp = _session().get(url, timeout=IMAGE_TIMEOUT, stream=True)
        if resp.status_code != 200:
            return None, f'http_{resp.status_code}'
        ctype = resp.headers.get('Content-Type', '')
        if ctype and not ctype.startswith('image/') and 'octet-stream' not in ctype:
            return None, 'not_image'
        data = bytearray()
        for chunk in resp.iter_content(64 * 1024):
            data += chunk
            if len(data) > IMAGE_MAX_BYTES:
                return None, 'too_large'
        img = _decode(bytes(data))  # chỉ cache ảnh decode được
        tmp = cached.with_name(f'{cached.name}.{threading.get_ident()}.tmp')
        tmp.write_bytes(data)
        tmp.replace(cached)
        return img, 'ok'
    except requests.exceptions.Timeout:
        return None, 'timeout'
    except requests.exceptions.ConnectionError:
        return None, 'connection_error'
    except (OSError, ValueError, Image.DecompressionBombError):
        return None, 'decode_error'
    except Exception as e:  # noqa: BLE001 - mọi lỗi ảnh -> fallback, không dừng pipeline
        return None, f'error_{type(e).__name__}'


def fetch_images(urls):
    with ThreadPoolExecutor(max_workers=IMAGE_WORKERS) as pool:
        return list(pool.map(fetch_image, urls))


_demo = products.head(4)
_demo_imgs = fetch_images(list(_demo.image_url))
for (_, r), (im, st) in zip(_demo.iterrows(), _demo_imgs):
    print(f"[{r.id}] {st:<22} {im.size if im else '-'}  {r.image_url}")

# %% [markdown]
# ## 8. Image embedding (batch, inference_mode, tự giảm batch khi CUDA OOM)

# %%
def encode_with_backoff(model, items, batch_size, what):
    """Encode theo batch; gặp CUDA OOM thì xoá cache, giảm batch một nửa và thử lại từ batch đang lỗi."""
    out, i, bs = [], 0, batch_size
    while i < len(items):
        try:
            with torch.inference_mode():
                emb = model.encode(items[i:i + bs], batch_size=bs, convert_to_numpy=True,
                                   normalize_embeddings=False, show_progress_bar=False)
            out.append(emb.astype(np.float32))
            i += bs
        except torch.cuda.OutOfMemoryError:
            if bs == 1:
                raise
            torch.cuda.empty_cache()
            bs = max(1, bs // 2)
            print(f'  ! CUDA OOM khi encode {what}: giảm batch xuống {bs}')
    return (np.concatenate(out) if out else np.zeros((0, EMBEDDING_DIM), np.float32)), bs


def encode_images(images, batch_size):
    return encode_with_backoff(img_model, images, batch_size, 'image')


_ok = [im for im, _ in _demo_imgs if im is not None]
if _ok:
    _demo_vimg, _ = encode_images(_ok, BATCH_SIZE)
    print('image embeddings:', _demo_vimg.shape, '| norm trước L2:', np.round(np.linalg.norm(_demo_vimg, axis=1), 3))
else:
    print('4 sản phẩm demo không có ảnh tải được (xem status ở cell 7)')

# %% [markdown]
# ## 9. Vietnamese text embedding

# %%
def encode_texts(texts, batch_size):
    return encode_with_backoff(txt_model, list(texts), batch_size, 'text')


_demo_vtxt, _ = encode_texts(_demo.text_input, BATCH_SIZE)
print('text embeddings:', _demo_vtxt.shape, '| norm trước L2:', np.round(np.linalg.norm(_demo_vtxt, axis=1), 3))

# %% [markdown]
# ## 10. Kết hợp image + text, 11. L2 normalization
#
# `e = L2( w_img * L2(v_image) + w_txt * L2(v_text) )`. Phải L2 từng vector trước khi cộng, nếu không vector
# có norm lớn hơn sẽ lấn át. Không có ảnh: `e = L2(v_text)`.

# %%
def l2_normalize(m):
    m = np.asarray(m, dtype=np.float32)
    norms = np.linalg.norm(m, axis=-1, keepdims=True)
    if np.any(norms <= 1e-12):
        raise ValueError('vector có norm = 0, không chuẩn hoá được')
    return m / norms


def fuse(v_img, v_txt, has_img):
    """v_img, v_txt: (n, 512) đã L2; has_img: (n,) bool. Hàng không ảnh: v_img bị bỏ qua."""
    has_img = np.asarray(has_img, dtype=bool)[:, None]
    mixed = np.where(has_img, IMAGE_WEIGHT * v_img + TEXT_WEIGHT * v_txt, v_txt)
    return l2_normalize(mixed)


_dt = l2_normalize(_demo_vtxt)
_di = np.zeros_like(_dt)
_has = np.array([im is not None for im, _ in _demo_imgs])
if _has.any():
    _di[_has] = l2_normalize(_demo_vimg)
_df = fuse(_di, _dt, _has)
print('final:', _df.shape, '| norm sau L2:', np.round(np.linalg.norm(_df, axis=1), 6))
for k in np.where(_has)[0]:
    print(f'  [{_demo.id.iloc[k]}] cos(final,image)={_df[k] @ _di[k]:.3f}  cos(final,text)={_df[k] @ _dt[k]:.3f}  '
          f'cos(image,text)={_di[k] @ _dt[k]:.3f}')

# %% [markdown]
# ## 12. Checkpoint/resume và chạy toàn bộ scope
#
# - Mỗi `CHUNK_SIZE` sản phẩm ghi một file `checkpoints/<model>/part-*.parquet` trên Drive (ghi file tạm rồi
#   rename, không có file dở dang).
# - Chạy lại (sau disconnect, hoặc chuyển giai đoạn): bỏ qua sản phẩm mà **DB** hoặc **checkpoint** đã có cùng
#   `input_hash`; tái dùng vector ảnh/text trong checkpoint nếu chỉ đổi trọng số (`modal_hash`).
# - Sản phẩm sửa dữ liệu (tên, màu, ảnh...) -> hash khác -> được tính lại.

# %%
def load_checkpoint():
    parts = sorted(CHECKPOINT_DIR.glob('part-*.parquet'))
    if not parts:
        return pd.DataFrame()
    frames = []
    for p in parts:
        try:
            frames.append(pd.read_parquet(p))
        except Exception as e:  # noqa: BLE001 - file hỏng (hiếm, vì ghi tmp+rename) -> bỏ, sẽ tính lại
            print(f'  ! bỏ checkpoint hỏng {p.name}: {type(e).__name__}')
    if not frames:
        return pd.DataFrame()
    df = pd.concat(frames, ignore_index=True).sort_values('created_at')
    return df


def write_part(rows):
    df = pd.DataFrame(rows)
    name = f"part-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')}.parquet"
    tmp = CHECKPOINT_DIR / (name + '.tmp')
    df.to_parquet(tmp, index=False)
    tmp.replace(CHECKPOINT_DIR / name)
    return name


def make_row(r, final, v_img, v_txt, source, img_status):
    return {
        'product_id': int(r.id), 'embedding': final.astype(np.float32).tolist(), 'source': source,
        'image_embedding': None if v_img is None else v_img.astype(np.float32).tolist(),
        'text_embedding': v_txt.astype(np.float32).tolist(),
        'model_name': MODEL_NAME, 'model_version': MODEL_VERSION,
        'image_model': IMAGE_MODEL, 'image_model_revision': IMAGE_MODEL_REVISION,
        'text_model': TEXT_MODEL, 'text_model_revision': TEXT_MODEL_REVISION,
        'image_weight': float(IMAGE_WEIGHT), 'text_weight': float(TEXT_WEIGHT),
        'input_hash': r.input_hash, 'modal_hash': r.modal_hash, 'text_input': r.text_input,
        'image_url': r.image_url, 'image_status': img_status,
        'source_updated_at': pd.Timestamp(r.updated_at).isoformat() if pd.notna(r.updated_at) else None,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }


in_db = read_query(conn, 'SELECT product_id, input_hash, source FROM public.product_embeddings WHERE product_id = ANY(%s)',
                   (list(map(int, products.id)),))
db_hash = dict(zip(in_db.product_id, in_db.input_hash))
db_source = dict(zip(in_db.product_id, in_db.source))
ckpt = load_checkpoint()
ck_by_input = {} if ckpt.empty else {h: r for h, r in zip(ckpt.input_hash, ckpt.to_dict('records'))}
ck_by_modal = {} if ckpt.empty else {h: r for h, r in zip(ckpt.modal_hash, ckpt.to_dict('records'))}

stats = Counter()
stats['total_products_in_scope'] = len(products)
todo, reuse_rows = [], []
for r in products.itertuples(index=False):
    # có URL ảnh mà embedding đang là text-only = lần trước tải ảnh lỗi (timeout, chưa có zip...) -> thử lại
    retry_img = RETRY_FAILED_IMAGES and r.image_url is not None
    if (not FORCE_RECOMPUTE and db_hash.get(r.id) == r.input_hash
            and not (retry_img and db_source.get(r.id) == 'text')):
        stats['skipped_already_in_db'] += 1
    elif (not FORCE_RECOMPUTE and r.input_hash in ck_by_input
          and not (retry_img and ck_by_input[r.input_hash]['source'] == 'text')):
        stats['reused_from_checkpoint'] += 1
    elif (not FORCE_RECOMPUTE and r.modal_hash in ck_by_modal
          and not (retry_img and ck_by_modal[r.modal_hash]['source'] == 'text')):
        c = ck_by_modal[r.modal_hash]  # chỉ đổi trọng số: fuse lại từ vector đã có, không chạy model
        v_txt = np.asarray(c['text_embedding'], np.float32)
        v_img = None if c['image_embedding'] is None else np.asarray(c['image_embedding'], np.float32)
        final = fuse((v_img if v_img is not None else np.zeros_like(v_txt))[None], v_txt[None],
                     [v_img is not None])[0]
        reuse_rows.append(make_row(r, final, v_img, v_txt, c['source'], c['image_status']))
        stats['reweighted_from_checkpoint'] += 1
    else:
        todo.append(r)
if reuse_rows:
    write_part(reuse_rows)
print(f"Scope {len(products)}: đã có trong DB {stats['skipped_already_in_db']}, có trong checkpoint "
      f"{stats['reused_from_checkpoint'] + stats['reweighted_from_checkpoint']}, cần chạy model {len(todo)}")

t0 = time.time()
for start in range(0, len(todo), CHUNK_SIZE):
    chunk = todo[start:start + CHUNK_SIZE]
    fetched = fetch_images([r.image_url for r in chunk])
    for _, st in fetched:
        stats[f'image_{st}'] += 1
    rows = []
    try:
        v_txt, BATCH_SIZE = encode_texts([r.text_input for r in chunk], BATCH_SIZE)
        v_txt = l2_normalize(v_txt)
        has = np.array([im is not None for im, _ in fetched])
        v_img = np.zeros_like(v_txt)
        if has.any():
            vi, BATCH_SIZE = encode_images([im for im, _ in fetched if im is not None], BATCH_SIZE)
            v_img[has] = l2_normalize(vi)
        final = fuse(v_img, v_txt, has)
    except Exception as e:  # noqa: BLE001 - lỗi cả chunk (hiếm): ghi nhận, sang chunk sau
        stats['embedding_failed'] += len(chunk)
        print(f'  ! chunk {start}-{start + len(chunk)} lỗi: {type(e).__name__}: {e}')
        continue
    for k, r in enumerate(chunk):
        vec = final[k]
        if vec.shape != (EMBEDDING_DIM,) or not np.isfinite(vec).all() or abs(np.linalg.norm(vec) - 1) > 1e-3:
            stats['embedding_failed'] += 1
            continue
        rows.append(make_row(r, vec, v_img[k] if has[k] else None, v_txt[k],
                             'fused' if has[k] else 'text', fetched[k][1]))
    if rows:
        part = write_part(rows)
    for im, _ in fetched:
        if im is not None:
            im.close()
    done = start + len(chunk)
    rate = done / max(time.time() - t0, 1e-6)
    print(f'  {done}/{len(todo)}  ({time.time() - t0:.0f}s, {rate:.1f} sp/s, batch {BATCH_SIZE}) -> {part if rows else "-"}')

# %% [markdown]
# ## 13. Kiểm tra kết quả (trước khi export/upload)
#
# Không coi là thành công chỉ vì code không báo lỗi: kiểm tra trên chính các vector vừa tạo.

# %%
ckpt = load_checkpoint()
if ckpt.empty:
    current = pd.DataFrame(columns=['product_id', 'input_hash'])
else:
    current = (ckpt[ckpt.input_hash.isin(set(products.input_hash))]
               .drop_duplicates('product_id', keep='last').reset_index(drop=True))

checks = []


def check(name, ok, detail=''):
    checks.append({'check': name, 'ok': bool(ok), 'detail': detail})
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f' - {detail}' if detail else ''))


need = {pid for pid, h in zip(products.id, products.input_hash) if FORCE_RECOMPUTE or db_hash.get(pid) != h}
check('mọi sản phẩm cần xử lý đều có embedding hợp lệ trong checkpoint',
      need <= set(current.product_id) if len(current) else not need,
      f'{len(need & set(current.product_id))}/{len(need)}')
if len(current):
    E = np.stack(current.embedding.map(lambda v: np.asarray(v, np.float32)).values)
    T = np.stack(current.text_embedding.map(lambda v: np.asarray(v, np.float32)).values)
    fused_mask = (current.source == 'fused').values
    I = np.zeros_like(T)
    if fused_mask.any():
        I[fused_mask] = np.stack(current.image_embedding[fused_mask].map(lambda v: np.asarray(v, np.float32)).values)
    check('1. image embedding tạo thành công', fused_mask.any() or not current.image_url.notna().any(),
          f'{fused_mask.sum()} sản phẩm có vector ảnh')
    check('2. text embedding tạo thành công', len(T) == len(current) and np.isfinite(T).all(), f'{len(T)} vector text')
    check('3. kích thước image/text embedding = 512', T.shape[1] == EMBEDDING_DIM and I.shape[1] == EMBEDDING_DIM,
          f'text {T.shape}, image {I.shape}')
    recon = fuse(I, T, fused_mask)
    check('4. fusion đúng công thức (tính lại từ vector ảnh/text)', np.allclose(recon, E, atol=1e-5),
          f'max |diff| = {np.abs(recon - E).max():.2e}')
    check('5. vector cuối đúng 512 chiều', E.shape[1] == EMBEDDING_DIM, str(E.shape))
    n = np.linalg.norm(E, axis=1)
    check('6. L2 norm = 1', np.allclose(n, 1, atol=1e-4), f'min {n.min():.6f}, max {n.max():.6f}')
    check('7. không có NaN', not np.isnan(E).any())
    check('8. không có Infinity', not np.isinf(E).any())
    check('text-only fallback đúng (vector cuối = vector text)',
          np.allclose(E[~fused_mask], T[~fused_mask], atol=1e-5) if (~fused_mask).any() else True,
          f'{(~fused_mask).sum()} sản phẩm text-only')
    if fused_mask.sum() >= 3:
        # bằng chứng ảnh và text cùng không gian: ảnh gần text của chính nó hơn text của sản phẩm khác
        Ii, Ti = I[fused_mask], T[fused_mask]
        S = Ii @ Ti.T
        matched, others = np.diag(S).mean(), (S.sum() - np.trace(S)) / (S.size - len(S))
        rank1 = (S.argmax(axis=1) == np.arange(len(S))).mean()
        # Kiểm định hoán vị: ghép ảnh với text của SP ngẫu nhiên 10.000 lần; nếu hai không gian không align thì
        # cặp đúng không nổi bật hơn cặp ngẫu nhiên (p lớn). Catalog cùng là quần áo nên mức nền cos đã cao,
        # một ngưỡng chênh lệch cố định không có ý nghĩa thống kê.
        rng = np.random.default_rng(0)
        idx = np.arange(len(S))
        perm_means = np.array([S[idx, rng.permutation(len(S))].mean() for _ in range(10_000)])
        p_value = (np.sum(perm_means >= matched) + 1) / (len(perm_means) + 1)
        check('ảnh và text cùng vector space (permutation test, p < 0.01)', p_value < 0.01,
              f'cos khớp {matched:.3f} vs khác {others:.3f}; p = {p_value:.4f}; '
              f'ảnh tìm đúng text của mình ở top-1: {rank1:.0%} (ngẫu nhiên: {1 / len(S):.0%})')
print('\nNguồn embedding:', current.source.value_counts().to_dict() if len(current) else {})
print('Trạng thái ảnh (lần chạy này):', {k: v for k, v in stats.items() if k.startswith('image_')})
VALIDATION_PASSED = all(c['ok'] for c in checks)
print('\nVALIDATION_PASSED =', VALIDATION_PASSED)

# %% [markdown]
# ## 14. Export embedding: `product_embeddings.parquet` (khôi phục được, không phải chạy model lại)

# %%
if len(current):
    export = current.copy()
    if EXPORT_PATH.exists():  # gộp với export cũ (các giai đoạn trước), bản mới nhất theo product_id thắng
        old = pd.read_parquet(EXPORT_PATH)
        old = old[~old.product_id.isin(export.product_id)]
        export = pd.concat([old, export], ignore_index=True)
    tmp = EXPORT_PATH.with_suffix('.parquet.tmp')
    export.to_parquet(tmp, index=False)
    tmp.replace(EXPORT_PATH)
    print(f'Đã ghi {EXPORT_PATH} ({len(export)} dòng, {EXPORT_PATH.stat().st_size / 1e6:.1f} MB)')
    print('Cột:', list(export.columns))
else:
    print('Không có embedding mới để export (mọi sản phẩm trong scope đã có trong DB).')

# %% [markdown]
# ## 15. Upload vào `public.product_embeddings` (chỉ UPSERT bảng này, parameterized)
#
# - Chỉ upload khi `VALIDATION_PASSED` và chỉ các dòng qua kiểm tra từng dòng.
# - `ON CONFLICT (product_id) DO UPDATE ... WHERE input_hash khác`: chạy lại không tạo duplicate, dòng giống hệt không bị ghi lại.
# - Mỗi `UPLOAD_CHUNK` dòng một transaction; mất kết nối thì kết nối lại và chạy tiếp từ chunk lỗi.

# %%
UPSERT_SQL = """
INSERT INTO public.product_embeddings (product_id, embedding, source, model_version, input_hash, updated_at)
VALUES %s
ON CONFLICT (product_id) DO UPDATE
   SET embedding = EXCLUDED.embedding, source = EXCLUDED.source, model_version = EXCLUDED.model_version,
       input_hash = EXCLUDED.input_hash, updated_at = now()
 WHERE public.product_embeddings.input_hash IS DISTINCT FROM EXCLUDED.input_hash
"""
UPSERT_TEMPLATE = '(%s, %s::vector, %s, %s, %s, now())'


def _assert_safe_write(sql):
    norm = ' '.join(sql.lower().split())
    assert norm.startswith('insert into public.product_embeddings '), 'chỉ được ghi public.product_embeddings'
    assert ';' not in norm, 'không cho phép nhiều câu lệnh'
    for forbidden in ('ettee.', 'delete ', 'drop ', 'truncate ', 'alter ', 'update public.products',
                      'public.orders', 'public.users'):
        assert forbidden not in norm, f'lệnh ghi chứa "{forbidden}"'


def to_pgvector(vec):
    return '[' + ','.join(repr(float(x)) for x in vec) + ']'


def row_is_valid(r):
    v = np.asarray(r['embedding'], np.float32)
    return (v.shape == (EMBEDDING_DIM,) and np.isfinite(v).all() and abs(np.linalg.norm(v) - 1) < 1e-3
            and r['source'] in ('fused', 'text') and len(r['input_hash']) == 64 and len(r['model_version']) <= 150)


uploaded_ids = []
if not UPLOAD_TO_DB:
    print('UPLOAD_TO_DB = False: bỏ qua upload. Parquet đã có ở', EXPORT_PATH)
elif not VALIDATION_PASSED:
    print('KHÔNG upload: VALIDATION_PASSED = False. Xem các dòng FAIL ở cell 13.')
elif not len(current):
    print('Không có gì để upload.')
else:
    _assert_safe_write(UPSERT_SQL)
    records = current.to_dict('records')
    valid = [r for r in records if row_is_valid(r)]
    print(f'{len(valid)}/{len(records)} dòng hợp lệ để upload')
    stats['embedding_invalid_not_uploaded'] += len(records) - len(valid)
    for s in range(0, len(valid), UPLOAD_CHUNK):
        batch = valid[s:s + UPLOAD_CHUNK]
        values = [(int(r['product_id']), to_pgvector(r['embedding']), r['source'], r['model_version'],
                   r['input_hash']) for r in batch]
        for attempt in range(1, 4):
            try:
                with conn.cursor() as cur:
                    cur.execute("SET LOCAL statement_timeout = '120s'")
                    psycopg2.extras.execute_values(cur, UPSERT_SQL, values, template=UPSERT_TEMPLATE,
                                                   page_size=UPLOAD_CHUNK)
                conn.commit()
                uploaded_ids += [v[0] for v in values]
                print(f'  upsert {s + len(batch)}/{len(valid)}')
                break
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
                print(f'  ! mất kết nối khi upload (lần {attempt}/3): {str(e).splitlines()[0][:150]}')
                try:
                    conn.close()
                except Exception:  # noqa: BLE001
                    pass
                if attempt == 3:
                    raise
                time.sleep(5 * attempt)
                conn = connect()
            except Exception:
                conn.rollback()
                raise
    print(f'Upload xong: {len(uploaded_ids)} dòng (dòng đã giống hệt trong DB không bị ghi lại)')

# %% [markdown]
# ## 16. Kiểm tra database sau khi upload (bằng chứng thực tế từ DB)
#
# Truy vấn similar dưới đây **giống hệt** `ProductRepository.findSimilarIdsByEmbedding` của backend:
# bật `hnsw.iterative_scan = relaxed_order` trong transaction, KNN qua HNSW kèm lọc `id <> :id`,
# `status = 'ACTIVE'`, cùng `target_group` (index quét tiếp tới khi đủ `LIMIT`), rồi sắp lại theo khoảng cách.

# %%
SIMILAR_SQL = """
WITH nn AS MATERIALIZED (
    SELECT p.id AS product_id, p.name, p.target_group, p.product_type,
           pe.embedding <=> (SELECT embedding FROM public.product_embeddings WHERE product_id = %(id)s) AS distance
    FROM public.product_embeddings pe
    JOIN public.products p ON p.id = pe.product_id
    WHERE p.id <> %(id)s
      AND p.status = 'ACTIVE'
      AND (CAST(%(tg)s AS VARCHAR) IS NULL OR p.target_group = CAST(%(tg)s AS VARCHAR))
    ORDER BY pe.embedding <=> (SELECT embedding FROM public.product_embeddings WHERE product_id = %(id)s)
    LIMIT %(limit)s
)
SELECT product_id, distance, name, target_group, product_type FROM nn WHERE distance IS NOT NULL ORDER BY distance
"""
ITERATIVE_SCAN = ("SELECT set_config('hnsw.iterative_scan', 'relaxed_order', true)",)
# = ProductRepository.findSimilarActive (fallback của backend khi không có embedding)
FALLBACK_SQL = """
SELECT p.id, p.name, p.product_type, p.target_group FROM public.products p
WHERE p.status = 'ACTIVE' AND p.product_type = %(ptype)s AND p.id <> %(id)s
  AND (CAST(%(tg)s AS VARCHAR) IS NULL OR p.target_group = CAST(%(tg)s AS VARCHAR))
LIMIT %(limit)s
"""

post = []


def pcheck(name, ok, detail=''):
    post.append({'check': name, 'ok': bool(ok), 'detail': detail})
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f' - {detail}' if detail else ''))


meta = products.set_index('id')


def meta_ok(pid, grp_n):
    if meta.status[pid] != 'ACTIVE':
        return False
    tg = None if pd.isna(meta.target_group[pid]) else meta.target_group[pid]
    return tg is None or grp_n.get(tg, 0) >= 2


total = read_query(conn, 'SELECT COUNT(*) AS n FROM public.product_embeddings').n[0]
by_src = read_query(conn, 'SELECT source, COUNT(*) AS n FROM public.product_embeddings GROUP BY source ORDER BY source')
dups = read_query(conn, 'SELECT COUNT(*) - COUNT(DISTINCT product_id) AS d FROM public.product_embeddings').d[0]
print('SELECT COUNT(*) FROM public.product_embeddings =', total, '|', dict(zip(by_src.source, by_src.n)))
pcheck('không có duplicate product_id', dups == 0)

scope_ids = list(map(int, products.id))
in_db_now = read_query(conn, """
    SELECT product_id, input_hash, vector_dims(embedding) AS dims, vector_norm(embedding) AS norm
    FROM public.product_embeddings WHERE product_id = ANY(%s)""", (scope_ids,))
expected_hash = dict(zip(products.id, products.input_hash))
fresh = in_db_now[in_db_now.product_id.map(expected_hash) == in_db_now.input_hash]
pcheck('9. embedding của scope nằm trong pgvector với đúng input_hash', len(fresh) == len(products) or not UPLOAD_TO_DB,
       f'{len(fresh)}/{len(products)}' + ('' if UPLOAD_TO_DB else ' (UPLOAD_TO_DB=False: không kiểm tra)'))
if len(in_db_now):
    pcheck('vector_dims = 512 trong DB', (in_db_now.dims == EMBEDDING_DIM).all())
    pcheck('vector_norm ≈ 1 trong DB', np.allclose(in_db_now.norm.astype(float), 1, atol=1e-4),
           f'min {in_db_now.norm.min():.6f}, max {in_db_now.norm.max():.6f}')

# chọn mẫu trong các target_group có >= 2 embedding ACTIVE (nhóm chỉ 1 SP thì không thể có lân cận cùng nhóm)
grp = read_query(conn, """
    SELECT p.target_group, COUNT(*) AS n FROM public.product_embeddings pe
    JOIN public.products p ON p.id = pe.product_id WHERE p.status = 'ACTIVE' GROUP BY p.target_group""")
grp_n = {(None if pd.isna(g) else g): n for g, n in zip(grp.target_group, grp.n)}
eligible = [pid for pid in fresh.product_id if meta_ok(pid, grp_n)]
random.seed(42)
sample_ids = random.sample(eligible, min(5, len(eligible)))
print(f'Mẫu kiểm tra similarity: {sample_ids} (chọn từ {len(eligible)} SP đủ điều kiện)')
if sample_ids and len(current):
    db_vecs = read_query(conn, 'SELECT product_id, embedding::text AS v FROM public.product_embeddings '
                               'WHERE product_id = ANY(%s)', (sample_ids,))
    local = current.set_index('product_id')
    diffs = [np.abs(np.asarray(json.loads(v), np.float32) - np.asarray(local.embedding[pid], np.float32)).max()
             for pid, v in zip(db_vecs.product_id, db_vecs.v) if pid in local.index]
    if diffs:
        pcheck('vector đọc lại từ DB khớp parquet', max(diffs) < 1e-5, f'max |diff| = {max(diffs):.2e}')

for pid in sample_ids:
    tg = meta.target_group[pid] if pd.notna(meta.target_group[pid]) else None
    res = read_query(conn, SIMILAR_SQL, {'id': int(pid), 'tg': tg, 'limit': 10}, setup=ITERATIVE_SCAN)
    print(f"\nINPUT [{pid}] [{meta.product_type[pid]}/{tg}] {meta.name[pid]}")
    for _, r in res.iterrows():
        print(f"   d={r.distance:.3f}  [{r.product_type}/{r.target_group}] {r['name']}")
    pcheck(f'10. cosine search trả kết quả cho {pid}', len(res) > 0, f'{len(res)} kết quả')
    pcheck(f'11. {pid} không có trong kết quả của chính nó', pid not in set(res.product_id))
    pcheck(f'12. cùng target_group ({tg})', tg is None or (res.target_group == tg).all())
    pcheck(f'distance tăng dần ({pid})', res.distance.is_monotonic_increasing)
    if len(current) and len(res):
        e0 = np.asarray(local.embedding[pid], np.float32) if pid in local.index else None
        both = [(d, local.embedding[q]) for q, d in zip(res.product_id, res.distance) if q in local.index]
        if e0 is not None and both:
            err = max(abs(d - (1 - float(e0 @ np.asarray(v, np.float32)))) for d, v in both)
            pcheck(f'distance pgvector = 1 - dot (numpy) ({pid})', err < 1e-4, f'max sai lệch {err:.2e}')

# 13. fallback: sản phẩm ACTIVE chưa có embedding -> query vector trả 0 dòng -> backend dùng luật cũ
missing = read_query(conn, """
    SELECT p.id, p.name, p.product_type, p.target_group FROM public.products p
    WHERE p.status = 'ACTIVE' AND p.product_type IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.product_embeddings pe WHERE pe.product_id = p.id)
    ORDER BY p.id LIMIT 1""")
if len(missing):
    m = missing.iloc[0]
    res = read_query(conn, SIMILAR_SQL, {'id': int(m.id), 'tg': m.target_group, 'limit': 10}, setup=ITERATIVE_SCAN)
    fb = read_query(conn, FALLBACK_SQL, {'ptype': m.product_type, 'tg': m.target_group, 'id': int(m.id), 'limit': 10})
    pcheck(f'13. SP chưa có embedding [{m.id}] -> vector query trả 0 dòng (backend chuyển sang fallback)', len(res) == 0)
    pcheck('13. fallback cùng product_type + target_group vẫn trả kết quả', len(fb) > 0 and
           (m.target_group is None or (fb.target_group == m.target_group).all()),
           f'{len(fb)} SP {m.product_type}/{m.target_group}')
else:
    print('13. Mọi sản phẩm ACTIVE đã có embedding: fallback được kiểm bằng unit test ProductSimilarServiceTest.')

if sample_ids:
    tg0 = meta.target_group[sample_ids[0]] if pd.notna(meta.target_group[sample_ids[0]]) else None
    plan = read_query(conn, 'EXPLAIN (ANALYZE, BUFFERS) ' + SIMILAR_SQL,
                      {'id': int(sample_ids[0]), 'tg': tg0, 'limit': 10}, setup=ITERATIVE_SCAN)
    lines = list(plan.iloc[:, 0])
    exec_ms = float(next(l for l in lines if l.startswith('Execution Time')).split()[2])
    uses_hnsw = any('idx_product_embeddings_hnsw' in l for l in lines)
    print('\n'.join(lines))
    print(f'Execution time {exec_ms:.2f} ms | dùng HNSW index: {uses_hnsw} '
          f'(nhóm target_group nhỏ thì planner có thể chọn quét tuần tự, chính xác và vẫn nhanh)')

POST_UPLOAD_PASSED = all(c['ok'] for c in post)
print('\nPOST_UPLOAD_PASSED =', POST_UPLOAD_PASSED)

# %% [markdown]
# ## Tổng kết lần chạy

# %%
img_ok = stats['image_ok'] + stats['image_cached']
img_failed = sum(v for k, v in stats.items() if k.startswith('image_') and k not in ('image_ok', 'image_cached', 'image_no_image'))
new_rows = [] if not len(current) else current[current.created_at >= datetime.fromtimestamp(t0, timezone.utc).isoformat()]
summary = {
    'run_mode': RUN_MODE, 'model_version': MODEL_VERSION, 'device': DEVICE, 'batch_size_final': BATCH_SIZE,
    'tong_so_san_pham_trong_scope': len(products),
    'bo_qua_da_co_trong_db': stats['skipped_already_in_db'],
    'tai_dung_tu_checkpoint': stats['reused_from_checkpoint'] + stats['reweighted_from_checkpoint'],
    'chay_model_lan_nay': len(todo),
    'anh_tai_thanh_cong': img_ok,
    'anh_tai_that_bai': img_failed,
    'san_pham_khong_co_anh': stats['image_no_image'],
    'chi_tiet_anh': {k[6:]: v for k, v in stats.items() if k.startswith('image_')},
    'san_pham_chi_dung_text': int((new_rows.source == 'text').sum()) if len(new_rows) else 0,
    'embedding_that_bai': stats['embedding_failed'] + stats['embedding_invalid_not_uploaded'],
    'embedding_thanh_cong': int(len(new_rows)) if len(new_rows) else 0,
    'da_upload_db': len(uploaded_ids),
    'rows_trong_product_embeddings': int(total),
    'validation_passed': VALIDATION_PASSED, 'post_upload_passed': POST_UPLOAD_PASSED,
    'checks': checks + post,
}
report = REPORT_DIR / f"run-{RUN_MODE}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}.json"
report.write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
for k, v in summary.items():
    if k != 'checks':
        print(f'{k:32} {v}')
print('\nBáo cáo:', report)
conn.close()
