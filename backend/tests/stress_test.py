import requests
import time
import concurrent.futures
from datetime import datetime, timezone

BASE_URL = "http://localhost:5000/api"
DEVICE_NAME = "Stress-Test-Device"

def get_device():
    print("Registering stress test device...")
    resp = requests.post(f"{BASE_URL}/devices/register", json={"name": DEVICE_NAME})
    resp.raise_for_status()
    return resp.json()

def send_one(device_id, token):
    payload = {
        "device_id": device_id,
        "x": 0.1, "y": 0.2, "z": 9.8,
        "battery": 95,
        "latitude": 12.0, "longitude": 77.0,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.post(f"{BASE_URL}/send-data", json=payload, headers=headers, timeout=2)
        return resp.status_code
    except Exception as e:
        return str(e)

def run_stress_test(num_requests=200, workers=20):
    device = get_device()
    did = device["id"]
    token = device["device_token"]
    
    print(f"Starting stress test: {num_requests} requests with {workers} workers...")
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(send_one, did, token) for _ in range(num_requests)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    duration = time.time() - start_time
    success = results.count(201)
    failed = len(results) - success
    
    print(f"\n--- Stress Test Results ---")
    print(f"Duration: {duration:.2f} seconds")
    print(f"Total Requests: {len(results)}")
    print(f"Success (201): {success}")
    print(f"Failed: {failed}")
    print(f"Throughput: {len(results)/duration:.2f} req/s")
    
    if failed > 0:
        print("Recent failures:", results[:10])

if __name__ == "__main__":
    run_stress_test()
