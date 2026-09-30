import sys
import psycopg2

sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect('postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()

cur.execute("SELECT id, order_id, from_status, old_status, status, new_status, changed_by, created_at FROM public.order_status_history ORDER BY id DESC LIMIT 10;")
rows = cur.fetchall()
print("ORDER STATUS HISTORY COLUMNS AUDIT:")
for r in rows:
    print(f"ID: {r[0]} | OrderID: {r[1]} | from_status: '{r[2]}' | old_status: '{r[3]}' | status: '{r[4]}' | new_status: '{r[5]}' | ChangedBy: {r[6]} | Time: {r[7]}")

cur.close()
conn.close()
