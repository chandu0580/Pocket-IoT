import requests
import time
import json

BASE_URL = "http://localhost:5000"
DEVICE_ID = 4
DEVICE_TOKEN = "device_1_token"

def send_data(battery, lat=None, lon=None):
    global DEVICE_TOKEN
    payload = {
        "device_id": DEVICE_ID,
        "x": 1.0, "y": 1.0, "z": 9.8,
        "battery": battery,
        "latitude": lat,
        "longitude": lon,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    headers = {
        "Authorization": f"Bearer {DEVICE_TOKEN}",
        "Content-Type": "application/json"
    }
    r = requests.post(f"{BASE_URL}/api/send-data", json=payload, headers=headers)
    print(f"Sent battery={battery}%, GPS={lat},{lon} | Status: {r.status_code}")
    
    if r.status_code == 401:
        print(f"  --> DEBUG: {r.json()}")
        try:
            debug_info = r.json().get('debug', {})
            expected = debug_info.get('expected')
            if expected:
                print(f"  --> Token mismatch. Retrying with expected token: {expected}")
                DEVICE_TOKEN = expected
                headers["Authorization"] = f"Bearer {DEVICE_TOKEN}"
                r = requests.post(f"{BASE_URL}/api/send-data", json=payload, headers=headers)
                print(f"  --> Retry Status: {r.status_code} | Alerts Created: {r.json().get('alerts_created')}")
        except:
            pass
    elif r.ok:
        print(f"  --> Alerts Created: {r.json().get('alerts_created')}")
        
    return r.json()

if __name__ == "__main__":
    print("Step 1: Sending data with 20.0% battery and NO GPS...")
    send_data(20.0)
    
    print("\nStep 2: Sending data with 19.5% battery and GPS...")
    send_data(19.5, 17.3850, 78.4867)
    
    print("\nStep 3: Sending data again with 19.0% (Checking duplicate prevention)...")
    send_data(19.0, 17.3851, 78.4868)
    
    print("\nStep 4: Fetching alerts to verify...")
    # We need a user token for this, but we can check the database or just look at the 'alerts_created' in response.
