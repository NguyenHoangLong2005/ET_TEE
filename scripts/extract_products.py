#!/usr/bin/env python3
"""
ET.TEE — Database Extractor
============================
Connects to the live PostgreSQL database and dumps:
  - products.jsonl  : all ACTIVE products with style/recommendation tags
  - user_ids.txt    : UUID ids of all ACTIVE USER-role accounts

Run ONCE before generate_synthetic_data.py.

Dependencies:
    pip install psycopg2-binary python-dotenv

Usage:
    # Reads DB_URL / DB_USERNAME / DB_PASSWORD from environment or .env
    python scripts/extract_products.py

    # Or pass credentials directly
    python scripts/extract_products.py \\
      --host localhost --port 5432 --dbname fashion_db \\
      --user postgres --password postgres \\
      --output-dir scripts/
"""

import argparse
import json
import os
import sys
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ─── Try to load .env ─────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    _dotenv_path = Path(__file__).parent.parent / '.env'
    if _dotenv_path.exists():
        load_dotenv(_dotenv_path)
        print(f"  Loaded .env from {_dotenv_path}")
except ImportError:
    pass  # python-dotenv optional

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description='ET.TEE DB Extractor — dump products + user IDs for synthetic data generation',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument('--host',       default=None, help='DB host  (fallback: DB_URL env)')
    p.add_argument('--port',       default=5432, type=int)
    p.add_argument('--dbname',     default='fashion_db')
    p.add_argument('--user',       default=None, help='DB user  (fallback: DB_USERNAME env)')
    p.add_argument('--password',   default=None, help='DB pass  (fallback: DB_PASSWORD env)')
    p.add_argument('--no-ssl',     action='store_true', help='Disable sslmode=require (for local dev)')
    p.add_argument('--output-dir', default='scripts', help='Where to write products.jsonl + user_ids.txt')
    p.add_argument('--min-users',  type=int, default=0,
                   help='Warn if fewer than this many real users are found')
    return p.parse_args()


# ─── Connection ───────────────────────────────────────────────────────────────

def _parse_jdbc_url(jdbc_url: str):
    """Extract host/port/dbname from jdbc:postgresql://host:port/db?params"""
    import re
    m = re.match(r'jdbc:postgresql://([^:/]+):?(\d*)/([^?]+)', jdbc_url)
    if not m:
        return None
    host   = m.group(1)
    port   = int(m.group(2)) if m.group(2) else 5432
    dbname = m.group(3).split('?')[0]
    return host, port, dbname


def build_dsn(args) -> dict:
    """Build psycopg2 connection kwargs, honouring env vars and CLI flags."""
    dsn = {}

    # DB_URL takes precedence if host/user not given
    db_url = os.environ.get('DB_URL', '')
    if db_url and not args.host:
        parsed = _parse_jdbc_url(db_url)
        if parsed:
            dsn['host'], dsn['port'], dsn['dbname'] = parsed

    dsn.setdefault('host',   args.host   or os.environ.get('DB_HOST', 'localhost'))
    dsn.setdefault('port',   args.port)
    dsn.setdefault('dbname', args.dbname)
    dsn['user']     = args.user     or os.environ.get('DB_USERNAME', 'postgres')
    dsn['password'] = args.password or os.environ.get('DB_PASSWORD', 'postgres')

    if not args.no_ssl:
        dsn['sslmode'] = 'require'

    return dsn


# ─── Queries ──────────────────────────────────────────────────────────────────

PRODUCT_QUERY = """
SELECT
    p.id,
    p.name,
    p.slug,
    p.brand,
    p.price,
    p.sale_price,
    COALESCE(p.target_group, 'unisex')                    AS target_group,
    COALESCE(p.gender, '')                                AS gender,
    COALESCE(p.style, '')                                 AS style,
    COALESCE(p.product_type, '')                          AS product_type,
    COALESCE(p.material, '')                              AS material,
    COALESCE(p.status, 'ACTIVE')                          AS status,
    COALESCE(c.name, '')                                  AS category,
    COALESCE(
        string_agg(DISTINCT pst.tag, ',' ORDER BY pst.tag)
        FILTER (WHERE pst.tag IS NOT NULL AND pst.tag <> ''),
        ''
    )                                                     AS style_tags,
    COALESCE(
        string_agg(DISTINCT prt.tag, ',' ORDER BY prt.tag)
        FILTER (WHERE prt.tag IS NOT NULL AND prt.tag <> ''),
        ''
    )                                                     AS recommendation_tags
FROM products p
LEFT JOIN categories          c   ON p.category_id = c.id
LEFT JOIN product_style_tags  pst ON p.id = pst.product_id
LEFT JOIN product_recommendation_tags prt ON p.id = prt.product_id
WHERE p.status = 'ACTIVE'
GROUP BY p.id, p.name, p.slug, p.brand, p.price, p.sale_price,
         p.target_group, p.gender, p.style, p.product_type, p.material, p.status,
         c.name
ORDER BY p.id;
"""

