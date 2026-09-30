#!/usr/bin/env python3
"""
ET.TEE — Apply SQL to PostgreSQL Database
=========================================
Applies synthetic_data.sql (or any other SQL file) to the live PostgreSQL database
using credentials from .env or backend/.env, without needing the psql CLI installed.

Usage:
    python scripts/apply_sql.py --file scripts/synthetic_data.sql
"""

import argparse
import os
import re
import sys
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ─── Load .env ───────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    for _candidate in [
        Path(__file__).parent.parent / '.env',
        Path(__file__).parent.parent / 'backend' / '.env',
    ]:
        if _candidate.exists():
            load_dotenv(_candidate)
            print(f"  Loaded .env from {_candidate}")
            break
except ImportError:
    pass

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


def parse_args():
    p = argparse.ArgumentParser(
        description='Apply SQL file to PostgreSQL DB',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument('--file', default='scripts/synthetic_data.sql', help='SQL file to execute')
    p.add_argument('--host', default=None, help='DB host (fallback: DB_URL env)')
    p.add_argument('--port', default=5432, type=int)
    p.add_argument('--dbname', default='postgres')
    p.add_argument('--user', default=None, help='DB user (fallback: DB_USERNAME env)')
    p.add_argument('--password', default=None, help='DB pass (fallback: DB_PASSWORD env)')
    p.add_argument('--dry-run', action='store_true', help='Execute in transaction and rollback')
    return p.parse_args()


def _parse_jdbc_url(jdbc_url: str):
    m = re.match(r'jdbc:postgresql://([^:/]+):?(\d*)/([^?]+)', jdbc_url)
    if not m:
        return None
    host = m.group(1)
    port = int(m.group(2)) if m.group(2) else 5432
    dbname = m.group(3).split('?')[0]
    return host, port, dbname


def build_dsn(args) -> dict:
    dsn = {}
    db_url = os.environ.get('DB_URL', '')
    if db_url and not args.host:
        parsed = _parse_jdbc_url(db_url)
        if parsed:
            dsn['host'], dsn['port'], dsn['dbname'] = parsed

    dsn.setdefault('host', args.host or os.environ.get('DB_HOST', 'localhost'))
    dsn.setdefault('port', args.port)
    dsn.setdefault('dbname', args.dbname)
    dsn['user'] = args.user or os.environ.get('DB_USERNAME', 'postgres')
    dsn['password'] = args.password or os.environ.get('DB_PASSWORD', 'postgres')
    dsn['sslmode'] = 'require'
    return dsn


def main():
    args = parse_args()
    sql_path = Path(args.file)
    if not sql_path.exists():
        print(f"ERROR: File not found: {sql_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Reading {sql_path} ({sql_path.stat().st_size / 1024 / 1024:.2f} MB)...")
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    dsn = build_dsn(args)
    conn_info = f"{dsn['user']}@{dsn['host']}:{dsn['port']}/{dsn['dbname']}"
    print(f"Connecting to {conn_info}...")

    try:
        conn = psycopg2.connect(**dsn)
    except psycopg2.OperationalError as e:
        if 'ssl' in str(e).lower():
            dsn.pop('sslmode', None)
            conn = psycopg2.connect(**dsn)
        else:
            raise

    conn.autocommit = False
    cur = conn.cursor()

    try:
        print(f"Executing SQL {'(DRY RUN - will rollback)' if args.dry_run else '(APPLYING CHANGES)'}...")
        cur.execute(sql)

        if args.dry_run:
            conn.rollback()
            print("  Dry-run complete. Changes rolled back.")
        else:
            conn.commit()
            print("  SUCCESS: Changes committed to database!")

        # Print table stats
        print("\nVerifying table counts:")
        for tbl in ['users', 'user_behavior_events', 'orders', 'order_items', 'product_reviews']:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl}")
                cnt = cur.fetchone()[0]
                print(f"  - {tbl:<25}: {cnt:>10,} rows")
            except Exception as e:
                print(f"  - {tbl:<25}: query failed ({e})")
                conn.rollback()

    except Exception as e:
        conn.rollback()
        print(f"ERROR during SQL execution: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    main()
