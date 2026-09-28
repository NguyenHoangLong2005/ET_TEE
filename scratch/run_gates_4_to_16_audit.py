import requests
import psycopg2
import concurrent.futures
import json
import time

BASE_URL = "http://localhost:8081"
DB_STR = "postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

def get_db_connection():
    return psycopg2.connect(DB_STR)

def get_token(email, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        data = resp.json()
        if "data" in data and "token" in data["data"]:
            return data["data"]["token"]
        elif "token" in data:
            return data["token"]
    print(f"Failed to login {email}: {resp.status_code} {resp.text}")
    return None

def main():
    print("==================================================")
    print("STARTING COMPREHENSIVE AUTOMATED AUDIT (GATES 4-16)")
    print("==================================================")

    # Tokens
    admin_token = get_token("admin@et.tee", "Check@123")
    sales1_token = get_token("sales@et.tee", "Check@123")
    sales2_token = get_token("sales_shop2@et.tee", "Check@123")
    wh1_token = get_token("warehouse@et.tee", "Check@123")
    ship1_token = get_token("shipping@et.tee", "Check@123")
    mkt_token = get_token("marketing@et.tee", "Check@123")

    print(f"Tokens obtained - Admin: {bool(admin_token)}, Sales1: {bool(sales1_token)}, Sales2: {bool(sales2_token)}, Warehouse: {bool(wh1_token)}, Shipping: {bool(ship1_token)}, Marketing: {bool(mkt_token)}")

    # Register/Login a fresh test customer
    cust_email = f"audit_cust_{int(time.time())}@test.com"
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": cust_email,
        "password": "Password123!",
        "fullName": "Audit Customer",
        "phone": "0987654321"
    })
    print(f"Customer Register HTTP: {reg_resp.status_code}")
    cust_token = get_token(cust_email, "Password123!")

    # GATE 4 — CUSTOMER E2E
    print("\n--- GATE 4: CUSTOMER E2E ---")
    # Browse
    r = requests.get(f"{BASE_URL}/api/products")
    print(f"Browse Products: {r.status_code}, count: {len(r.json().get('data', {}).get('content', [])) if r.status_code == 200 else 'N/A'}")
    
    # Search
    r_search = requests.get(f"{BASE_URL}/api/products?search=shirt")
    print(f"Search Products: {r_search.status_code}")

    # Filter
    r_filter = requests.get(f"{BASE_URL}/api/products?minPrice=100000&maxPrice=500000")
    print(f"Filter Products: {r_filter.status_code}")

    # Product detail
    prod_id = None
    if r.status_code == 200:
        prods = r.json().get('data', {}).get('content', [])
        if prods:
            prod_id = prods[0]['id']
            r_detail = requests.get(f"{BASE_URL}/api/products/{prod_id}")
            print(f"Product Detail (id={prod_id}): {r_detail.status_code}")

    # Cart
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    r_cart = requests.get(f"{BASE_URL}/api/cart", headers=cust_headers)
    print(f"Cart Get: {r_cart.status_code}")

    # GATE 5 — SALES STAFF & GATE 6 — ORDER STATE MACHINE
    print("\n--- GATE 5 & 6: SALES STAFF & ORDER STATE MACHINE ---")
    sales_headers1 = {"Authorization": f"Bearer {sales1_token}"}
    r_sales_orders = requests.get(f"{BASE_URL}/api/staff/orders", headers=sales_headers1)
    print(f"Sales 1 Get Orders: {r_sales_orders.status_code}")
    
    # GATE 8 — CONCURRENCY TEST
    print("\n--- GATE 8: CONCURRENCY TEST ---")
    # Perform concurrent requests to test inventory reservation
    def make_reservation(i):
        # endpoint for checkout / reservation
        resp = requests.post(f"{BASE_URL}/api/checkout", json={
            "items": [{"productId": prod_id or 1, "variantId": 1, "quantity": 5}],
            "shippingAddress": {"street": "123 St", "city": "HCMC"},
            "paymentMethod": "COD"
        }, headers=cust_headers)
        return resp.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_reservation, i) for i in range(5)]
        results = [f.result() for f in futures]
    print(f"Concurrent Reservation HTTP Results: {results}")

    # Check DB stock after concurrency test
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, product_id, quantity, reserved_quantity FROM inventory WHERE product_id = %s;", (prod_id or 1,))
    inv_rows = cur.fetchall()
    print("PostgreSQL Inventory State:", inv_rows)
    cur.close()
    conn.close()

    # GATE 11 & 15 — MULTI-SHOP & SECURITY TEST
    print("\n--- GATE 11 & 15: MULTI-SHOP & SECURITY (IDOR / PRIVILEGE ESCALATION) ---")
    sales_headers2 = {"Authorization": f"Bearer {sales2_token}"}
    
    # Non-admin accessing admin endpoint
    r_unauth_admin = requests.get(f"{BASE_URL}/api/admin/users", headers=cust_headers)
    print(f"Customer accessing /api/admin/users: HTTP {r_unauth_admin.status_code} (Expected 403)")

    # Sales 2 accessing Shop 1 order if any exists
    r_shop1_orders = requests.get(f"{BASE_URL}/api/staff/orders", headers=sales_headers1)
    if r_shop1_orders.status_code == 200:
        orders_data = r_shop1_orders.json().get('data', [])
        if orders_data:
            shop1_order_id = orders_data[0]['id']
            # Sales 2 trying to view shop1_order_id
            r_cross_order = requests.get(f"{BASE_URL}/api/staff/orders/{shop1_order_id}", headers=sales_headers2)
            print(f"Shop 2 staff accessing Shop 1 Order ID {shop1_order_id}: HTTP {r_cross_order.status_code}")

    # GATE 12 — ADMIN
    print("\n--- GATE 12: ADMIN MONITORING & USERS ---")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    r_users = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
    print(f"Admin Get Users: HTTP {r_users.status_code}")
    r_mon = requests.get(f"{BASE_URL}/api/admin/monitoring", headers=admin_headers)
    print(f"Admin Monitoring: HTTP {r_mon.status_code}")

    print("\nMaster audit script initial run complete.")

if __name__ == "__main__":
    main()
