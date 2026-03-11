import requests
import json
import sseclient # pip install sseclient-py
import threading
import time

BASE_URL = "http://localhost:5000/api"

def get_token():
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@example.com", "password": "admin123"})
    return resp.json()["token"]

def listen_sse(token):
    headers = {"Authorization": f"Bearer {token}"}
    # Using requests with stream=True
    response = requests.get(f"{BASE_URL}/stream", headers=headers, stream=True)
    client = sseclient.SSEClient(response)
    print("SSE Client connected. Listening for events...")
    for event in client.events():
        print(f"Received Event: {event.event} | Data: {event.data}")
        if event.event == "ping": continue
        # If we got a real event, we can stop
        if event.data:
            print("Successfully verified SSE data transmission.")
            return

def run_verify():
    try:
        token = get_token()
        t = threading.Thread(target=listen_sse, args=(token,), daemon=True)
        t.start()
        
        # Now trigger an event by sending data
        time.sleep(2)
        print("Triggering event via data ingestion...")
        resp = requests.post(f"{BASE_URL}/devices/register", json={"name": "SSE-Tester"})
        device = resp.json()
        did = device["id"]
        dtoken = device["device_token"]
        
        # Send anomaly to trigger alert event
        headers = {"Authorization": f"Bearer {dtoken}"}
        payload = {
            "device_id": did, "x": 50, "y": 50, "z": 50, "battery": 100, 
            "latitude": 0, "longitude": 0, "timestamp": "2026-03-07T23:00:00Z"
        }
        requests.post(f"{BASE_URL}/send-data", json=payload, headers=headers)
        
        # Wait for SSE to catch it
        time.sleep(5)
    except Exception as e:
        print(f"SSE Verification Error: {e}")

if __name__ == "__main__":
    run_verify()
