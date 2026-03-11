import requests
import time
import random
import math

BASE_URL = "http://localhost:5000"
DEVICE_ID = 1
DEVICE_TOKEN = "0c5a0a491d5efc6741922ae67f0e5d03"

def send_data(x, y, z):
    payload = {
        "device_id": DEVICE_ID,
        "x": x,
        "y": y,
        "z": z,
        "battery": 85,
        "latitude": 37.7749,
        "longitude": -122.4194
    }
    headers = {
        "Authorization": f"Bearer {DEVICE_TOKEN}"
    }
    try:
        res = requests.post(f"{BASE_URL}/api/send-data", json=payload, headers=headers)
        data = res.json()
        status = "ANOMALY" if data.get("is_anomaly") else "NORMAL"
        print(f"[{status}] Sent: {payload['x']:.2f}, {payload['y']:.2f}, {payload['z']:.2f} | Score: {data.get('anomaly_score', 0):.4f}")
    except Exception as e:
        print(f"Error sending data: {e}")

def main():
    print("🚀 Starting Anomaly Simulation...")
    print("Phase 1: Normal data (baseline training)")
    for i in range(20):
        # Slightly noisy gravity-ish data
        x = random.uniform(-0.5, 0.5)
        y = random.uniform(-0.5, 0.5)
        z = random.uniform(9.5, 10.1)
        send_data(x, y, z)
        time.sleep(1)

    print("\nPhase 2: Sudden Anomaly!")
    # Send a massive spike
    send_data(15.5, 12.2, 5.0) # Magnitude ~20
    time.sleep(1)
    send_data(20.0, 20.0, 20.0) # Magnitude ~34
    
    print("\nPhase 3: Back to normal")
    for i in range(5):
        x = random.uniform(-0.5, 0.5)
        y = random.uniform(-0.5, 0.5)
        z = random.uniform(9.5, 10.1)
        send_data(x, y, z)
        time.sleep(1)

if __name__ == "__main__":
    main()
