"""
PocketIoT – One-Click Startup Script (Python)
Runs:
  1. ngrok http 5000  (in background)
  2. Waits for the HTTPS tunnel URL
  3. Writes APP_URL to backend/.env
  4. Starts Flask (python app.py)

Usage:
    python start.py
"""

import subprocess
import sys
import os
import time
import urllib.request
import json
import signal

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT    = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
ENV_FILE = os.path.join(BACKEND, ".env")

def print_banner():
    print("\n" + "="*50)
    print("  🚀 PocketIoT Auto-Start")
    print("="*50 + "\n")

def get_python():
    """Return path to the venv Python (falls back to sys.executable)."""
    venv_py = os.path.join(ROOT, ".venv", "Scripts", "python.exe")  # Windows
    if os.path.exists(venv_py):
        return venv_py
    venv_py_linux = os.path.join(ROOT, ".venv", "bin", "python")
    if os.path.exists(venv_py_linux):
        return venv_py_linux
    return sys.executable

def kill_ngrok():
    """Kill any existing ngrok process."""
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/F", "/IM", "ngrok.exe"], capture_output=True)
    else:
        subprocess.run(["pkill", "-f", "ngrok"], capture_output=True)
    time.sleep(0.5)

def start_ngrok():
    """Start ngrok in the background."""
    print("🔧 Starting ngrok on port 5000...")
    if sys.platform == "win32":
        proc = subprocess.Popen(
            ["ngrok", "http", "5000"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
    else:
        proc = subprocess.Popen(
            ["ngrok", "http", "5000"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    return proc

def get_ngrok_url(retries=40, delay=1.0):
    """Poll ngrok's local API until we get a public HTTPS URL."""
    print("⏳ Waiting for ngrok HTTPS tunnel", end="", flush=True)
    for i in range(retries):
        time.sleep(delay)
        print(".", end="", flush=True)
        try:
            with urllib.request.urlopen("http://localhost:4040/api/tunnels", timeout=2) as r:
                data = json.loads(r.read())
                for tunnel in data.get("tunnels", []):
                    if tunnel.get("proto") == "https":
                        print(f"\n✅ Tunnel active: {tunnel['public_url']}")
                        return tunnel["public_url"]
        except Exception:
            pass
    print("\n❌ Could not get ngrok URL after waiting.")
    return None

def write_env(url):
    """Write APP_URL= to backend/.env, replacing any existing APP_URL line."""
    lines = []
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            lines = [l for l in f.readlines() if not l.startswith("APP_URL=")]
    lines.append(f"APP_URL={url}\n")
    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"📝 Written to .env  →  APP_URL={url}")

def start_flask(python_exe):
    """Start Flask in the foreground (blocks until Ctrl-C)."""
    print("\n🐍 Starting Flask backend...\n" + "="*50 + "\n")
    app_py = os.path.join(BACKEND, "app.py")
    proc = subprocess.Popen([python_exe, app_py], cwd=BACKEND)
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.send_signal(signal.SIGINT)
        proc.wait()

def main():
    print_banner()
    python_exe = get_python()
    print(f"🐍 Python: {python_exe}\n")

    # 1. Kill old ngrok
    kill_ngrok()

    # 2. Start ngrok
    ngrok_proc = start_ngrok()

    # 3. Get the HTTPS URL
    ngrok_url = get_ngrok_url()

    if ngrok_url:
        # 4. Write to .env
        write_env(ngrok_url)
        print(f"\n📱 Scan the QR code in the dashboard.")
        print(f"   Mobile URL will be: {ngrok_url}/mobile?pair=...\n")
    else:
        print("⚠️  Continuing without ngrok. Camera won't work on mobile.")
        print("   Make sure ngrok is installed: https://ngrok.com/download\n")

    # 5. Start Flask
    start_flask(python_exe)

if __name__ == "__main__":
    main()
