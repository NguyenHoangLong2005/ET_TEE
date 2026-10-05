"""Step 5: replace seeded placeholder content on the new products with real data or nothing.

- average_rating was 5.0 with 0 reviews -> 0 / 0 (ratings come from product_reviews only).
- is_new was true for every import -> true only when the source published it in the last
  90 days (YaMe has publish dates; the other sources do not, so false).
- material was one constant per brand -> parsed from the source ("Chất liệu: …" in YaMe,
  GUMAC copy), else from fabric words in the name; NULL when unknown (UI: "Đang cập nhật").
- description was "<name> - Thương hiệu X chất lượng cao." -> source copy as plain text
  (GUMAC: its feature bullets), NULL when the source has none.

Run: python step5_content.py [--dry-run]
"""
import re
import sys
from datetime import datetime, timedelta, timezone

import raw
from db import connect, finish, temp_table, NEW_FILTER

DRY = '--dry-run' in sys.argv
NEW_SINCE = datetime(2026, 10, 2, tzinfo=timezone.utc) - timedelta(days=90)

FABRICS = [
    (r'cotton compact', 'Cotton Compact'), (r'cotton usa', 'Cotton USA'), (r'cotton', 'Cotton'),
    (r'linen|vải lanh|đũi', 'Linen'), (r'kaki|khaki', 'Kaki'), (r'denim|jeans?\b', 'Denim'),
    (r'modal', 'Modal'), (r'bamboo|sợi tre', 'Sợi tre (Bamboo)'), (r'excool|coolmax|cool-max', 'Coolmax'),
    (r'airism', 'AIRism'), (r'polyester|poly\b', 'Polyester'), (r'spandex', 'Spandex'), (r'nylon', 'Nylon'),
    (r'\bnỉ\b|fleece', 'Nỉ'), (r'\blen\b|wool', 'Len'), (r'lụa|silk', 'Lụa'), (r'voan|chiffon', 'Voan'),
    (r'tuyết mưa', 'Tuyết mưa'), (r'tweed', 'Tweed'), (r'nhung|velvet', 'Nhung'), (r'\bren\b|lace', 'Ren'),
    (r'cá sấu|pique', 'Cá sấu (Pique)'), (r'da bò', 'Da bò'), (r'da lộn|suede', 'Da lộn'),
    (r'simili|da tổng hợp|da pu|\bpu\b', 'Da tổng hợp (PU)'), (r'\bdù\b', 'Vải dù'), (r'tencel', 'Tencel'),
    (r'thun lạnh', 'Thun lạnh'), (r'canvas', 'Canvas'), (r'\beva\b', 'EVA'),
]
FABRICS = [(re.compile(p, re.I), name) for p, name in FABRICS]
PROMO = re.compile(r'hệ thống|cửa hàng|showroom|hotline|inbox|website|fanpage|nhanh tay|đặt hàng|mua ngay|'
                   r'trang bán hàng|sàn thương mại|liên hệ|zalo', re.I)
CODES = re.compile(r'\s*#Y2010\s*\d+|\s+\b(?:NB|NS|BG)\s*\d{2,}\b')


def fabrics_in(text):
    found = []
    for pat, name in FABRICS:
        if pat.search(text) and not any(name in f or f in name for f in found):
            found.append(name)
    return ', '.join(found[:3]) or None


def yame_content(p):
    text = CODES.sub('', raw.html_to_text(p.get('body_html')))
    lines = text.split('\n')
    if lines and len(lines[0]) < 120 and not lines[0].startswith('-'):
        lines = lines[1:]                                    # the <h1> repeats the name
    m = re.search(r'Chất liệu:\s*([^\n]+)', text)
    material = m[1].strip(' .') if m else None
    desc = '\n'.join(ln for ln in lines if not ln.lower().startswith('chất liệu:'))
    return material, desc.strip() or None


