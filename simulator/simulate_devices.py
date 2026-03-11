import json
import math
import random
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import requests

BACKEND_URL = "http://localhost:5000"

# Simulated GPS center (Hyderabad, India) — adjust as needed
GPS_CENTER = (17.3850, 78.4867)


@dataclass
class SimDevice:
    id: int
    name: str
    token: str
    battery: float = 100.0
    lat: float = field(default_factory=lambda: GPS_CENTER[0])
    lon: float = field(default_factory=lambda: GPS_CENTER[1])


DEVICES = [
    SimDevice(id=1, name="device_1", token="device_1_token"),
    SimDevice(id=2, name="device_2", token="device_2_token"),
    SimDevice(id=3, name="device_3", token="device_3_token"),
]


def gen_payload(dev: SimDevice) -> dict:
    shock = random.random() < 0.08
    base = random.uniform(18.0, 25.0) if shock else random.uniform(-3.0, 3.0)
    x = base + random.uniform(-0.5, 0.5)
    y = base * random.uniform(-1.0, 1.0)
    z = base * random.uniform(-1.0, 1.0)

    dev.battery = max(0.0, dev.battery - random.uniform(0.05, 0.3))

    # Drift GPS slightly each reading
    dev.lat += random.uniform(-0.0001, 0.0001)
    dev.lon += random.uniform(-0.0001, 0.0001)

    magnitude = math.sqrt(x**2 + y**2 + z**2)

    return {
        "device_id": dev.id,
        "x": round(x, 4),
        "y": round(y, 4),
        "z": round(z, 4),
        "battery": round(dev.battery, 2),
        "latitude": round(dev.lat, 6),
        "longitude": round(dev.lon, 6),
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }


def send(dev: SimDevice) -> None:
    payload = gen_payload(dev)
    try:
        r = requests.post(
            f"{BACKEND_URL}/api/send-data",
            headers={"Authorization": f"Bearer {dev.token}", "Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=5,
        )
        mag = math.sqrt(payload["x"]**2 + payload["y"]**2 + payload["z"]**2)
        status = "OK" if r.ok else f"ERR {r.status_code}"
        print(
            f"[{status}] {dev.name:10s} bat={payload['battery']:5.1f}%  "
            f"|a|={mag:6.2f}  GPS={payload['latitude']:.4f},{payload['longitude']:.4f}"
        )
    except requests.RequestException as e:
        print(f"[FAIL] {dev.name}: {e}")


def main() -> None:
    print(f"PocketIoT Simulator — backend: {BACKEND_URL}")
    print("Sending data every 3 seconds. Press Ctrl+C to stop.\n")
    try:
        while True:
            for dev in DEVICES:
                if dev.battery > 0:
                    send(dev)
            time.sleep(3)
    except KeyboardInterrupt:
        print("\nSimulator stopped.")


if __name__ == "__main__":
    main()
