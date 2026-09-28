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

ship_token = get_token("shipping@et.tee")
headers = {"Authorization": f"Bearer {ship_token}"}

order_id = 42

print("--- TESTING COMPLETE SHIPPING FLOW ON ORDER 42 ---")

s_payload = {
    "orderId": order_id,
    "carrierName": "GHN_EXPRESS",
    "trackingCode": f"TRK-{order_id}-999",
    "codAmount": 447000.0
}
r1 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments", json=s_payload, headers=headers)
print(f"1. Create Shipment: HTTP {r1.status_code}")

shipment_id = None
if r1.status_code in (200, 201):
    res_data = r1.json()
    if isinstance(res_data, dict):
        data_obj = res_data.get("data") if "data" in res_data else res_data
        if isinstance(data_obj, dict):
            shipment_id = data_obj.get("id") or data_obj.get("shipmentId")

print(f"Shipment ID created: {shipment_id}")

if shipment_id:
    r2 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments/{shipment_id}/handover", headers=headers)
    print(f"2. Handover to Carrier: HTTP {r2.status_code}")

    r3 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments/{shipment_id}/shipping", headers=headers)
    print(f"3. In Transit (Shipping): HTTP {r3.status_code}")

    p_payload = {
        "receiverName": "Audit Customer",
        "imageUrl": "http://img.example.com/proof.jpg",
        "note": "Delivered successfully with signature"
    }
    r4 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments/{shipment_id}/proof", json=p_payload, headers=headers)
    print(f"4. Proof of Delivery (Delivered): HTTP {r4.status_code}")

    r5 = requests.post(f"{BASE_URL}/api/staff/shipping/cod/{shipment_id}/reconcile", headers=headers)
    print(f"5. COD Reconciliation: HTTP {r5.status_code}")

conn = psycopg2.connect(DB_STR)
cur = conn.cursor()
cur.execute("SELECT id, status FROM public.orders WHERE id = %s;", (order_id,))
print("\nPostgreSQL Final Order State:", cur.fetchone())
cur.execute("SELECT id, status, tracking_code, carrier, cod_amount FROM public.shipments WHERE order_id = %s;", (order_id,))
print("PostgreSQL Shipment Record:", cur.fetchone())
cur.execute("SELECT id, old_status, new_status, changed_by, created_at FROM public.order_status_history WHERE order_id = %s ORDER BY id ASC;", (order_id,))
print("PostgreSQL Full Order Status History:")
for h in cur.fetchall():
    print(h)
cur.close()
conn.close()
