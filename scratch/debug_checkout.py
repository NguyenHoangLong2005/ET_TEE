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

token = get_token('customer@et.tee')
headers = {
    "Authorization": f"Bearer {token}",
    "X-Guest-Cart-Token": "guest_hardening_789"
}

# Add item
requests.post(f"{BASE_URL}/api/cart/items", json={"productId": 173, "variantId": 3542, "quantity": 1}, headers=headers)

# Checkout
checkout_payload = {
    "shippingAddress": "123 Test Street, District 1, HCM City",
    "paymentMethod": "COD",
    "note": "Hardening audit test order"
}
resp = requests.post(f"{BASE_URL}/api/orders/checkout", json=checkout_payload, headers=headers)
print(f"Status Code: {resp.status_code}")
print(f"Body: {resp.text}")
