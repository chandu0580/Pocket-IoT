import requests
import random
import time
import uuid
import math
from datetime import datetime, timezone

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────
# Change this to your Render URL: e.g. "https://pocket-iot.onrender.com"
BASE_URL = "http://localhost:5000" 

# You need a valid Device ID and Token from your dashboard
DEVICE_ID = 1  
DEVICE_TOKEN = "device_1_token" 

def run_simulator():
    print(f"🚀 Starting PocketIoT Cloud Simulator...")
    print(f"📡 Target: {BASE_URL}/api/send-data")
    print(f"🆔 Device ID: {DEVICE_ID}")
    print(f"Press Ctrl+C to stop.\n")

    # Keep track of battery to simulate drain
    battery = 100.0
    
    # Base location (Hyderabad)
    lat, lng = 17.3850, 78.4867

    try:
        while True:
            # Simulate sensor data
            # Add occasional "anomaly" (higher values)
            is_anomaly = random.random() < 0.05
            if is_anomaly:
                x = random.uniform(15, 25)
                y = random.uniform(15, 25)
                z = random.uniform(15, 25)
                print("🚨 SIMULATING ANOMALY!")
            else:
                x = random.uniform(-2, 2)
                y = random.uniform(-2, 2)
                z = random.uniform(-2, 2)

            # Battery drain
            battery = max(0.5, battery - random.uniform(0.01, 0.1))
            
            # GPS drift
            lat += random.uniform(-0.0001, 0.0001)
            lng += random.uniform(-0.0001, 0.0001)

            payload = {
                "device_id": DEVICE_ID,
                "x": round(x, 4),
                "y": round(y, 4),
                "z": round(z, 4),
                "battery": round(battery, 2),
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            }

            headers = {
                "Authorization": f"Bearer {DEVICE_TOKEN}",
                "Content-Type": "application/json"
            }

            try:
                response = requests.post(f"{BASE_URL}/api/send-data", json=payload, headers=headers, timeout=5)
                
                mag = math.sqrt(x**2 + y**2 + z**2)
                if response.status_code == 200:
                    print(f"✅ Data Sent: Mag={mag:5.2f} | Bat={battery:5.1f}% | Lat={lat:.4f}")
                else:
                    print(f"❌ Error {response.status_code}: {response.text}")
                    
            except Exception as e:
                print(f"⚠️ Connection failed: {e}")

            time.sleep(2) # Stream every 2 seconds

    except KeyboardInterrupt:
        print("\n👋 Simulator stopped.")

if __name__ == "__main__":
    run_simulator()
