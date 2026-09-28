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

customer_token = get_token('customer@et.tee')
headers = {
    "Authorization": f"Bearer {customer_token}",
    "X-Guest-Cart-Token": "guest_hardening_123"
}

resp = requests.post(f"{BASE_URL}/api/cart/items", json={"productId": 173, "variantId": 3542, "quantity": 1}, headers=headers)
print(f"Status Code: {resp.status_code}")
print(f"Body: {resp.text}")
