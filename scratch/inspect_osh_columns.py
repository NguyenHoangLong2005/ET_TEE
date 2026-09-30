import psycopg2

DB_STR = "postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

conn = psycopg2.connect(DB_STR)
cur = conn.cursor()
cur.execute("SELECT id, order_id, from_status, old_status, status, new_status, changed_by, created_at FROM public.order_status_history ORDER BY id DESC LIMIT 15;")
rows = cur.fetchall()
print(f"Total rows retrieved: {len(rows)}")
for r in rows:
    print(f"ID: {r[0]} | Order: {r[1]} | From: {r[2]} | Old: {r[3]} | Status: {r[4]} | New: {r[5]} | By: {r[6]} | Time: {r[7]}")

cur.close()
conn.close()
