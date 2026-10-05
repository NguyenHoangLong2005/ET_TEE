"""Step 2: clean colour names, give every colour a real swatch hex, normalise sizes,
drop duplicate (product, colour, size) variants and tag gallery images with their colour.

- Colour names lose supplier codes ("ĐEN 002" -> "Đen"); placeholders become NULL.
- YODY keeps the hex it publishes; other brands get a hex from the colour family.
  Hexes are made distinct within a product, because the storefront groups variants by
  colorHex (ProductInfo.tsx) and identical hexes collapse different colours into one swatch.
- Sizes: Free Size/Freesize/Default Title -> One Size (existing catalogue convention),
  XXXL -> 3XL, 2XL -> XXL when the product does not already have XXL.
- Images get color_code/color_hex of the variant colour they show, so ?color= deep links
  pick the right photo (ProductGallery.tsx).

Run: python step2_colors_sizes.py [--dry-run]
"""
import sys
from collections import defaultdict

from colors import clean_name, clean_size, distinct, hex_for, valid_hex
from common import color_code
from db import connect, finish, temp_table, NEW_FILTER

DRY = '--dry-run' in sys.argv
conn = connect()
cur = conn.cursor()

cur.execute(f"""SELECT v.id, v.product_id, p.brand, v.color, v.color_code, v.color_hex, v.size
                FROM product_variants v JOIN products p ON p.id = v.product_id
                WHERE p.{NEW_FILTER} ORDER BY v.product_id, v.id""")
rows = cur.fetchall()
by_product = defaultdict(list)
for r in rows:
    by_product[r[1]].append(r)

updates, drop = [], []
for pid, variants in by_product.items():
    has_xxl = any((v[6] or '').strip().upper() == 'XXL' for v in variants)
    colour_hex = {}           # display name -> hex, consistent inside the product
    display = {}              # raw colour -> display name
    used = set()
    seen = set()
    for vid, _, brand, color, code, hex_, size in variants:
        raw_key = (color or '').strip().lower()
        if raw_key not in display:
            name = clean_name(color)
            # Distinct supplier shades ("Trắng 001" / "Trắng 006") must stay distinct colours.
            if name is not None and name in display.values():
                n = 2
                while f'{name} {n}' in display.values():
                    n += 1
                name = f'{name} {n}'
            display[raw_key] = name
        name = display[raw_key]
        if name is None:
            new_hex, new_code = None, None
        else:
            if name not in colour_hex:
                base = (brand == 'YODY' and valid_hex(hex_)) or hex_for(name)
                colour_hex[name] = distinct(base, used)
                used.add(colour_hex[name])
            new_hex = colour_hex[name]
            # GUMAC/YODY/YaMe codes already link variants to images; others derive one.
            new_code = code or color_code(name)
        new_size = clean_size(size)
        if has_xxl and (size or '').strip().upper() == '2XL':
            new_size = '2XL'  # product sells both; keep them apart
        key = (raw_key, new_size)
        if key in seen:
            drop.append((vid,))
            continue
        seen.add(key)
        updates.append((vid, name and name[:50], new_code and str(new_code)[:30], new_hex, new_size and new_size[:50]))

temp_table(cur, 'vfix', 'id bigint, color text, code text, hex text, size text', updates)
temp_table(cur, 'vdrop', 'id bigint', drop)
cur.execute("""SELECT count(*) FROM cart_items c JOIN vdrop d ON d.id = c.product_variant_id""")
assert cur.fetchone()[0] == 0
cur.execute("DELETE FROM product_variants v USING vdrop d WHERE v.id = d.id")
print('duplicate variants removed:', cur.rowcount)
cur.execute("""UPDATE product_variants v SET color = f.color, color_code = f.code, color_hex = f.hex, size = f.size
               FROM vfix f WHERE v.id = f.id""")
print('variants updated:', cur.rowcount)

# Coolmate images carry the colour in the alt text ("<name> - <colour>").
cur.execute(f"""UPDATE product_images i SET color_code = v.color_code
                FROM products p, product_variants v
                WHERE p.id = i.product_id AND p.{NEW_FILTER} AND p.brand = 'Coolmate'
                  AND v.product_id = p.id AND v.color IS NOT NULL
                  AND lower(i.alt) LIKE '%% - ' || lower(v.color)""")

# Every image whose colour code matches a variant gets that variant's hex; others are cleared.
cur.execute(f"""UPDATE product_images i SET color_hex = v.hex
                FROM (SELECT DISTINCT product_id, color_code, color_hex hex FROM product_variants) v,
                     products p
                WHERE p.id = i.product_id AND p.{NEW_FILTER}
                  AND v.product_id = i.product_id AND v.color_code = i.color_code""")
print('images linked to a colour:', cur.rowcount)

# ── checks ─────────────────────────────────────────────────────────────────────────────
q = lambda sql: (cur.execute(sql), cur.fetchall())[1]
print('variants still #000000 (non-black name):', q(f"""SELECT count(*) FROM product_variants v JOIN products p
      ON p.id = v.product_id WHERE p.{NEW_FILTER} AND v.color_hex = '#000000'""")[0][0])
print('products where 2 colours share a hex:', q(f"""SELECT count(*) FROM (SELECT v.product_id, v.color_hex
      FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.{NEW_FILTER} AND v.color_hex IS NOT NULL
      GROUP BY 1, 2 HAVING count(DISTINCT v.color) > 1) x""")[0][0])
print('duplicate (product, colour, size):', q(f"""SELECT count(*) FROM (SELECT product_id, color, size
      FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.{NEW_FILTER}
      GROUP BY 1, 2, 3 HAVING count(*) > 1) x""")[0][0])
print('distinct colour names (new):', q(f"""SELECT count(DISTINCT color) FROM product_variants v
      JOIN products p ON p.id = v.product_id WHERE p.{NEW_FILTER}""")[0][0])
print('top colours:', q(f"""SELECT color, count(*) FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE p.{NEW_FILTER} GROUP BY 1 ORDER BY 2 DESC LIMIT 15"""))
print('sizes:', q(f"""SELECT size, count(*) FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE p.{NEW_FILTER} GROUP BY 1 ORDER BY 2 DESC LIMIT 25"""))
print('images with colour hex by brand:', q(f"""SELECT p.brand, count(*) FILTER (WHERE i.color_hex <> ''), count(*)
      FROM product_images i JOIN products p ON p.id = i.product_id WHERE p.{NEW_FILTER} GROUP BY 1"""))

finish(conn, DRY)
