"""Step 0: snapshot every catalog table before the fixes.

- Server side: copies into schema backup_catalog_20261002 (fast restore with INSERT ... SELECT).
- Local: CSV dump into backend/backups/catalog_20261002/.
"""
from db import connect, ROOT

TABLES = ['products', 'product_variants', 'product_images', 'product_style_tags',
          'product_recommendation_tags', 'inventories', 'categories']
SCHEMA = 'backup_catalog_20261002'

conn = connect()
cur = conn.cursor()
cur.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
out = ROOT / 'backend' / 'backups' / 'catalog_20261002'
out.mkdir(parents=True, exist_ok=True)
for t in TABLES:
    cur.execute(f"DROP TABLE IF EXISTS {SCHEMA}.{t}")
    cur.execute(f"CREATE TABLE {SCHEMA}.{t} AS SELECT * FROM public.{t}")
    cur.execute(f"SELECT count(*) FROM {SCHEMA}.{t}")
    n = cur.fetchone()[0]
    with open(out / f'{t}.csv', 'w', encoding='utf-8', newline='') as f:
        cur.copy_expert(f"COPY public.{t} TO STDOUT WITH CSV HEADER", f)
    print(f'{t:32s} {n:7d} rows -> {SCHEMA}.{t} + {t}.csv')
conn.commit()
conn.close()
