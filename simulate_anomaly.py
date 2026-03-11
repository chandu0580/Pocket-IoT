import requests
import time
import json
import os
from datetime import datetime, timezone

# Configuration
BASE_URL = "http://localhost:5000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASS = "admin123"
DEVICE_NAME = "Test-Anomaly-Device"

def get_token():
    print(f"Logging in as {ADMIN_EMAIL}...")
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASS
        })
        resp.raise_for_status()
        data = resp.json()
        print("Login successful.")
        return data["token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def register_device():
    print(f"Registering/getting device: {DEVICE_NAME}...")
    try:
        resp = requests.post(f"{BASE_URL}/api/devices/register", json={
            "name": DEVICE_NAME
        })
        resp.raise_for_status()
        device = resp.json()
        print(f"Device ready: ID={device['id']}, Token={device['device_token']}")
        return device
    except Exception as e:
        print(f"Device registration failed: {e}")
        return None

def send_data(device_id, token, x, y, z, battery=90):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "device_id": device_id,
        "x": x,
        "y": y,
        "z": z,
        "battery": battery,
        "latitude": 12.9716,
        "longitude": 77.5946,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    try:
        resp = requests.post(f"{BASE_URL}/api/send-data", json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Failed to send data: {e}")
        return None

def main():
    token = get_token()
    if not token: return
    
    device = register_device()
    if not device: return
    
    # 1. Warm up the model with normal data (if needed)
    # The current implementation has a simple fallback if not trained (mag > 25.0)
    # We can trigger that easily.
    
    print("\n--- Sending Normal Data ---")
    for i in range(3):
        res = send_data(device['id'], device['device_token'], 0.1, 0.2, 9.8) # Normal gravity
        is_anom = res.get('is_anomaly', False) if res else False
        print(f"Point {i+1}: is_anomaly={is_anom}")
        time.sleep(1)

    print("\n--- TRIGGERING LOW BATTERY (WARNING) ---")
    res = send_data(device['id'], device['device_token'], 0.1, 0.2, 9.8, battery=15.0)

    print("\n--- TRIGGERING ANOMALY (WARNING Level, Mag ~30) ---")
    res = send_data(device['id'], device['device_token'], 17.0, 17.0, 17.0)

    print("\n--- TRIGGERING ANOMALY (CRITICAL Level, Mag ~60) ---")
    res = send_data(device['id'], device['device_token'], 34.0, 35.0, 35.0)

    print("\n--- TRIGGERING ANOMALY (EMERGENCY Level, Mag ~100) ---")
    res = send_data(device['id'], device['device_token'], 50.0, 60.0, 70.0)
    if res:
        print(f"Response: {json.dumps(res, indent=2)}")
        if res.get("is_anomaly"):
            print("\nSUCCESS: Anomaly detected and alert triggered!")
        else:
            print("\nFAILED: Anomaly was NOT detected.")
    
    print("\nCheck the Dashboard for toast notifications and activity feed updates.")

if __name__ == "__main__":
    main()
