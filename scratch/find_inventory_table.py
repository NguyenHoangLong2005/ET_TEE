import psycopg2

conn = psycopg2.connect('postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()

cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%inventory%';")
print("Inventory tables found:", cur.fetchall())

cur.close()
conn.close()
