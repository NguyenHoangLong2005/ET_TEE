"""Step 3: strip supplier/internal codes from product names and regenerate slugs.

YaMe   "… phom rộng F4 - The No Style 269", "#Y2010 265", "NB 027"
GUMAC  "CV Vải A-72", "Q-Tây Suông - 2598", "ATBG09111-Áo Thun …"
YODY   "( AKM5041 )", "-STN7032", "Quần Quần Âu"
If two products end up with the same name, the removed model number is kept as "- Mã <n>".
Slugs of the new products are regenerated from the final name (they are not linked from
any order/cart/wishlist yet).

Run: python step3_names.py [--dry-run]
"""
import re
import sys
from collections import defaultdict

from common import slugify
from db import connect, finish, temp_table, NEW_FILTER

DRY = '--dry-run' in sys.argv

# YaMe product lines: "The No Style", "The CEO", "The Homebody", "Seventy Seven", …
YAME_LINES = r'The(?:\s+[A-Z][\w]*){1,2}|Seventy Seven|Non Branded|Beginner|Multi Color Jean|Basic'


def clean(name, brand):
    s = re.sub(r'\s+', ' ', name).strip()
    code = None

    def grab(m):
        nonlocal code
        nums = re.findall(r'\d{2,}', m.group(0))
        if nums and code is None:
            code = nums[-1]
        return ' '

    if brand == 'YaMe':
        s = re.sub(r'\s*#Y2010\s*\d+', grab, s)
        s = re.sub(r'\s+\b(?:NB|NS|BG)\s*\d{2,}\b', grab, s)
        s = re.sub(rf'\s*-?\s*\b(?:{YAME_LINES})\s+\d{{2,}}\b', grab, s)
        s = re.sub(r'\s+F\d\b', ' ', s)
        s = re.sub(r'\s+\d{3}(?=\s|$)', grab, s)            # "Cool Touch 002", "Non Iron 006"
    elif brand == 'GUMAC':
        s = re.sub(r'^[A-Z]{2,}\d+\s*-\s*', '', s)            # "ATBG09111-", "VG10156-"
        s = re.sub(r'^CV\b', 'Chân váy', s)
        s = re.sub(r'^Q[-.]\s*', 'Quần ', s)
        s = re.sub(r'^A[-.]\s*', 'Áo ', s)
        s = re.sub(r'\s*-\s*\d{2,4}$', grab, s)               # "-72", " - 2594"
    elif brand == 'YODY':
        s = re.sub(r'\s*\(\s*[A-Za-z]{2,4}\s*\d{3,5}\s*\)', grab, s)
        s = re.sub(r'\s*-\s*[A-Z]{2,4}\d{4}$', grab, s)
        s = re.sub(r'\(([A-Za-z]{2,4}\d{3,5})\)', grab, s)
    s = re.sub(r'^(\w+) \1\b', r'\1', s, flags=re.I)          # "Quần Quần Âu"
    s = re.sub(r'\s+', ' ', s).strip(' -,')
    s = re.sub(r'\s+,', ',', s)
    if s:
        s = s[0].upper() + s[1:]
    return s, code


conn = connect()
cur = conn.cursor()
cur.execute(f"SELECT id, name, brand FROM products WHERE {NEW_FILTER} ORDER BY id")
new = cur.fetchall()
cur.execute(f"SELECT lower(name) FROM products WHERE NOT {NEW_FILTER} AND status <> 'DELETED'")
taken = {r[0] for r in cur.fetchall()}

cleaned = {}
by_name = defaultdict(list)
for pid, name, brand in new:
    s, code = clean(name, brand)
    cleaned[pid] = (s, code, name)
    by_name[s.lower()].append(pid)

final = {}
for key, pids in by_name.items():
    clash = len(pids) > 1 or key in taken
    for i, pid in enumerate(pids):
        s, code, orig = cleaned[pid]
        if clash:
            s = f'{s} - Mã {code}' if code else (s if i == 0 and key not in taken else f'{s} - Mẫu {i + 1}')
        final[pid] = s

# Second pass: anything still clashing gets its id.
seen = set(taken)
for pid in sorted(final):
    k = final[pid].lower()
    if k in seen:
        final[pid] = f'{final[pid]} - Mẫu {pid}'
    seen.add(final[pid].lower())

cur.execute(f"SELECT slug FROM products WHERE NOT {NEW_FILTER} AND status <> 'DELETED'")
slugs = {r[0] for r in cur.fetchall()}
rows = []
for pid in sorted(final):
    slug = slugify(final[pid], 200) or f'san-pham-{pid}'
    if slug in slugs:
        slug = f'{slug}-{pid}'
    slugs.add(slug)
    rows.append((pid, final[pid][:255], slug))

changed = [(pid, cleaned[pid][2], final[pid]) for pid in sorted(final) if final[pid] != cleaned[pid][2]]
print(f'names changed: {len(changed)} of {len(final)}')
for pid, a, b in changed[:: max(1, len(changed) // 25)][:25]:
    print(f'  {a!r}\n    -> {b!r}')

temp_table(cur, 'nfix', 'id bigint, name text, slug text', rows)
# Two-phase so a new slug never collides with one this run is about to free.
cur.execute("UPDATE products p SET slug = 'tmp-' || p.id FROM nfix n WHERE p.id = n.id")
cur.execute("UPDATE products p SET name = n.name, slug = n.slug, updated_at = NOW() FROM nfix n WHERE p.id = n.id")
cur.execute("""UPDATE product_images i SET alt = left(p.name, 255)
               FROM nfix n JOIN products p ON p.id = n.id WHERE i.product_id = p.id""")
cur.execute("UPDATE inventories i SET product_name = left(n.name, 200) FROM nfix n WHERE i.product_id = n.id")

cur.execute("""SELECT count(*) FROM (SELECT lower(name) FROM products WHERE status <> 'DELETED'
               GROUP BY 1 HAVING count(*) > 1) x""")
print('duplicate names across catalogue (incl. old data):', cur.fetchone()[0])
cur.execute(f"""SELECT count(*) FROM products WHERE {NEW_FILTER} AND (name ~ '#Y2010|\\mF[1-9]\\M|\\(\\s*[A-Za-z]{{2,4}}\\d{{3,5}}'
               OR name ~ '^(CV|Q-)' OR name ~ '\\s-\\s?\\d{{2,4}}$')""")
print('new names still carrying codes:', cur.fetchone()[0])
finish(conn, DRY)
