"""Step 4: re-derive product_type / target_group / gender / category_id for the new products.

The seed put clothes (shorts, jackets, hoodies), towels and caps in the wrong buckets and left
kids' gender empty. Types are read from the leading words of the name ("Áo khoác …",
"Quần đùi …"); words later in the name are ignored so "Áo nỉ mũ liền" is not a hat.
Kids without "bé trai"/"bé gái" become gender 'unisex' (listed under both, see
ProductSpecification). Adds "Áo polo" and "Đầm" sub-categories so those stop landing in
"Áo thun" / "Chân váy".

Run: python step4_classify.py [--dry-run]
"""
import re
import sys
from collections import Counter

import raw
from db import connect, finish, temp_table, NEW_FILTER

DRY = '--dry-run' in sys.argv

LEAD = re.compile(r'^(?:combo|pack|set)\s*\d*\s*', re.I)
TYPE_PREFIX = [
    ('homewear', r'quần lót|quần sịp|quần boxer|quần brief|quần trunk|boxer|brief|trunk|bộ mặc nhà|đồ mặc nhà|'
                 r'bộ đồ mặc nhà|đồ ngủ|bộ ngủ|pyjama|pijama|khăn tắm|khăn mặt'),
    ('polo', r'áo thun polo|áo polo|áo len polo|polo'),
    ('outerwear', r'áo khoác|khoác|áo gió|áo phao|phao|áo nỉ|nỉ|áo hoodie|hoodie|áo len|áo cardigan|cardigan|'
                  r'áo blazer|blazer|áo vest|vest|áo ghi lê|ghi lê|áo gile|áo chống nắng|áo shrug|áo sweater|sweater|'
                  r'áo măng tô|măng tô|áo jacket|jacket|áo bomber'),
    ('shirt', r'áo sơ mi|sơ mi|áo sơ-mi|sơ-mi|áo kiểu|áo blouse|blouse'),
    ('tshirt', r'áo thun|áo phông|t-shirt|tshirt|áo tshirt|áo tanktop|áo tank top|tanktop|áo ba lỗ|ba lỗ|croptop|'
               r'áo croptop|áo bra|áo dài tay|áo tay dài|áo'),
    ('skirt', r'chân váy'),
    ('dress', r'đầm|váy liền|váy'),
    ('shorts', r'quần short|quần shorts|quần đùi|quần soóc|quần sooc|quần biker|short'),
    ('pants', r'quần'),
    ('accessories', r'nón|mũ|vớ|tất|ví|túi|balo|ba lô|thắt lưng|dây nịt|khăn|găng tay|khẩu trang|nước hoa|'
                    r'dép|giày|kính|móc khóa|ô|dù|kẹp|vòng|cột tóc|bao tay|xỏ ngón'),
]
TYPE_PREFIX = [(t, re.compile(rf'^(?:{p})(?!\w)', re.I)) for t, p in TYPE_PREFIX]

KIDS = re.compile(r'(?<!\w)(trẻ em|kid|kids|bé trai|bé gái|bé|em bé|thiếu nhi)(?!\w)', re.I)
BOY = re.compile(r'(?<!\w)(bé trai|boy|nam)(?!\w)', re.I)
GIRL = re.compile(r'(?<!\w)(bé gái|girl|nữ)(?!\w)', re.I)
WOMEN = re.compile(r'(?<!\w)(nữ|women|nàng)(?!\w)', re.I)
MEN = re.compile(r'(?<!\w)(nam|men)(?!\w)', re.I)
UNISEX = re.compile(r'(?<!\w)unisex(?!\w)', re.I)
BRAND_DEFAULT = {'YaMe': 'men', 'GUMAC': 'women'}


def product_type(name, current):
    s = LEAD.sub('', name.strip())
    for t, pat in TYPE_PREFIX:
        if pat.search(s):
            return t
    return current


def target_group(name, ptype, brand, current, cool_gender):
    if KIDS.search(name):
        return 'kids'
    w, m = WOMEN.search(name), MEN.search(name)
    if ptype in ('dress', 'skirt') or (w and not m):
        return 'women'
    if m and not w:
        return 'men'
    if cool_gender in ('MALE', 'FEMALE'):
        return 'men' if cool_gender == 'MALE' else 'women'
    if ptype == 'accessories':
        return 'accessories'
    if current in ('men', 'women', 'family'):
        return current
    return BRAND_DEFAULT.get(brand, 'men')


