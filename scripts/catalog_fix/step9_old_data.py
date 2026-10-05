"""Step 9: leftovers found in the review, mostly in the original 668-product catalogue.

- Same name on several different products (each has its own photo and slug code, e.g.
  "…-sm007", "…-sb319"): append the model code so shoppers can tell them apart. Names only;
  slugs stay, and orders keep product_name_snapshot.
- Old products filed under the wrong category (kids jeans under "accessories"): re-point
  category_id from target_group/product_type.
- YaMe colour names still carrying a line code ("California ns 147 be đen" -> "Be đen").

Run: python step9_old_data.py [--dry-run]
"""
import re
import sys

from db import connect, finish, temp_table

DRY = '--dry-run' in sys.argv
conn = connect()
cur = conn.cursor()

# ── duplicate names ────────────────────────────────────────────────────────────────────
cur.execute("""SELECT id, name, slug FROM products WHERE status = 'ACTIVE' AND lower(name) IN
               (SELECT lower(name) FROM products WHERE status = 'ACTIVE' GROUP BY 1 HAVING count(*) > 1)
               ORDER BY lower(name), id""")
rows, taken = [], set()
for pid, name, slug in cur.fetchall():
    m = re.search(r'-([a-z]{1,3}\d{2,})$', slug)
    code = m[1].upper() if m else str(pid)
    new = f'{name} - Mẫu {code}'
    while new.lower() in taken:
        new = f'{name} - Mẫu {code}-{pid}'
    taken.add(new.lower())
    rows.append((pid, new[:255]))
temp_table(cur, 'dupfix', 'id bigint, name text', rows)
cur.execute("UPDATE products p SET name = d.name, updated_at = NOW() FROM dupfix d WHERE p.id = d.id")
cur.execute("UPDATE inventories i SET product_name = left(d.name, 200) FROM dupfix d WHERE i.product_id = d.id")
print('products renamed to break duplicate names:', len(rows))
for pid, n in rows[:4]:
    print('  ', pid, n)

# ── categories ─────────────────────────────────────────────────────────────────────────
cur.execute("""UPDATE products p SET category_id = coalesce(
                   (SELECT id FROM categories WHERE slug = p.target_group || '-' || p.product_type),
                   (SELECT id FROM categories WHERE slug = p.target_group)), updated_at = NOW()
               FROM categories c
               WHERE c.id = p.category_id AND p.status = 'ACTIVE'
                 AND c.slug NOT IN (p.target_group, p.target_group || '-' || p.product_type)""")
print('category re-pointed:', cur.rowcount)

# ── colour names with line codes ───────────────────────────────────────────────────────
cur.execute(r"""UPDATE product_variants SET color = initcap(left(regexp_replace(color, '^.*\m[a-z]{2}\s*\d{3}\s+', '', 'i'), 1))
                       || substr(regexp_replace(color, '^.*\m[a-z]{2}\s*\d{3}\s+', '', 'i'), 2)
               WHERE color ~* '\m[a-z]{2}\s*\d{3}\s+\S'""")
print('colour names cleaned:', cur.rowcount)

q = lambda sql: (cur.execute(sql), cur.fetchone()[0])[1]
print('duplicate active names now:', q("""SELECT count(*) FROM (SELECT lower(name) FROM products
      WHERE status = 'ACTIVE' GROUP BY 1 HAVING count(*) > 1) x"""))
print('category mismatches now:', q("""SELECT count(*) FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'ACTIVE' AND c.slug NOT IN (p.target_group, p.target_group || '-' || p.product_type)"""))
print('colour names with codes now:', q(r"SELECT count(*) FROM product_variants WHERE color ~ '\d{3}'"))
finish(conn, DRY)
