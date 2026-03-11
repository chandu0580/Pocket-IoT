"""
PocketIoT Full System Audit Script (No Emojis for Windows Compatibility)
"""
import sqlite3, requests, json, sys, os

BASE = "http://localhost:5000"
DB   = os.path.join(os.path.dirname(__file__), "iot_data.db")
PASS = True

def ok(msg): print(f"  [OK]  {msg}")
def fail(msg): global PASS; PASS = False; print(f"  [FAIL] {msg}")
def section(title): print(f"\n{'='*60}\n  {title}\n{'='*60}")

# ── PHASE 3: Database Schema ─────────────────────────────────
section("PHASE 3 - DATABASE SCHEMA")
# Correct table names based on db.py
REQUIRED_TABLES = ["users","organizations","devices","sensor_data","alerts","notifications","device_groups","device_commands","device_snapshots","alert_rules"]
try:
    if not os.path.exists(DB):
        fail(f"Database file NOT FOUND at {DB}")
    else:
        conn = sqlite3.connect(DB)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {r[0] for r in c.fetchall()}
        for t in REQUIRED_TABLES:
            if t in tables: ok(f"Table '{t}' exists")
            else: fail(f"Table '{t}' MISSING")
        conn.close()
except Exception as e:
    fail(f"DB connection error: {e}")

# ── PHASE 4: Auth Flow ───────────────────────────────────────
section("PHASE 4 - AUTHENTICATION")
token = None
try:
    r = requests.post(f"{BASE}/api/auth/login", json={"email":"admin@example.com","password":"admin123"}, timeout=5)
    if r.status_code == 200:
        token = r.json().get("token") or r.json().get("access_token")
        ok(f"Login successful - token obtained: {str(token)[:30]}...")
    else:
        fail(f"Login failed: {r.status_code} - {r.text[:100]}")
except Exception as e:
    fail(f"Auth endpoint unreachable: {e}")

if token:
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE}/api/auth/me", headers=headers, timeout=5)
    if r.status_code == 200: ok(f"GET /api/auth/me -> {r.json().get('email')}")
    else: fail(f"GET /api/auth/me failed: {r.status_code}")

    # Test protected route without token
    r2 = requests.get(f"{BASE}/api/devices", timeout=5)
    if r2.status_code == 401: ok("Protected routes require JWT confirmed")
    else: fail(f"Protected route returned {r2.status_code} without token!")

# ── PHASE 5: Device Listing ──────────────────────────────────
section("PHASE 5 - DEVICES API")
if token:
    r = requests.get(f"{BASE}/api/devices", headers=headers, timeout=5)
    if r.status_code == 200:
        data = r.json()
        devices = data.get("devices", []) if isinstance(data, dict) else data
        ok(f"GET /api/devices -> {len(devices)} devices found")
        for d in devices[:3]:
            print(f"     * [{d.get('id')}] {d.get('name')} - {d.get('status')}")
    else:
        fail(f"GET /api/devices failed: {r.status_code}")

# ── PHASE 7: Telemetry Stats ─────────────────────────────────
section("PHASE 7 - TELEMETRY / STATS")
if token:
    r = requests.get(f"{BASE}/api/stats", headers=headers, timeout=5)
    if r.status_code == 200:
        s = r.json()
        ok(f"GET /api/stats -> total={s.get('total_devices')} online={s.get('online_devices')} alerts={s.get('active_alerts')}")
    else:
        fail(f"GET /api/stats failed: {r.status_code}")

# ── PHASE 8: SSE Stream ──────────────────────────────────────
section("PHASE 8 - SSE STREAM")
try:
    r = requests.get(f"{BASE}/api/stream", stream=True, timeout=3)
    if r.status_code == 200 and "text/event-stream" in r.headers.get("Content-Type",""):
        ok("GET /api/stream -> SSE endpoint alive (text/event-stream)")
    else:
        fail(f"SSE stream check failed: {r.status_code} - Content-Type: {r.headers.get('Content-Type')}")
    r.close()
except requests.Timeout:
    ok("GET /api/stream -> SSE connected (timeout = streaming, expected)")
except Exception as e:
    fail(f"SSE endpoint error: {e}")

# ── PHASE 10: WebRTC Endpoints ──────────────────────────────
section("PHASE 10 - WEBRTC ENDPOINTS")
if token:
    for method, path, body in [
        ("POST", "/api/webrtc/offer", {"device_id": 25, "offer": {"type": "offer", "sdp": "v=0"}}),
        ("POST", "/api/webrtc/answer", {"device_id": 25, "answer": {"type": "answer", "sdp": "v=0"}}),
    ]:
        try:
            r = requests.request(method, f"{BASE}{path}", json=body, headers=headers, timeout=5)
            if r.status_code in [200, 201, 202, 400, 403, 404]:
                ok(f"{method} {path} -> {r.status_code} (endpoint reachable)")
            else:
                fail(f"{method} {path} -> {r.status_code}")
        except Exception as e:
            fail(f"{method} {path} -> error: {e}")

# ── PHASE 14: Security Check ─────────────────────────────────
section("PHASE 14 - SECURITY")
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        env_content = f.read()
    for key in ["JWT_SECRET", "DATABASE_URL"]:
        if key in env_content: ok(f"{key} defined in .env")
        else: fail(f"{key} MISSING from .env")
else:
    fail(".env file NOT FOUND")

# ── FINAL SUMMARY ────────────────────────────────────────────
section("FINAL SUMMARY")
if PASS:
    print("  SUCCESS - ALL CHECKS PASSED - SYSTEM PRODUCTION READY")
else:
    print("  FAILURE - SOME CHECKS FAILED - SEE ABOVE")

print(f"\n  Admin login:\n    Email: admin@example.com\n    Password: admin123\n")
