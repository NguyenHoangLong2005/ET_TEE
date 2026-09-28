import psycopg2

conn_str = "postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

conn = psycopg2.connect(conn_str)
cur = conn.cursor()

print("=== DETAILED DATABASE SCHEMA INSPECTION ===")

# Check schemas
cur.execute("SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema';")
print("Schemas:", [r[0] for r in cur.fetchall()])

# Inspect orders table constraints in detail
print("\n--- ORDERS TABLE CONSTRAINTS ---")
cur.execute("""
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE cl.relname = 'orders';
""")
for c in cur.fetchall():
    print(f"Name: {c[0]} | Type: {c[1]} | Def: {c[2]}")

# Inspect shipments table constraints
print("\n--- SHIPMENTS TABLE CONSTRAINTS ---")
cur.execute("""
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE cl.relname = 'shipments';
""")
for c in cur.fetchall():
    print(f"Name: {c[0]} | Type: {c[1]} | Def: {c[2]}")

# Check Enum types in DB
print("\n--- DATABASE ENUMS ---")
cur.execute("""
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    ORDER BY t.typname, e.enumsortorder;
""")
for row in cur.fetchall():
    print(f"Enum: {row[0]} -> Label: {row[1]}")

cur.close()
conn.close()
