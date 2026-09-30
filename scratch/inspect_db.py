import psycopg2

conn_str = "postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    print("=== GATE 3 — DATABASE DIRECT INSPECTION ===")

    # 1. Flyway History
    print("\n--- FLYWAY SCHEMA HISTORY ---")
    try:
        cur.execute("SELECT installed_rank, version, description, type, script, checksum, execution_time, success FROM flyway_schema_history ORDER BY installed_rank;")
        rows = cur.fetchall()
        for r in rows:
            print(f"Rank: {r[0]} | Ver: {r[1]} | Desc: {r[2]} | ExecTime: {r[6]}ms | Success: {r[7]}")
    except Exception as e:
        print("Flyway table error:", e)
        conn.rollback()

    # 2. All Tables
    print("\n--- TABLES LIST ---")
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    tables = [row[0] for row in cur.fetchall()]
    print("Tables found:", tables)

    # 3. Specific Schema Details
    target_tables = ['orders', 'order_status_history', 'shipments', 'inventory', 'inventory_reservations', 'support_tickets', 'vouchers', 'cskh_voucher_quotas', 'shop_staff']
    for t in target_tables:
        if t in tables:
            print(f"\n--- TABLE SCHEMA: {t} ---")
            cur.execute(f"SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '{t}' ORDER BY ordinal_position;")
            for col in cur.fetchall():
                print(f"  Col: {col[0]:<25} Type: {col[1]:<20} Nullable: {col[2]:<5} Default: {col[3]}")
            
            # Constraints
            cur.execute(f"""
                SELECT conname, contype, pg_get_constraintdef(c.oid)
                FROM pg_constraint c
                JOIN pg_namespace n ON n.oid = c.connamespace
                JOIN pg_class cl ON cl.oid = c.conrelid
                WHERE cl.relname = '{t}' AND n.nspname = 'public';
            """)
            constraints = cur.fetchall()
            if constraints:
                print("  Constraints:")
                for c in constraints:
                    print(f"    Name: {c[0]} | Type: {c[1]} | Def: {c[2]}")

    # 4. Indexes
    print("\n--- INDEXES ON KEY TABLES ---")
    cur.execute("""
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename IN ('orders', 'shipments', 'inventory', 'support_tickets', 'vouchers')
        ORDER BY tablename, indexname;
    """)
    for idx in cur.fetchall():
        print(f"Table: {idx[0]} | Index: {idx[1]} | Def: {idx[2]}")

    cur.close()
    conn.close()

except Exception as e:
    print("DB Connection/Query Error:", e)
