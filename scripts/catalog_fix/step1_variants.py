"""Step 1: rebuild broken variants and merge YaMe per-colour duplicates.

GUMAC  - every variant was seeded as colour "Mặc định" with sizes only. Rebuild the variants
         from the raw SKU list, which carries the real colour, size and price per SKU.
YaMe   - each colour was crawled as its own product and the size was written into the colour
         column ("M/M"). Products whose names differ only by the trailing "màu <X>" are merged
         into one product (lowest id kept) with one colour per former product; images and
         tags move along. Merged-away products have no orders/carts/wishlists/reviews
         (asserted below), so they are deleted.

Run: python step1_variants.py [--dry-run]
"""
import re
import sys
from collections import defaultdict

from psycopg2.extras import execute_values

import raw
from common import color_code
from db import connect, finish, temp_table, NEW_FILTER

DRY = '--dry-run' in sys.argv
conn = connect()
cur = conn.cursor()


def new_products(brand):
    cur.execute(f"""SELECT p.id, p.name,
                      (SELECT image_url FROM product_images i WHERE i.product_id = p.id
                       ORDER BY sort_order, id LIMIT 1)
                    FROM products p WHERE p.{NEW_FILTER} AND p.brand = %s ORDER BY p.id""", (brand,))
    return cur.fetchall()


# ── GUMAC ──────────────────────────────────────────────────────────────────────────────
gumac = raw.gumac()
g_rows = new_products('GUMAC')
g_ids = [r[0] for r in g_rows]
cur.execute("SELECT product_id, size, stock FROM product_variants WHERE product_id = ANY(%s)", (g_ids,))
stock = {(pid, size): st for pid, size, st in cur.fetchall()}

variants = []
for pid, _, img in g_rows:
    rp, _ = gumac[raw.url_path(img)]
    seen = set()
    for s in rp['sku']:
        col, size = s['color']['name'].strip(), s['size']['name'].strip()
        if (col, size) in seen:
            continue
        seen.add((col, size))
        price = s['price']
        sale = s['salePrice'] if s.get('salePrice') and s['salePrice'] < price else None
        st = stock.get((pid, size), 45)
        variants.append((pid, f"GM-{pid}-{s['code']}"[:100], col[:50], str(s['color']['code'])[:30],
                         size[:50], price, sale, st, st))

cur.execute("DELETE FROM product_variants WHERE product_id = ANY(%s)", (g_ids,))
execute_values(cur, """INSERT INTO product_variants (product_id, sku, color, color_code, size,
                       price, sale_price, stock, available_quantity) VALUES %s""", variants, page_size=1000)
print(f'GUMAC: rebuilt {len(variants)} variants for {len(g_ids)} products')

# ── YaMe ───────────────────────────────────────────────────────────────────────────────
COLOR_RE = re.compile(r'^(?P<pre>.*\S)\s+[Mm]àu\s+(?P<color>.+?)(?P<post>\s+Phom\b.*)?$')
groups = defaultdict(list)
no_colour = []
for pid, name, _ in new_products('YaMe'):
    m = COLOR_RE.match(name.strip())
    if m:
        base = (m['pre'] + (m['post'] or '')).strip()
        groups[base.lower()].append((pid, base, m['color'].strip()))
    else:
        no_colour.append(pid)

# Products without a colour in the name are single-colour items: drop the size-as-colour value.
cur.execute("""UPDATE product_variants SET color = NULL, color_code = NULL, color_hex = NULL
               WHERE product_id = ANY(%s) AND (color = size OR color IN ('Default Title', 'Free Size'))""",
            (no_colour,))

ymap, names = [], []
for members in groups.values():
    members.sort()
    keep, base, _ = members[0]
    names.append((keep, base[:255]))
    for order, (pid, _, colour) in enumerate(members):
        ymap.append((pid, keep, order, colour[:50], color_code(colour)))
temp_table(cur, 'ymap', 'pid bigint, keep bigint, ord int, colour text, code text', ymap)
temp_table(cur, 'ynames', 'id bigint, name text', names)

