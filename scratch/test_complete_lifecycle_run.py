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

sales_headers = {"Authorization": f"Bearer {get_token('sales@et.tee')}"}
wh_headers = {"Authorization": f"Bearer {get_token('warehouse@et.tee')}"}
ship_headers = {"Authorization": f"Bearer {get_token('shipping@et.tee')}"}

order_id = 42

print(f"==================================================")
print(f"TESTING COMPLETE 10-STEP LIFECYCLE FOR ORDER {order_id}")
print(f"==================================================")

# Step 5: Warehouse handover to carrier (PACKED -> HANDED_TO_CARRIER)
r5 = requests.post(f"{BASE_URL}/api/staff/warehouse/orders/{order_id}/handover", headers=wh_headers)
print(f"5. Warehouse Handover (PACKED -> HANDED_TO_CARRIER): HTTP {r5.status_code}")

# Step 6: Create Shipment
s_payload = {
    "orderId": order_id,
    "carrierName": "GHN_EXPRESS",
    "trackingCode": f"TRK-{order_id}-999",
    "codAmount": 447000.0
}
r6 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments", json=s_payload, headers=ship_headers)
print(f"6. Shipping Create Shipment: HTTP {r6.status_code}")

shipment_id = None
if r6.status_code in (200, 201):
    res_data = r6.json()
    if isinstance(res_data, dict):
        data_obj = res_data.get("data") if "data" in res_data else res_data
        if isinstance(data_obj, dict):
            shipment_id = data_obj.get("id") or data_obj.get("shipmentId")
print(f"Shipment ID created: {shipment_id}")

if shipment_id:
    # Step 7: Carrier Handover
    r7 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments/{shipment_id}/handover", headers=ship_headers)
    print(f"7. Carrier Handover: HTTP {r7.status_code}")

    # Step 8: Start Shipping (In Transit)
    r8 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments/{shipment_id}/shipping", headers=ship_headers)
    print(f"8. In Transit (Shipping): HTTP {r8.status_code}")

    # Step 9: Proof of Delivery (Delivered)
    p_payload = {
        "receiverName": "Audit Customer",
        "imageUrl": "http://img.example.com/proof.jpg",
        "note": "Delivered successfully with signature"
    }
    r9 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments/{shipment_id}/proof", json=p_payload, headers=ship_headers)
    print(f"9. Proof of Delivery (Delivered): HTTP {r9.status_code}")

    # Step 10: COD Reconciliation
    r10 = requests.post(f"{BASE_URL}/api/staff/shipping/cod/{shipment_id}/reconcile", headers=ship_headers)
    print(f"10. COD Reconciliation: HTTP {r10.status_code}")

# Database Verification
conn = psycopg2.connect(DB_STR)
cur = conn.cursor()
cur.execute("SELECT id, status FROM public.orders WHERE id = %s;", (order_id,))
print("\n[DB] PostgreSQL Final Order State:", cur.fetchone())

cur.execute("SELECT shipment_id, status, tracking_code, carrier_name, cod_amount FROM public.shipments WHERE order_id = %s;", (order_id,))
print("[DB] PostgreSQL Shipment Record:", cur.fetchone())

cur.execute("SELECT id, old_status, new_status, changed_by, created_at FROM public.order_status_history WHERE order_id = %s ORDER BY id ASC;", (order_id,))
print("\n[DB] PostgreSQL Complete Order Status History:")
for h in cur.fetchall():
    print(f"  ID: {h[0]} | Old: {h[1]} | New: {h[2]} | ChangedBy: {h[3]} | Time: {h[4]}")
cur.close()
conn.close()
