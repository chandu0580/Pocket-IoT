import requests
import time

BASE_URL = "http://localhost:5000/api"

def test_auth():
    print("--- Testing Authentication Flow ---")
    
    # 1. Login with admin
    print("Testing Login...")
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if resp.status_code != 200:
        print(f"FAILED: Login failed with {resp.status_code}")
        print(resp.text)
        return False
    
    token = resp.json().get("token")
    print("SUCCEEDED: Login successful, token received.")

    # 2. Test Protected API Access
    print("\nTesting Protected API (/api/auth/me)...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if resp.status_code != 200:
        print(f"FAILED: Protected API access failed with {resp.status_code}")
        return False
    
    user = resp.json()
    print(f"SUCCEEDED: Accessed /auth/me. Email: {user.get('email')}")

    # 3. Test Unauthorized Access
    print("\nTesting Unauthorized Access...")
    resp = requests.get(f"{BASE_URL}/auth/me")
    if resp.status_code == 401:
        print("SUCCEEDED: Unauthorized request blocked as expected (401).")
    else:
        print(f"FAILED: Unauthorized request should be blocked, but got {resp.status_code}")
        return False

    # 4. Test Registration (Optional, but let's try a new user)
    print("\nTesting Registration...")
    new_user = {
        "email": f"testuser_{int(time.time())}@example.com",
        "password": "testpassword123"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=new_user)
    if resp.status_code == 201:
        print("SUCCEEDED: New user registered.")
    else:
        print(f"FAILED: Registration failed with {resp.status_code}")
        print(resp.text)
        return False

    print("\n--- AUTH FLOW TEST PASSED ---")
    return True

if __name__ == "__main__":
    test_auth()
