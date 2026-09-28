import psycopg2

DB_STR = "postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

conn = psycopg2.connect(DB_STR)
cur = conn.cursor()
cur.execute("SELECT id, email, shop_id FROM public.users WHERE email IN ('sales@et.tee', 'warehouse@et.tee', 'shipping@et.tee');")
for r in cur.fetchall():
    print(f"User ID: {r[0]} | Email: {r[1]} | ShopID: {r[2]}")

cur.execute("SELECT id, shop_id, status FROM public.orders WHERE id = 47;")
print("Order 47:", cur.fetchone())

cur.execute("SELECT inventory_id, product_id, shop_id, quantity_on_hand, quantity_reserved FROM public.inventories WHERE product_id = 173;")
print("Inventory for Product 173:", cur.fetchall())

cur.close()
conn.close()
