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
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, dict):
                if "data" in data and isinstance(data["data"], dict) and "token" in data["data"]:
                    return data["data"]["token"]
                if "token" in data:
                    return data["token"]
    except Exception as e:
        print(f"Login error for {email}: {e}")
    return None

def main():
    print("==================================================")
    print("INDEPENDENT AUDIT MASTER RUNNER — STABLE CUSTOMER AUTH")
    print("==================================================")

    # 1. TOKENS & ACCOUNTS
    admin_token = get_token("admin@et.tee", "Check@123")
    sales1_token = get_token("sales@et.tee", "Check@123")
    sales2_token = get_token("sales_shop2@et.tee", "Check@123")
    wh1_token = get_token("warehouse@et.tee", "Check@123")
    ship1_token = get_token("shipping@et.tee", "Check@123")
    cust_token = get_token("audit_customer@et.tee", "Check@123")

    print(f"[AUTH] Admin: {bool(admin_token)}, Sales1: {bool(sales1_token)}, Sales2: {bool(sales2_token)}, WH1: {bool(wh1_token)}, Ship1: {bool(ship1_token)}, Cust: {bool(cust_token)}")

    cust_headers = {"Authorization": f"Bearer {cust_token}"} if cust_token else {}
    sales1_headers = {"Authorization": f"Bearer {sales1_token}"} if sales1_token else {}
    sales2_headers = {"Authorization": f"Bearer {sales2_token}"} if sales2_token else {}
    wh1_headers = {"Authorization": f"Bearer {wh1_token}"} if wh1_token else {}
    ship1_headers = {"Authorization": f"Bearer {ship1_token}"} if ship1_token else {}
    admin_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # GATE 4 — CUSTOMER E2E
    print("\n--- GATE 4: CUSTOMER E2E ---")
    r_browse = requests.get(f"{BASE_URL}/api/products", timeout=10)
    print(f"1. Browse: HTTP {r_browse.status_code}")
    
    r_search = requests.get(f"{BASE_URL}/api/products?q=cotton", timeout=10)
    print(f"2. Search: HTTP {r_search.status_code}")

    r_filter = requests.get(f"{BASE_URL}/api/products?minPrice=10000&maxPrice=1000000", timeout=10)
    print(f"3. Filter: HTTP {r_filter.status_code}")

    slug = "ao-phong-nam-cotton-usa-basic-co-tron-sw001"
    r_detail = requests.get(f"{BASE_URL}/api/products/{slug}", timeout=10)
    print(f"4. Product Detail ({slug}): HTTP {r_detail.status_code}")

    variant_id = 3541
    r_cart_add = requests.post(f"{BASE_URL}/api/cart/items", json={"variantId": variant_id, "quantity": 1}, headers=cust_headers, timeout=10)
    print(f"5. Add to Cart (variant {variant_id}): HTTP {r_cart_add.status_code}")

    r_cart_get = requests.get(f"{BASE_URL}/api/cart", headers=cust_headers, timeout=10)
    print(f"6. Get Cart: HTTP {r_cart_get.status_code}")

    checkout_payload = {
        "shippingAddress": "123 Audit Street, HCMC",
        "shippingMethod": "STANDARD",
        "paymentMethod": "COD",
        "note": "Audit test order",
        "customerName": "Audit Customer",
        "customerEmail": "audit_customer@et.tee",
        "customerPhone": "0912345678"
    }
    r_checkout = requests.post(f"{BASE_URL}/api/orders/checkout", json=checkout_payload, headers=cust_headers, timeout=30)
    print(f"7. Checkout: HTTP {r_checkout.status_code} -> Response: {r_checkout.text[:300]}")

    created_order_id = None
    if r_checkout.status_code in (200, 201):
        c_res = r_checkout.json()
        if "data" in c_res and isinstance(c_res["data"], dict):
            created_order_id = c_res["data"].get("id") or c_res["data"].get("orderId")
        elif "id" in c_res:
            created_order_id = c_res["id"]
    print(f"Created Order ID: {created_order_id}")

    # GATE 5 & 6 — SALES STAFF & ORDER STATE MACHINE
    print("\n--- GATE 5 & 6: SALES STAFF & ORDER STATE MACHINE ---")
    r_sales_orders = requests.get(f"{BASE_URL}/api/staff/sales/orders", headers=sales1_headers, timeout=10)
    print(f"Sales 1 Get Orders: HTTP {r_sales_orders.status_code}")

    if created_order_id:
        r_confirm = requests.post(f"{BASE_URL}/api/staff/sales/orders/{created_order_id}/confirm", headers=sales1_headers, timeout=10)
        print(f"Sales 1 Confirm Order {created_order_id}: HTTP {r_confirm.status_code}")

        r_unauth_confirm = requests.post(f"{BASE_URL}/api/staff/sales/orders/{created_order_id}/confirm", headers=cust_headers, timeout=10)
        print(f"Customer Confirm Order Attempt: HTTP {r_unauth_confirm.status_code} (Expected 403)")

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, status, shop_id FROM public.orders WHERE id = %s;", (created_order_id,))
        print(f"DB Order Record: {cur.fetchone()}")
        cur.execute("SELECT id, old_status, new_status, changed_by, created_at FROM public.order_status_history WHERE order_id = %s;", (created_order_id,))
        print(f"DB Order Status History: {cur.fetchall()}")
        cur.close()
        conn.close()

    # GATE 7 — WAREHOUSE
    print("\n--- GATE 7: WAREHOUSE ---")
    r_wh_inv = requests.get(f"{BASE_URL}/api/staff/warehouse/inventory", headers=wh1_headers, timeout=10)
    print(f"Warehouse Inventory List: HTTP {r_wh_inv.status_code}")
    r_wh_orders = requests.get(f"{BASE_URL}/api/staff/warehouse/orders", headers=wh1_headers, timeout=10)
    print(f"Warehouse Orders List: HTTP {r_wh_orders.status_code}")

    if created_order_id:
        r_pick = requests.post(f"{BASE_URL}/api/staff/warehouse/orders/{created_order_id}/pick", headers=wh1_headers, timeout=10)
        print(f"Warehouse Pick Order: HTTP {r_pick.status_code}")
        r_pack = requests.post(f"{BASE_URL}/api/staff/warehouse/orders/{created_order_id}/pack", headers=wh1_headers, timeout=10)
        print(f"Warehouse Pack Order: HTTP {r_pack.status_code}")

    # GATE 8 — CONCURRENCY TEST
    print("\n--- GATE 8: CONCURRENCY ---")
    def do_checkout(idx):
        try:
            requests.post(f"{BASE_URL}/api/cart/items", json={"variantId": variant_id, "quantity": 1}, headers=cust_headers, timeout=10)
            res = requests.post(f"{BASE_URL}/api/orders/checkout", json=checkout_payload, headers=cust_headers, timeout=30)
            return res.status_code
        except Exception as e:
            return f"ERR: {e}"

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        futs = [ex.submit(do_checkout, i) for i in range(3)]
        codes = [f.result() for f in futs]
    print(f"Concurrent Checkout HTTP codes: {codes}")

    # GATE 9 — SHIPPING
    print("\n--- GATE 9: SHIPPING ---")
    r_ship_list = requests.get(f"{BASE_URL}/api/staff/shipping/shipments", headers=ship1_headers, timeout=10)
    print(f"Shipping Shipments List: HTTP {r_ship_list.status_code}")
    r_ready = requests.get(f"{BASE_URL}/api/staff/shipping/ready-orders", headers=ship1_headers, timeout=10)
    print(f"Shipping Ready Orders: HTTP {r_ready.status_code}")

    # GATE 10 — CSKH (TICKETS & VOUCHERS)
    print("\n--- GATE 10: CSKH ---")
    t_payload = {
        "subject": "Audit Support Ticket",
        "initialMessage": "Testing ticket flow initial message",
        "channel": "chat"
    }
    r_create_ticket = requests.post(f"{BASE_URL}/api/customer/tickets", json=t_payload, headers=cust_headers, timeout=10)
    print(f"Customer Create Ticket: HTTP {r_create_ticket.status_code} -> {r_create_ticket.text[:200]}")

    r_cskh_quota = requests.get(f"{BASE_URL}/api/cskh/vouchers/quota", headers=admin_headers, timeout=10)
    print(f"CSKH Voucher Quota: HTTP {r_cskh_quota.status_code}")

    # GATE 11 & 15 — MULTI-SHOP SECURITY & IDOR
    print("\n--- GATE 11 & 15: MULTI-SHOP SECURITY & IDOR ---")
    r_unauth_admin = requests.get(f"{BASE_URL}/api/admin/users", headers=cust_headers, timeout=10)
    print(f"Customer accessing Admin Users: HTTP {r_unauth_admin.status_code} (Expected 403)")

    if created_order_id:
        r_cross_order = requests.get(f"{BASE_URL}/api/staff/sales/orders/{created_order_id}", headers=sales2_headers, timeout=10)
        print(f"Shop 2 staff accessing Shop 1 Order ID {created_order_id}: HTTP {r_cross_order.status_code}")

    # GATE 12 — ADMIN
    print("\n--- GATE 12: ADMIN ---")
    r_admin_users = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers, timeout=10)
    print(f"Admin Users List: HTTP {r_admin_users.status_code}")
    r_admin_mon = requests.get(f"{BASE_URL}/api/admin/monitoring", headers=admin_headers, timeout=10)
    print(f"Admin Monitoring: HTTP {r_admin_mon.status_code}")

    # GATE 13 — SHOP OWNER
    print("\n--- GATE 13: SHOP OWNER ---")
    r_owner_dash = requests.get(f"{BASE_URL}/api/store-owner/dashboard?shopId=1", headers=admin_headers, timeout=10)
    print(f"Store Owner Dashboard: HTTP {r_owner_dash.status_code}")

    # GATE 14 — FRONTEND E2E
    print("\n--- GATE 14: FRONTEND E2E ---")
    try:
        r_fe_home = requests.get(f"{FRONTEND_URL}/", timeout=5)
        r_fe_admin = requests.get(f"{FRONTEND_URL}/admin/users", timeout=5)
        print(f"Frontend Home: HTTP {r_fe_home.status_code}, Frontend Admin Users: HTTP {r_fe_admin.status_code}")
    except Exception as e:
        print(f"Frontend connection failed: {e}")

    print("\n==================================================")
    print("MASTER AUDIT RUN COMPLETE")
    print("==================================================")

if __name__ == "__main__":
    main()