def gumac_content(p):
    text = raw.html_to_text(p.get('description'))
    m = re.search(r'(?:Chất liệu|Chất vải|Thành phần)\s*[:：]\s*([^\n]{2,120})', text, re.I)
    # Only an explicit "Chất liệu:" line; scanning the marketing copy picked up styling tips
    # ("phối cùng quần jean" -> Denim). Otherwise the caller falls back to the product name.
    material = m[1].strip(' .') if m else None
    feats = [f.get('label', '').strip() for f in p.get('outstandingFeatures') or [] if isinstance(f, dict)]
    feats = [f for f in feats if f and not PROMO.search(f)]
    if feats:
        desc = '\n'.join(f'- {f}' for f in feats)
    else:
        sentences = re.split(r'(?<=[.!?])\s+|\n', text)
        desc = ' '.join(s for s in sentences if s and not PROMO.search(s) and not s.isupper())[:1200]
    return material, desc.strip() or None


conn = connect()
cur = conn.cursor()
cur.execute(f"""SELECT p.id, p.brand, p.name, array_agg(i.image_url ORDER BY i.sort_order)
                FROM products p LEFT JOIN product_images i ON i.product_id = p.id
                WHERE p.{NEW_FILTER} GROUP BY 1, 2, 3""")
products = cur.fetchall()
Y, G = raw.yame(), raw.gumac()

rows, per_brand = [], {}
stats = {'material': 0, 'desc': 0, 'new': 0}
for pid, brand, name, imgs in products:
    imgs = [u for u in imgs if u]
    material = desc = None
    is_new = False
    if brand == 'YaMe':
        sources = {id(Y[raw.url_path(u)]): Y[raw.url_path(u)] for u in imgs if raw.url_path(u) in Y}.values()
        sources = list(sources)
        if sources:
            material, desc = yame_content(sources[0])
            dates = [datetime.fromisoformat(s['published_at']) for s in sources if s.get('published_at')]
            is_new = bool(dates) and max(dates) >= NEW_SINCE
    elif brand == 'GUMAC':
        src = next((G[raw.url_path(u)][0] for u in imgs if raw.url_path(u) in G), None)
        if src:
            material, desc = gumac_content(src)
    material = material or fabrics_in(name)
    if material:
        if len(material) > 100:                               # products.material is varchar(100)
            cut = material[:100]
            material = cut[:cut.rfind(',')] if ',' in cut else cut.rstrip()
        stats['material'] += 1
    if desc:
        desc = desc[:4000]
        stats['desc'] += 1
    stats['new'] += is_new
    rows.append((pid, material, desc, is_new))
    per_brand.setdefault(brand, [0, 0, 0])
    per_brand[brand][0] += 1
    per_brand[brand][1] += bool(material)
    per_brand[brand][2] += bool(desc)

print(f"products: {len(rows)}  with material: {stats['material']}  with description: {stats['desc']}  "
      f"is_new: {stats['new']}")
print('per brand [products, material, description]:', per_brand)
for r in rows[::max(1, len(rows) // 6)][:6]:
    print('  ', r[0], '| material:', r[1], '| desc:', (r[2] or '')[:140].replace('\n', ' / '))

temp_table(cur, 'kfix', 'id bigint, material text, description text, is_new boolean', rows)
cur.execute("""UPDATE products p SET material = k.material, description = k.description, is_new = k.is_new,
                      is_best_seller = false, average_rating = 0, total_reviews = 0, sold_count = 0,
                      updated_at = NOW()
               FROM kfix k WHERE p.id = k.id""")
cur.execute(f"""SELECT count(*) FILTER (WHERE average_rating > 0 AND total_reviews = 0),
                       count(*) FILTER (WHERE description ILIKE '%%chất lượng cao.'),
                       count(*) FILTER (WHERE is_new)
                FROM products WHERE {NEW_FILTER}""")
print('rating without reviews / template descriptions / is_new:', cur.fetchone())
finish(conn, DRY)
