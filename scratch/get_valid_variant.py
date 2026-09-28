import sys
import psycopg2

sys.stdout.reconfigure(encoding='utf-8')

DB_STR = "postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

conn = psycopg2.connect(DB_STR)
cur = conn.cursor()
cur.execute("SELECT p.id, v.id, p.name FROM public.products p JOIN public.product_variants v ON v.product_id = p.id LIMIT 5;")
for r in cur.fetchall():
    print(f"Product ID: {r[0]} | Variant ID: {r[1]} | Name: {r[2]}")
cur.close()
conn.close()
