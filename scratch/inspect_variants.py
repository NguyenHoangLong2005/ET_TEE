import psycopg2

conn = psycopg2.connect('postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_variants';")
cols = [r[0] for r in cur.fetchall()]
print("Columns in product_variants:", cols)

cur.execute("SELECT id, product_id, sku FROM public.product_variants LIMIT 5;")
rows = cur.fetchall()
print("Sample product_variants:", rows)

cur.close()
conn.close()
