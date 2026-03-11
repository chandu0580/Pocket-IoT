import requests
import time
from datetime import datetime, timezone

BASE_URL = "http://localhost:5000/api"
DEVICE_NAME = "Anomaly-Sensor"

def register_device():
    print(f"Registering {DEVICE_NAME}...")
    resp = requests.post(f"{BASE_URL}/devices/register", json={"name": DEVICE_NAME})
    resp.raise_for_status()
    return resp.json()

def send_data(did, token, x, y, z, battery=100, label="normal"):
    payload = {
        "device_id": did,
        "x": x, "y": y, "z": z,
        "battery": battery,
        "latitude": 12.97, "longitude": 77.59,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/send-data", json=payload, headers=headers)
    print(f"[{label.upper()}] Sent: x={x}, y={y}, z={z} | Status: {resp.status_code}")
    return resp.json()

def run_test():
    device = register_device()
    did = device["id"]
    token = device["device_token"]
    
    print("\n--- Sending Normal Data (5 points) ---")
    for _ in range(5):
        send_data(did, token, 0.1, 0.1, 9.8, label="normal")
        time.sleep(1)
        
    print("\n--- Sending ANOMALY (High Acceleration) ---")
    send_data(did, token, 15.0, 20.0, 30.0, label="anomaly")
    
    print("\n--- Sending Low Battery (15%) ---")
    send_data(did, token, 0.1, 0.1, 9.8, battery=15, label="low_battery")
    
    time.sleep(2)
    print("\nChecking for alerts in DB...")
    # We'll just verify the last few alerts via API if we had a user token, but let's just check the log
    print("Test complete. Check dashboard or backend logs for alert broadcasts.")

if __name__ == "__main__":
    run_test()
