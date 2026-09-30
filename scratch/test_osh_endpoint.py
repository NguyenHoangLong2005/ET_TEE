import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8081/api"

def login(username, password):
    url = f"{BASE_URL}/auth/login"
    data = json.dumps({"username": username, "password": password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            return body.get("token")
    except Exception as e:
        print(f"Login failed for {username}: {e}")
        return None

def test_order_history():
    # Login staff
    staff_token = login("staff1", "123456")
    if not staff_token:
        print("Staff login failed")
        return

    # Check order history endpoint for an order
    headers = {"Authorization": f"Bearer {staff_token}"}
    req = urllib.request.Request(f"{BASE_URL}/staff/sales/orders/42/status-history", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            history = json.loads(resp.read().decode('utf-8'))
            print("Order 42 Status History:")
            print(json.dumps(history, indent=2))
    except Exception as e:
        print(f"Failed to fetch order status history: {e}")

if __name__ == "__main__":
    test_order_history()
