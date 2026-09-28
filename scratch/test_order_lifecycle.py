import sys
import psycopg2
import requests
import json

sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect('postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()

cur.execute("SELECT id, order_code, status, shop_id, user_id, total_amount FROM public.orders ORDER BY id DESC LIMIT 5;")
orders = cur.fetchall()
print("Latest orders in PostgreSQL:")
for o in orders:
    print(f"ID: {o[0]} | Code: {o[1]} | Status: {o[2]} | Shop: {o[3]} | User: {o[4]} | Total: {o[5]}")

if orders:
    latest_order_id = orders[0][0]
    print(f"\n--- TESTING STATE MACHINE ON ORDER {latest_order_id} ---")
    
    def get_token(email):
        resp = requests.post("http://localhost:8081/api/auth/login", json={"email": email, "password": "Check@123"}, timeout=5)
        d = resp.json()
        if "data" in d and isinstance(d["data"], dict) and "token" in d["data"]:
            return d["data"]["token"]
        return d.get("token")

    sales1_token = get_token("sales@et.tee")
    sales2_token = get_token("sales_shop2@et.tee")
    wh1_token = get_token("warehouse@et.tee")
    ship1_token = get_token("shipping@et.tee")

    headers_sales1 = {"Authorization": f"Bearer {sales1_token}"}
    headers_sales2 = {"Authorization": f"Bearer {sales2_token}"}
    headers_wh1 = {"Authorization": f"Bearer {wh1_token}"}
    headers_ship1 = {"Authorization": f"Bearer {ship1_token}"}

    # 1. Confirm (Sales 1)
    r_confirm = requests.post(f"http://localhost:8081/api/staff/sales/orders/{latest_order_id}/confirm", headers=headers_sales1)
    print(f"1. Sales 1 Confirm Order {latest_order_id}: HTTP {r_confirm.status_code}")

    # 2. Cross-shop isolation check (Sales 2 attempting to view/modify Shop 1 order)
    r_cross_view = requests.get(f"http://localhost:8081/api/staff/sales/orders/{latest_order_id}", headers=headers_sales2)
    print(f"2. Sales 2 View Shop 1 Order {latest_order_id}: HTTP {r_cross_view.status_code}")

    # 3. Pick & Pack (Warehouse)
    r_pick = requests.post(f"http://localhost:8081/api/staff/warehouse/orders/{latest_order_id}/pick", headers=headers_wh1)
    print(f"3. Warehouse Pick Order: HTTP {r_pick.status_code}")

    r_pack = requests.post(f"http://localhost:8081/api/staff/warehouse/orders/{latest_order_id}/pack", headers=headers_wh1)
    print(f"4. Warehouse Pack Order: HTTP {r_pack.status_code}")

    # 4. Check DB status history
    cur.execute("SELECT id, old_status, new_status, changed_by, created_at FROM public.order_status_history WHERE order_id = %s;", (latest_order_id,))
    history = cur.fetchall()
    print("\nOrder Status History in DB:")
    for h in history:
        print(f"History ID: {h[0]} | Old: {h[1]} | New: {h[2]} | ChangedBy: {h[3]} | Time: {h[4]}")

cur.close()
conn.close()
