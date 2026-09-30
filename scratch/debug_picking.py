import sys
import requests
import json

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8081"

def get_token(email):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Check@123"}, timeout=5)
    d = resp.json()
    if "data" in d and isinstance(d["data"], dict) and "token" in d["data"]:
        return d["data"]["token"]
    return d.get("token")

wh_headers = {"Authorization": f"Bearer {get_token('warehouse@et.tee')}"}

r_pick = requests.post(f"{BASE_URL}/api/staff/warehouse/orders/47/start-picking", headers=wh_headers)
print(f"Status Code: {r_pick.status_code}")
print(f"Body: {r_pick.text}")
