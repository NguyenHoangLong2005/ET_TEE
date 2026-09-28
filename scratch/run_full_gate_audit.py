import sys
import requests
import psycopg2
import concurrent.futures
import json
import time

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8081"
FRONTEND_URL = "http://localhost:3000"
DB_STR = "postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

def get_db():
    return psycopg2.connect(DB_STR)

def get_token(email, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, dict):
            if "data" in data and isinstance(data["data"], dict) and "token" in data["data"]:
                return data["data"]["token"]
            if "token" in data:
                return data["token"]
    return None

def main():
    print("==================================================")
    print("INDEPENDENT AUDIT MASTER RUNNER (GATES 4 - 16)")
    print("==================================================")

    audit_results = {}

    # 1. AUTH & TOKENS
    admin_token = get_token("admin@et.tee", "Check@123")
    sales1_token = get_token("sales@et.tee", "Check@123")
    sales2_token = get_token("sales_shop2@et.tee", "Check@123")
    wh1_token = get_token("warehouse@et.tee", "Check@123")
    ship1_token = get_token("shipping@et.tee", "Check@123")
    mkt_token = get_token("marketing@et.tee", "Check@123")

    print(f"[AUTH] Tokens acquired - Admin: {bool(admin_token)}, Sales1: {bool(sales1_token)}, Sales2: {bool(sales2_token)}, WH1: {bool(wh1_token)}, Ship1: {bool(ship1_token)}")

    # Register customer
    cust_email = f"audit_cust_{int(time.time())}@test.com"
    reg_payload = {
        "fullName": "Audit Tester",
        "email": cust_email,
        "phone": "0912345678",
        "address": "123 Audit Street, HCMC",
        "password": "Password123!"
    }
    r_reg = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
    print(f"[AUTH] Register status: {r_reg.status_code}")
    
    # Enable customer directly in public.users if needed
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE public.users SET email_verified = true, status = 'ACTIVE' WHERE email = %s;", (cust_email,))
    conn.commit()
    cur.close()
    conn.close()

    cust_token = get_token(cust_email, "Password123!")
    print(f"[AUTH] Customer Token acquired: {bool(cust_token)}")

    cust_headers = {"Authorization": f"Bearer {cust_token}"} if cust_token else {}
    sales1_headers = {"Authorization": f"Bearer {sales1_token}"} if sales1_token else {}
    sales2_headers = {"Authorization": f"Bearer {sales2_token}"} if sales2_token else {}
    wh1_headers = {"Authorization": f"Bearer {wh1_token}"} if wh1_token else {}
    ship1_headers = {"Authorization": f"Bearer {ship1_token}"} if ship1_token else {}
    admin_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # GATE 4 — CUSTOMER E2E
    print("\n--- GATE 4: CUSTOMER E2E ---")
    r_browse = requests.get(f"{BASE_URL}/api/products")
    r_search = requests.get(f"{BASE_URL}/api/products?search=shirt")
    r_filter = requests.get(f"{BASE_URL}/api/products?minPrice=100000&maxPrice=1000000")
    
    prod_id = 1
    if r_browse.status_code == 200:
        items = r_browse.json().get('data', {}).get('content', [])
        if items:
            prod_id = items[0]['id']
    r_detail = requests.get(f"{BASE_URL}/api/products/{prod_id}")
    r_cart_get = requests.get(f"{BASE_URL}/api/cart", headers=cust_headers)
    r_cart_add = requests.post(f"{BASE_URL}/api/cart/items", json={"productId": prod_id, "quantity": 1}, headers=cust_headers)

    audit_results['GATE_4'] = {
        "Browse": r_browse.status_code,
        "Search": r_search.status_code,
        "Filter": r_filter.status_code,
        "Detail": r_detail.status_code,
        "CartGet": r_cart_get.status_code,
        "CartAdd": r_cart_add.status_code
    }
    print(f"GATE 4 Summary: {audit_results['GATE_4']}")

    # GATE 5 & 6 — SALES STAFF & ORDER STATE MACHINE
    print("\n--- GATE 5 & 6: SALES STAFF & ORDER STATE MACHINE ---")
    order_payload = {
        "items": [{"productId": prod_id, "quantity": 1}],
        "shippingAddress": {"street": "123 Audit Street", "city": "HCMC"},
        "paymentMethod": "COD"
    }
    r_checkout = requests.post(f"{BASE_URL}/api/checkout", json=order_payload, headers=cust_headers)
    print(f"Checkout Response ({r_checkout.status_code}): {r_checkout.text[:200]}")

    created_order_id = None
    if r_checkout.status_code in (200, 201):
        c_data = r_checkout.json()
        if "data" in c_data and isinstance(c_data["data"], dict):
            created_order_id = c_data["data"].get("id") or c_data["data"].get("orderId")
        elif "id" in c_data:
            created_order_id = c_data["id"]
    
    print(f"Created Order ID: {created_order_id}")

    r_sales_list = requests.get(f"{BASE_URL}/api/staff/orders", headers=sales1_headers)
    print(f"Sales 1 Order List: HTTP {r_sales_list.status_code}")

    if created_order_id:
        r_confirm = requests.post(f"{BASE_URL}/api/staff/orders/{created_order_id}/confirm", headers=sales1_headers)
        print(f"Sales Confirm Order {created_order_id}: HTTP {r_confirm.status_code}")

        r_cust_confirm = requests.post(f"{BASE_URL}/api/staff/orders/{created_order_id}/confirm", headers=cust_headers)
        print(f"Customer Confirm Order Attempt: HTTP {r_cust_confirm.status_code} (Expected 403)")

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, status, shop_id FROM public.orders WHERE id = %s;", (created_order_id,))
        db_order = cur.fetchone()
        cur.execute("SELECT id, old_status, new_status, changed_by, created_at FROM public.order_status_history WHERE order_id = %s;", (created_order_id,))
        db_history = cur.fetchall()
        print(f"DB Order State: {db_order}")
        print(f"DB Order Status History: {db_history}")
        cur.close()
        conn.close()

    # GATE 7 — WAREHOUSE
    print("\n--- GATE 7: WAREHOUSE ---")
    r_wh_inventory = requests.get(f"{BASE_URL}/api/warehouse/inventory", headers=wh1_headers)
    print(f"Warehouse Inventory List: HTTP {r_wh_inventory.status_code}")
    if created_order_id:
        r_pick = requests.post(f"{BASE_URL}/api/warehouse/orders/{created_order_id}/pick", headers=wh1_headers)
        print(f"Warehouse Pick Order: HTTP {r_pick.status_code}")
        r_pack = requests.post(f"{BASE_URL}/api/warehouse/orders/{created_order_id}/pack", headers=wh1_headers)
        print(f"Warehouse Pack Order: HTTP {r_pack.status_code}")

    # GATE 8 — CONCURRENCY
    print("\n--- GATE 8: CONCURRENCY ---")
    def attempt_checkout(idx):
        res = requests.post(f"{BASE_URL}/api/checkout", json={
            "items": [{"productId": prod_id, "quantity": 1}],
            "shippingAddress": {"street": f"Street {idx}", "city": "HCMC"},
            "paymentMethod": "COD"
        }, headers=cust_headers)
        return res.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        futs = [ex.submit(attempt_checkout, i) for i in range(5)]
        codes = [f.result() for f in futs]
    print(f"Concurrent Checkout HTTP codes: {codes}")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, product_id, quantity, reserved_quantity FROM public.inventory WHERE product_id = %s;", (prod_id,))
    inv_rows = cur.fetchall()
    print(f"PostgreSQL Inventory State after concurrency test: {inv_rows}")
    cur.close()
    conn.close()

    # GATE 9 — SHIPPING
    print("\n--- GATE 9: SHIPPING ---")
    r_shipments = requests.get(f"{BASE_URL}/api/shipping/shipments", headers=ship1_headers)
    print(f"Shipping List: HTTP {r_shipments.status_code}")

    # GATE 10 — CSKH
    print("\n--- GATE 10: CSKH ---")
    r_create_ticket = requests.post(f"{BASE_URL}/api/support/tickets", json={
        "subject": "Audit Issue",
        "description": "Testing ticket flow",
        "channel": "chat"
    }, headers=cust_headers)
    print(f"Customer Create Ticket: HTTP {r_create_ticket.status_code}")
    
    r_cskh_tickets = requests.get(f"{BASE_URL}/api/cskh/tickets", headers=admin_headers)
    print(f"CSKH List Tickets: HTTP {r_cskh_tickets.status_code}")

    r_cskh_quota = requests.get(f"{BASE_URL}/api/cskh/vouchers/quota", headers=admin_headers)
    print(f"CSKH Voucher Quota: HTTP {r_cskh_quota.status_code}")

    # GATE 11 & 15 — MULTI-SHOP SECURITY & IDOR
    print("\n--- GATE 11 & 15: MULTI-SHOP SECURITY & IDOR ---")
    r_cross_shop_order = requests.get(f"{BASE_URL}/api/staff/orders?shopId=2", headers=sales1_headers)
    print(f"Shop 1 staff accessing Shop 2 orders via filter: HTTP {r_cross_shop_order.status_code}")

    if created_order_id:
        r_cross_shop_detail = requests.get(f"{BASE_URL}/api/staff/orders/{created_order_id}", headers=sales2_headers)
        print(f"Shop 2 staff accessing Shop 1 Order ID {created_order_id}: HTTP {r_cross_shop_detail.status_code}")

    # GATE 12 — ADMIN
    print("\n--- GATE 12: ADMIN ---")
    r_admin_users = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
    print(f"Admin Users List: HTTP {r_admin_users.status_code}")
    r_admin_mon = requests.get(f"{BASE_URL}/api/admin/monitoring", headers=admin_headers)
    print(f"Admin Monitoring: HTTP {r_admin_mon.status_code}")

    # GATE 13 — SHOP OWNER
    print("\n--- GATE 13: SHOP OWNER ---")
    r_owner_dash = requests.get(f"{BASE_URL}/api/owner/dashboard?shopId=1", headers=admin_headers)
    print(f"Owner Dashboard: HTTP {r_owner_dash.status_code}")

    # GATE 14 — FRONTEND E2E
    print("\n--- GATE 14: FRONTEND E2E ---")
    try:
        r_fe_home = requests.get(f"{FRONTEND_URL}/")
        r_fe_admin = requests.get(f"{FRONTEND_URL}/admin/users")
        print(f"Frontend Home: HTTP {r_fe_home.status_code}, Frontend Admin Users: HTTP {r_fe_admin.status_code}")
    except Exception as e:
        print(f"Frontend connection failed: {e}")

    print("\n==================================================")
    print("AUDIT RUN COMPLETE")
    print("==================================================")

if __name__ == "__main__":
    main()