USER_QUERY = """
SELECT id
FROM users
WHERE status = 'ACTIVE'
  AND role   = 'USER'
ORDER BY created_at;
"""

PRODUCT_COUNT_QUERY = "SELECT COUNT(*) FROM products WHERE status = 'ACTIVE';"
USER_COUNT_QUERY    = "SELECT COUNT(*) FROM users WHERE status = 'ACTIVE' AND role = 'USER';"


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    dsn = build_dsn(args)
    conn_info = f"{dsn['user']}@{dsn['host']}:{dsn['port']}/{dsn['dbname']}"
    print(f"Connecting to {conn_info}...")

    try:
        conn = psycopg2.connect(**dsn)
    except psycopg2.OperationalError as e:
        # Retry without SSL for local dev
        if 'ssl' in str(e).lower() and 'sslmode' in dsn:
            print("  SSL connection failed — retrying without SSL...")
            dsn.pop('sslmode', None)
            try:
                conn = psycopg2.connect(**dsn)
            except psycopg2.OperationalError as e2:
                print(f"ERROR: Cannot connect: {e2}", file=sys.stderr)
                sys.exit(1)
        else:
            print(f"ERROR: Cannot connect: {e}", file=sys.stderr)
            sys.exit(1)

    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── Products ──────────────────────────────────────────────────────────────
    cur.execute(PRODUCT_COUNT_QUERY)
    total_products = cur.fetchone()['count']
    print(f"  Active products in DB: {total_products}")

    cur.execute(PRODUCT_QUERY)
    products = cur.fetchall()

    products_path = out_dir / 'products.jsonl'
    with open(products_path, 'w', encoding='utf-8') as f:
        for row in products:
            record = {
                'id':                  int(row['id']),
                'name':                row['name'] or '',
                'slug':                row['slug'] or '',
                'brand':               row['brand'] or '',
                'price':               float(row['price'] or 0),
                'salePrice':           float(row['sale_price']) if row['sale_price'] else None,
                'targetGroup':         row['target_group'] or 'unisex',
                'gender':              row['gender'] or '',
                'style':               row['style'] or '',
                'productType':         row['product_type'] or '',
                'material':            row['material'] or '',
                'status':              row['status'] or 'ACTIVE',
                'category':            row['category'] or '',
                'styleTags':           row['style_tags'] or '',
                'recommendationTags':  row['recommendation_tags'] or '',
            }
            f.write(json.dumps(record, ensure_ascii=False) + '\n')

    print(f"  → Wrote {len(products)} products to {products_path}")

    # ── Users ─────────────────────────────────────────────────────────────────
    cur.execute(USER_COUNT_QUERY)
    total_users = cur.fetchone()['count']
    print(f"  Active USER-role accounts in DB: {total_users}")

    cur.execute(USER_QUERY)
    users = cur.fetchall()
    user_ids = [str(row['id']) for row in users]

    users_path = out_dir / 'user_ids.txt'
    with open(users_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(user_ids))
        if user_ids:
            f.write('\n')

    print(f"  → Wrote {len(user_ids)} user UUIDs to {users_path}")

    if args.min_users and len(user_ids) < args.min_users:
        print(f"\n  ⚠  Only {len(user_ids)} real users found (expected ≥ {args.min_users}).")
        print(f"     The generator will supplement with synthetic UUIDs.")

    cur.close()
    conn.close()

    print(f"\nDone. Next step:")
    print(f"  python scripts/generate_synthetic_data.py \\")
    print(f"    --products {products_path} \\")
    print(f"    --users-file {users_path} \\")
    print(f"    --n-users 800 \\")
    print(f"    --output scripts/synthetic_data.sql")
    print()


if __name__ == '__main__':
    main()
