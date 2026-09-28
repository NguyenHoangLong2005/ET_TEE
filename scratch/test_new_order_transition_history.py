import sys
import requests
import json
import psycopg2

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8081"
DB_STR = "postgresql://postgres.yzxpmznwfitcchzeejla:IvGrZjhoNR1cmA0h@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

def get_token(email):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Check@123"}, timeout=5)
    d = resp.json()
    if "data" in d and isinstance(d["data"], dict) and "token" in d["data"]:
        return d["data"]["token"]
    return d.get("token")

customer_headers = {
    "Authorization": f"Bearer {get_token('customer@et.tee')}",
    "X-Guest-Cart-Token": "guest_hardening_456"
}
sales_headers = {"Authorization": f"Bearer {get_token('sales@et.tee')}"}
wh_headers = {"Authorization": f"Bearer {get_token('warehouse@et.tee')}"}

print("1. Creating a new cart and order...")
# Create order via checkout endpoint
checkout_payload = {
    "customerName": "Audit Customer",
    "customerPhone": "0987654321",
    "customerEmail": "customer@et.tee",
    "shippingAddress": "123 Test Street, District 1, HCM City",
    "paymentMethod": "COD",
    "note": "Hardening audit test order"
}
# First add product to cart
cart_resp = requests.post(f"{BASE_URL}/api/cart/items", json={"productId": 173, "variantId": 3542, "quantity": 1}, headers=customer_headers)
print(f"Add to cart response: {cart_resp.status_code}")

order_resp = requests.post(f"{BASE_URL}/api/orders/checkout", json=checkout_payload, headers=customer_headers)
print(f"Checkout response: {order_resp.status_code}")
order_data = order_resp.json()
order_id = None
order_code = None
if isinstance(order_data, dict):
    d_obj = order_data.get("data") if "data" in order_data else order_data
    if isinstance(d_obj, dict):
        order_id = d_obj.get("id")
        order_code = d_obj.get("orderCode")

if not order_id and order_code:
    conn = psycopg2.connect(DB_STR)
    cur = conn.cursor()
    cur.execute("SELECT id FROM public.orders WHERE order_code = %s;", (order_code,))
    row = cur.fetchone()
    if row:
        order_id = row[0]
    cur.close()
    conn.close()

print(f"New Order Created ID: {order_id} (Code: {order_code})")

if order_id:
    # 2. Transition order: PENDING_CONFIRMATION -> CONFIRMED
    r_confirm = requests.post(f"{BASE_URL}/api/staff/sales/orders/{order_id}/confirm", headers=sales_headers)
    print(f"Sales Confirm (PENDING_CONFIRMATION -> CONFIRMED): HTTP {r_confirm.status_code}")

    # 3. Transition order: CONFIRMED -> PICKING
    r_pick = requests.post(f"{BASE_URL}/api/staff/warehouse/orders/{order_id}/picking", headers=wh_headers)
    print(f"Warehouse Picking (CONFIRMED -> PICKING): HTTP {r_pick.status_code}")

    # 4. Transition order: PICKING -> PACKED
    r_pack = requests.post(f"{BASE_URL}/api/staff/warehouse/orders/{order_id}/packing", headers=wh_headers)
    print(f"Warehouse Packing (PICKING -> PACKED): HTTP {r_pack.status_code}")

    # 5. Transition order: PACKED -> HANDED_TO_CARRIER
    r_handover = requests.post(f"{BASE_URL}/api/staff/warehouse/orders/{order_id}/handover", headers=wh_headers)
    print(f"Warehouse Handover (PACKED -> HANDED_TO_CARRIER): HTTP {r_handover.status_code}")

    # Inspect PostgreSQL database records for this new order
    conn = psycopg2.connect(DB_STR)
    cur = conn.cursor()
    cur.execute("SELECT id, order_id, from_status, old_status, status, new_status, changed_by, created_at FROM public.order_status_history WHERE order_id = %s ORDER BY id ASC;", (order_id,))
    rows = cur.fetchall()
    print(f"\n[DB EVIDENCE] Order {order_id} Status History in PostgreSQL:")
    for r in rows:
        print(f"  History ID: {r[0]} | Order: {r[1]} | FromStatus: '{r[2]}' | OldStatus: '{r[3]}' | Status: '{r[4]}' | NewStatus: '{r[5]}' | ChangedBy: '{r[6]}' | CreatedAt: {r[7]}")
    cur.close()
    conn.close()
