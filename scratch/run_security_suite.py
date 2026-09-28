import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8081"

def get_token(email, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=5)
    d = resp.json()
    if "data" in d and isinstance(d["data"], dict) and "token" in d["data"]:
        return d["data"]["token"]
    return d.get("token")

admin_token = get_token("admin@et.tee", "Check@123")
sales1_token = get_token("sales@et.tee", "Check@123")
sales2_token = get_token("sales_shop2@et.tee", "Check@123")
cust_token = get_token("audit_customer@et.tee", "Check@123")

print("==================================================")
print("SECURITY & AUTHORIZATION ATTACK TEST SUITE")
print("==================================================")

cust_headers = {"Authorization": f"Bearer {cust_token}"}
sales1_headers = {"Authorization": f"Bearer {sales1_token}"}
sales2_headers = {"Authorization": f"Bearer {sales2_token}"}

# 1. Customer -> Admin Privilege Escalation
r1 = requests.get(f"{BASE_URL}/api/admin/users", headers=cust_headers)
print(f"1. Customer accessing Admin Users endpoint: HTTP {r1.status_code} (Expected 403)")

# 2. Customer -> Sales Confirm
r2 = requests.post(f"{BASE_URL}/api/staff/sales/orders/42/confirm", headers=cust_headers)
print(f"2. Customer confirming Sales Order: HTTP {r2.status_code} (Expected 403)")

# 3. Customer -> Warehouse Picking
r3 = requests.post(f"{BASE_URL}/api/staff/warehouse/orders/42/picking", headers=cust_headers)
print(f"3. Customer executing Warehouse Picking: HTTP {r3.status_code} (Expected 403)")

# 4. Customer -> Shipping Create Shipment
r4 = requests.post(f"{BASE_URL}/api/staff/shipping/shipments", json={"orderId": 42}, headers=cust_headers)
print(f"4. Customer creating Shipping Shipment: HTTP {r4.status_code} (Expected 403)")

# 5. Cross-Shop Access (Shop 2 Staff -> Shop 1 Order)
r5 = requests.get(f"{BASE_URL}/api/staff/sales/orders/42", headers=sales2_headers)
print(f"5. Shop 2 Staff accessing Shop 1 Order #42: HTTP {r5.status_code} (Expected 403)")

# 6. Unauthenticated request to protected endpoint
r6 = requests.get(f"{BASE_URL}/api/admin/users")
print(f"6. Unauthenticated request to Admin Users: HTTP {r6.status_code} (Expected 401 or 403)")

print("\n==================================================")
print("SECURITY TEST SUITE COMPLETED")
print("==================================================")