cur.execute("""SELECT
    (SELECT count(*) FROM order_items o JOIN ymap m ON m.pid = o.product_id) +
    (SELECT count(*) FROM wishlist_items w JOIN ymap m ON m.pid = w.product_id) +
    (SELECT count(*) FROM product_reviews r JOIN ymap m ON m.pid = r.product_id) +
    (SELECT count(*) FROM product_placements x JOIN ymap m ON m.pid = x.product_id) +
    (SELECT count(*) FROM cart_items c JOIN product_variants v ON v.id = c.product_variant_id
       JOIN ymap m ON m.pid = v.product_id)""")
assert cur.fetchone()[0] == 0, 'merged products are referenced elsewhere - aborting'

cur.execute("""UPDATE product_variants v SET product_id = m.keep, color = m.colour, color_code = m.code,
                      color_hex = NULL
               FROM ymap m WHERE v.product_id = m.pid""")
cur.execute("""UPDATE product_images i SET product_id = x.keep, color_code = x.code,
                      sort_order = x.rn - 1, is_primary = (x.rn = 1)
               FROM (SELECT i.id, m.keep, m.code,
                            row_number() OVER (PARTITION BY m.keep ORDER BY m.ord, i.sort_order, i.id) rn
                     FROM product_images i JOIN ymap m ON m.pid = i.product_id) x
               WHERE i.id = x.id""")
for t in ('product_style_tags', 'product_recommendation_tags'):
    cur.execute(f"""INSERT INTO {t} (product_id, tag)
                    SELECT DISTINCT m.keep, t.tag FROM {t} t JOIN ymap m ON m.pid = t.product_id
                    WHERE m.pid <> m.keep ON CONFLICT DO NOTHING""")
    cur.execute(f"DELETE FROM {t} t USING ymap m WHERE m.pid = t.product_id AND m.pid <> m.keep")
cur.execute("DELETE FROM inventories i USING ymap m WHERE m.pid = i.product_id AND m.pid <> m.keep")
cur.execute("DELETE FROM products p USING ymap m WHERE m.pid = p.id AND m.pid <> m.keep")
merged_away = cur.rowcount
cur.execute("UPDATE products p SET name = n.name, updated_at = NOW() FROM ynames n WHERE p.id = n.id")

print(f'YaMe: {len(groups)} colour groups, {merged_away} duplicate products merged away, '
      f'{len(no_colour)} products without a colour in the name')

# ── checks ─────────────────────────────────────────────────────────────────────────────
cur.execute(f"""SELECT count(*) FROM product_variants v JOIN products p ON p.id = v.product_id
                WHERE p.{NEW_FILTER} AND v.color = v.size""")
print('variants with size in colour column:', cur.fetchone()[0])
cur.execute(f"""SELECT count(*) FROM product_variants v JOIN products p ON p.id = v.product_id
                WHERE p.{NEW_FILTER} AND v.color = 'Mặc định'""")
print('variants with colour "Mặc định":', cur.fetchone()[0])
cur.execute(f"""SELECT count(*) FROM (SELECT product_id, color, size FROM product_variants v
                JOIN products p ON p.id = v.product_id WHERE p.{NEW_FILTER}
                GROUP BY 1, 2, 3 HAVING count(*) > 1) x""")
print('duplicate (product, colour, size) combos:', cur.fetchone()[0])
cur.execute(f"""SELECT p.brand, p.name, v.color, v.size, count(*) FROM product_variants v
                JOIN products p ON p.id = v.product_id WHERE p.{NEW_FILTER}
                GROUP BY 1, 2, 3, 4 HAVING count(*) > 1 LIMIT 8""")
for r in cur.fetchall():
    print('   ', r)
cur.execute(f"""SELECT count(*) FROM products p WHERE p.{NEW_FILTER} AND
                (SELECT count(*) FROM product_images i WHERE i.product_id = p.id AND i.is_primary) > 1""")
print('products with >1 primary image:', cur.fetchone()[0])
cur.execute(f"SELECT count(*) FROM products WHERE {NEW_FILTER}")
print('new products now:', cur.fetchone()[0])

finish(conn, DRY)
