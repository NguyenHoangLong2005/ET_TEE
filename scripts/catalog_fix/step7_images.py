"""Step 7: give the new products that have no image their photos from the Coolmate source
(per-colour thumbnails in mapped_variants). Each URL is checked before it is inserted.
Products that still end up without any image are set INACTIVE so they leave the storefront.

Run: python step7_images.py [--dry-run]
"""
import sys
import urllib.request

import raw
from colors import clean_name
from db import connect, finish, NEW_FILTER

DRY = '--dry-run' in sys.argv
HOST = 'https://media.coolmate.me'


def reachable(url):
    try:
        req = urllib.request.Request(url, method='GET', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200 and r.headers.get('Content-Type', '').startswith('image')
    except Exception:
        return False


conn = connect()
cur = conn.cursor()
cur.execute(f"""SELECT id, name, brand FROM products p WHERE {NEW_FILTER} AND status = 'ACTIVE'
                AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id)""")
missing = cur.fetchall()
print('products without images:', len(missing))
cool = raw.coolmate()
for pid, name, brand in missing:
    src = cool.get(name.strip().lower()) if brand == 'Coolmate' else None
    cur.execute("SELECT DISTINCT color, color_code, color_hex FROM product_variants WHERE product_id = %s", (pid,))
    by_colour = {c.lower(): (code, hex_) for c, code, hex_ in cur.fetchall() if c}
    urls = []
    if src:
        for colour, items in src['mapped_variants'].items():
            code, hex_ = by_colour.get((clean_name(colour) or '').lower(), (None, None))
            for it in items[:1]:
                for key in ('thumbnail', 'thumbnail_hover'):
                    if it.get(key):
                        urls.append((HOST + it[key], code, hex_))
        for key in ('default_thumbnail', 'default_thumbnail_hover'):
            if src.get(key):
                urls.insert(0, (HOST + src[key], None, None))
    seen, good = set(), []
    for u, code, hex_ in urls:
        if u not in seen and reachable(u):
            good.append((u, code, hex_))
        seen.add(u)
    for i, (u, code, hex_) in enumerate(good):
        cur.execute("""INSERT INTO product_images (product_id, image_url, alt, is_primary, sort_order, color_code, color_hex)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""", (pid, u, name[:255], i == 0, i, code or '', hex_ or ''))
    if not good:
        cur.execute("UPDATE products SET status = 'INACTIVE', updated_at = NOW() WHERE id = %s", (pid,))
    print(f'  {pid} {name[:60]!r}: {len(good)} images' + ('' if good else ' -> INACTIVE'))

cur.execute(f"""SELECT count(*) FROM products p WHERE {NEW_FILTER} AND status = 'ACTIVE'
                AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id)""")
print('active new products without images now:', cur.fetchone()[0])
finish(conn, DRY)