def gender(tg, name):
    if tg == 'kids':
        b, g = BOY.search(name), GIRL.search(name)
        if b and not g:
            return 'boy'
        if g and not b:
            return 'girl'
        return 'unisex'
    return tg if tg in ('men', 'women') else None


conn = connect()
cur = conn.cursor()

# New sub-categories for types that had no home.
NEW_CATS = [('men', 'polo', 'Áo polo', 2), ('women', 'polo', 'Áo polo', 2),
            ('kids', 'polo', 'Áo polo', 2), ('women', 'dress', 'Đầm', 7), ('kids', 'dress', 'Đầm', 7)]
cur.execute("SELECT id, slug FROM categories")
cat = {slug: cid for cid, slug in cur.fetchall()}
for tg, t, label, order in NEW_CATS:
    slug = f'{tg}-{t}'
    if slug not in cat:
        cur.execute("""INSERT INTO categories (name, slug, parent_id, active, display_order, created_at, updated_at,
                                               created_by)
                       VALUES (%s, %s, %s, true, %s, NOW(), NOW(), 'catalog-fix') RETURNING id""",
                    (label, slug, cat[tg], order))
        cat[slug] = cur.fetchone()[0]
        print('created category', slug, cat[slug])


def category_id(tg, t):
    return cat.get(f'{tg}-{t}') or cat.get(tg) or cat['men']


cool = raw.coolmate()
cur.execute(f"SELECT id, name, brand, product_type, target_group, gender, category_id FROM products WHERE {NEW_FILTER}")
rows, changes = [], Counter()
samples = []
for pid, name, brand, pt, tg, g, cid in cur.fetchall():
    cg = (cool.get(name.strip().lower()) or {}).get('gender_type') if brand == 'Coolmate' else None
    npt = product_type(name, pt)
    ntg = target_group(name, npt, brand, tg, cg)
    ng = gender(ntg, name)
    ncid = category_id(ntg, npt)
    if (npt, ntg, ng, ncid) != (pt, tg, g or None, cid):
        rows.append((pid, npt, ntg, ng, ncid))
        if npt != pt:
            changes[f'type {pt}->{npt}'] += 1
        if ntg != tg:
            changes[f'group {tg}->{ntg}'] += 1
        if len(samples) < 30 and (npt != pt or ntg != tg):
            samples.append((name, f'{tg}/{pt} -> {ntg}/{npt}', ng))

print(f'products reclassified: {len(rows)}')
for k, v in changes.most_common():
    print(f'  {k}: {v}')
for s in samples:
    print('  ', s)

temp_table(cur, 'cfix', 'id bigint, pt text, tg text, g text, cid bigint', rows)
cur.execute("""UPDATE products p SET product_type = c.pt, target_group = c.tg, gender = c.g, category_id = c.cid,
                      updated_at = NOW() FROM cfix c WHERE p.id = c.id""")
# Style tags carry the group/type too (seed wrote "<group>,<type>").
cur.execute("""DELETE FROM product_style_tags t USING cfix c, products p
               WHERE t.product_id = c.id AND p.id = c.id
                 AND t.tag IN ('men','women','kids','family','accessories','tshirt','shirt','polo','pants','shorts',
                               'outerwear','skirt','dress','homewear')""")
cur.execute("""INSERT INTO product_style_tags (product_id, tag)
               SELECT id, tg FROM cfix UNION SELECT id, pt FROM cfix ON CONFLICT DO NOTHING""")

cur.execute(f"""SELECT target_group, product_type, count(*) FROM products WHERE {NEW_FILTER}
                GROUP BY 1, 2 ORDER BY 1, 2""")
print('new catalogue by group/type:', cur.fetchall())
cur.execute(f"""SELECT count(*) FROM products WHERE {NEW_FILTER} AND target_group = 'accessories'
                AND product_type <> 'accessories'""")
print('clothing still in accessories group:', cur.fetchone()[0])
cur.execute(f"SELECT gender, count(*) FROM products WHERE {NEW_FILTER} AND target_group = 'kids' GROUP BY 1")
print('kids gender:', cur.fetchall())
cur.execute(f"""SELECT count(*) FROM products p JOIN categories c ON c.id = p.category_id
                WHERE p.{NEW_FILTER} AND c.slug NOT IN (p.target_group, p.target_group || '-' || p.product_type)""")
print('category not matching group/type:', cur.fetchone()[0])
finish(conn, DRY)
