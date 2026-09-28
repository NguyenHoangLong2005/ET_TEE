import psycopg2
conn = psycopg2.connect("postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require")
cur = conn.cursor()
cur.execute("SELECT table_schema, column_name, data_type FROM information_schema.columns WHERE table_name = 'users';")
for row in cur.fetchall():
    print(f"Schema: {row[0]} | Col: {row[1]} | Type: {row[2]}")
cur.close()
conn.close()
