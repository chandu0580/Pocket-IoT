import requests
import json

BASE_URL = "http://localhost:5000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASS = "admin123"

def get_token():
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASS
        })
        resp.raise_for_status()
        return resp.json()["token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def main():
    token = get_token()
    if not token:
        return

    url = f"{BASE_URL}/api/stream?token={token}"
    print(f"Connecting to SSE stream at {url}...")
    
    try:
        # We use stream=True to keep the connection open
        response = requests.get(url, stream=True)
        print("Connected. Waiting for events...")
        
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                print(f"SSE: {decoded_line}")
    except KeyboardInterrupt:
        print("\nStopping...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
