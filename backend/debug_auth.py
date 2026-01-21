import requests

API_URL = "http://localhost:8000/admin/login"
RESET_URL = "http://localhost:8000/admin/reset-password"

def test_login(password):
    try:
        response = requests.post(API_URL, json={"password": password})
        print(f"Login with '{password}': Status {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"Login failed: {e}")

def test_reset(master_key, new_password):
    try:
        response = requests.post(RESET_URL, json={"master_key": master_key, "new_password": new_password})
        print(f"Reset with key '{master_key}': Status {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"Reset failed: {e}")

print("--- Testing Default Password ---")
test_login("admin")

print("\n--- Testing Master Key Reset ---")
test_reset("MASTER_KEY_123", "new_secure_pass")

print("\n--- Testing New Password ---")
test_login("new_secure_pass")
