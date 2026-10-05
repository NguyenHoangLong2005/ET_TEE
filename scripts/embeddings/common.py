"""DB connection dung chung cho pipeline embedding (doc ../../.env, giong scripts/catalog_fix/db.py)."""
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


def connect():
    m = re.match(r'jdbc:postgresql://([^:/]+):?(\d*)/([^?]+)', os.environ['DB_URL'])
    return psycopg2.connect(host=m[1], port=int(m[2] or 5432), dbname=m[3],
                            user=os.environ['DB_USERNAME'], password=os.environ['DB_PASSWORD'],
                            sslmode='require')


def to_pgvector(vec):
    return '[' + ','.join(f'{x:.7f}' for x in vec) + ']'
