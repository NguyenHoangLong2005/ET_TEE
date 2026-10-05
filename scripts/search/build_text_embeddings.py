#!/usr/bin/env python3
"""Sprint 5: vector van ban rieng cho moi san pham -> product_text_embeddings (CPU, vai phut).

    python scripts/search/build_text_embeddings.py          # chi tinh san pham moi / doi text
    python scripts/search/build_text_embeddings.py --all

Text dau vao GIONG HET Sprint 1 (PRODUCTS_SQL + build_text cua cell 5 trong
scripts/embeddings/colab_product_embeddings.py - sua mot ben thi sua ca ben kia). Model va revision
cung la cua Sprint 1, chay offline tu cache Hugging Face.
"""
import argparse
import hashlib
import math
import os
import re
import sys
from pathlib import Path

os.environ.setdefault('HF_HUB_OFFLINE', '1')

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'embeddings'))
from common import connect, to_pgvector  # noqa: E402

TEXT_MODEL = "sentence-transformers/clip-ViT-B-32-multilingual-v1"
TEXT_MODEL_REVISION = "58edf8cada9e398793dca955574a48cbb7f18be2"
MODEL_VERSION = f"txt={TEXT_MODEL}@{TEXT_MODEL_REVISION[:12]}"

# ── cell 5 cua Sprint 1 ───────────────────────────────────────────────────────
PRODUCTS_SQL = """
SELECT p.id, p.slug, p.name, p.description, p.brand, p.product_type, p.material, p.style,
       p.target_group, p.gender, p.status, p.updated_at, c.name AS category_name,
       (SELECT string_agg(DISTINCT t.tag, ',') FROM public.product_style_tags t WHERE t.product_id = p.id) AS style_tags,
       (SELECT string_agg(DISTINCT t.tag, ',') FROM public.product_recommendation_tags t WHERE t.product_id = p.id) AS reco_tags,
       (SELECT string_agg(x.color, ', ' ORDER BY x.n DESC, x.color) FROM (
            SELECT v.color, count(*) AS n FROM public.product_variants v
            WHERE v.product_id = p.id AND coalesce(v.color, '') <> ''
            GROUP BY v.color ORDER BY n DESC, v.color LIMIT 3) x) AS colors
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE p.status = 'ACTIVE'
ORDER BY p.id
"""

PRODUCT_TYPE_VI = {
    'tshirt': 'áo thun', 'polo': 'áo polo', 'shirt': 'áo sơ mi', 'pants': 'quần', 'shorts': 'quần short',
    'skirt': 'chân váy', 'dress': 'váy đầm', 'outerwear': 'áo khoác', 'accessories': 'phụ kiện',
    'homewear': 'đồ mặc nhà',
}
TARGET_GROUP_VI = {'men': 'nam', 'women': 'nữ', 'kids': 'trẻ em', 'family': 'gia đình'}
GENDER_VI = {'men': 'nam', 'women': 'nữ', 'girl': 'bé gái', 'boy': 'bé trai'}
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
    desc = re.sub(r'(^|\s)[-•–]\s+', r'\1', _clean(row['description'])).strip(' .;')
    if desc and desc.lower() not in name.lower():
        add(desc[:200].rsplit(' ', 1)[0] if len(desc) > 200 else desc)
    return ', '.join(parts)
# ──────────────────────────────────────────────────────────────────────────────


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--all', action='store_true', help='tinh lai ca san pham khong doi')
    ap.add_argument('--batch', type=int, default=64)
    args = ap.parse_args()

    conn = connect()
    cur = conn.cursor()
    cur.execute(PRODUCTS_SQL)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    cur.execute("SELECT product_id, input_hash FROM product_text_embeddings")
    existing = dict(cur.fetchall())

    todo = []
    for r in rows:
        text = build_text(r)
        h = hashlib.sha256(f"{MODEL_VERSION}\n{text}".encode('utf-8')).hexdigest()
        if args.all or existing.get(r['id']) != h:
            todo.append((r['id'], text, h))
    print(f"{len(rows)} san pham ACTIVE, can tinh {len(todo)}")
    if not todo:
        return

    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(TEXT_MODEL, revision=TEXT_MODEL_REVISION, device='cpu')
    for i in range(0, len(todo), args.batch):
        chunk = todo[i:i + args.batch]
        vecs = model.encode([t for _, t, _ in chunk], batch_size=args.batch, normalize_embeddings=True)
        for (pid, _, h), v in zip(chunk, vecs):
            cur.execute("""
                INSERT INTO product_text_embeddings (product_id, embedding, model_version, input_hash, updated_at)
                VALUES (%s, %s::vector, %s, %s, now())
                ON CONFLICT (product_id) DO UPDATE
                SET embedding = EXCLUDED.embedding, model_version = EXCLUDED.model_version,
                    input_hash = EXCLUDED.input_hash, updated_at = now()
            """, (pid, to_pgvector(v), MODEL_VERSION, h))
        conn.commit()
        print(f"  {min(i + args.batch, len(todo))}/{len(todo)}", flush=True)
    conn.close()


if __name__ == '__main__':
    main()
