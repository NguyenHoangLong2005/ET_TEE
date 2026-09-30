import psycopg2

conn = psycopg2.connect('postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()

cur.execute("SELECT password_hash FROM public.users WHERE email = 'admin@et.tee';")
admin_hash = cur.fetchone()[0]

email = "audit_customer@et.tee"
cur.execute("SELECT id FROM public.users WHERE email = %s;", (email,))
exists = cur.fetchone()

if exists:
    cur.execute("UPDATE public.users SET password_hash = %s, email_verified = true, status = 'ACTIVE' WHERE email = %s;", (admin_hash, email))
else:
    cur.execute("""
        INSERT INTO public.users (id, email, password_hash, full_name, phone, role, email_verified, status, created_at, updated_at)
        VALUES (gen_random_uuid()::text, %s, %s, 'Audit Customer', '0912345678', 'USER', true, 'ACTIVE', NOW(), NOW());
    """, (email, admin_hash))

conn.commit()
print(f"Customer {email} configured with password Check@123")
cur.close()
conn.close()
