"""Shared DB connection for the catalog-3000 fix scripts (reads ../../.env)."""
import os
import re
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / '.env')

# Products inserted by scripts/seed_3000_products_to_db.py (all created on this day).
NEW_FILTER = "created_at::date = '2026-10-02'"


def temp_table(cur, name, columns, rows):
    """Load rows into a session temp table so updates run set-based (the DB is remote,
    so per-row round trips take minutes)."""
    from psycopg2.extras import execute_values
    cur.execute(f"DROP TABLE IF EXISTS {name}")
    cur.execute(f"CREATE TEMP TABLE {name} ({columns})")
    if rows:
        execute_values(cur, f"INSERT INTO {name} VALUES %s", rows, page_size=1000)


def finish(conn, dry):
    if dry:
        conn.rollback()
        print('dry run - rolled back')
    else:
        conn.commit()
        print('committed')
    conn.close()


def connect():
    m = re.match(r'jdbc:postgresql://([^:/]+):?(\d*)/([^?]+)', os.environ['DB_URL'])
    return psycopg2.connect(host=m[1], port=int(m[2] or 5432), dbname=m[3],
                            user=os.environ['DB_USERNAME'], password=os.environ['DB_PASSWORD'],
                            sslmode='require')
