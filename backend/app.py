import sys
import os
import logging
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import math
from datetime import datetime, timezone, timedelta
from functools import wraps

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import jwt
import bcrypt
from werkzeug.middleware.proxy_fix import ProxyFix
import flask.cli
flask.cli.show_server_banner = lambda *args: None
logging.getLogger('werkzeug').setLevel(logging.ERROR)
from urllib.parse import urljoin
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import Config

import sse
import db
from db import get_db_connection, init_db, get_placeholder, is_postgres
from services.notification_service import trigger_alert_notifications
from models import (
    create_alert,
    create_sensor_data,
    count_today_data_points,
    get_alerts,
    get_devices,
    get_device,
    update_device,
    delete_device,
    get_sensor_data,
    get_device_by_token,
    register_or_get_device,
    update_device_last_seen,
    create_notification,
    get_notifications,
    update_command_status,
    fail_old_commands,
    create_user,
    get_user_by_email,
    get_user_by_id,
    create_command,
    get_pending_commands,
    delete_alerts,
    create_device_snapshot,
    get_latest_snapshot,
    create_alert_rule,
    get_alert_rules,
    update_alert_rule_count,
    get_all_devices,
)
import models
from sse import broadcaster
from ai_detector import detector

load_dotenv()

# ─── Global Public URL (set once at startup) ─────────────────────────────────
PUBLIC_BASE_URL = ""

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "pocket_iot_enterprise_secure_key_32_bytes_minimum")
JWT_ALGORITHM = "HS256"

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"message": "Token is missing"}), 401
        
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            request.user_id = data["user_id"]
            request.org_id = data.get("organization_id")
            request.role = data.get("role")
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Token is invalid"}), 401
            
        return f(*args, **kwargs)
    return decorated

MOBILE_HTML = os.path.join(os.path.dirname(__file__), "templates", "mobile_app.html")

def _row(row):
    return {key: row[key] for key in row.keys()}


import threading
import time

# ─── In-memory pairing token store { token: {org_id, expires_at} } ───────────
# For production, swap this dict for Redis with TTL.
_pair_tokens: dict = {}
_pair_tokens_lock = threading.Lock()

# ... [imports] ...\n
# Removed redundant start_offline_checker to unify with heartbeat_monitor

def get_lan_ip() -> str:
    """Return the machine's LAN IP address (e.g. 192.168.x.x).
    Falls back to 127.0.0.1 if detection fails.
    """
    import socket as _socket
    try:
        # Connect to an external address (doesn't actually send data)
        s = _socket.socket(_socket.AF_INET, _socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # Trust standard proxy headers (X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host, etc.)
    # Higher counts for x_for/x_proto ensure it works through multiple layers of proxies (like ngrok + render)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=2, x_proto=2, x_host=2, x_port=2, x_prefix=2)
    
    # Standardize database path to be absolute relative to backend folder
    db_url = os.getenv("DATABASE_URL", "sqlite:///iot_data.db")
    if db_url.startswith("sqlite:///"):
        db_filename = db_url.replace("sqlite:///", "", 1)
        if not os.path.isabs(db_filename):
            # Make it absolute relative to the backend directory
            base_dir = os.path.dirname(os.path.abspath(__file__))
            db_path = os.path.abspath(os.path.join(base_dir, db_filename))
        else:
            db_path = db_filename
        app.config["DATABASE_PATH"] = f"sqlite:///{db_path}"
    else:
        app.config["DATABASE_PATH"] = db_url
    
    # ── Resolve PUBLIC_BASE_URL (never localhost for pairing) ──
    global PUBLIC_BASE_URL
    _env_url = os.environ.get("APP_URL", "").strip().rstrip("/")
    if not _env_url:
        _env_url = os.environ.get("RENDER_EXTERNAL_URL", "").strip().rstrip("/")

    if _env_url and _env_url.startswith("http"):
        PUBLIC_BASE_URL = _env_url
    else:
        # Fallback for local pairing if not in strict production mode
        try:
            _lan = get_lan_ip()
            PUBLIC_BASE_URL = f"http://{_lan}:5000"
        except Exception:
            PUBLIC_BASE_URL = "http://localhost:5000"

    print(f"🚀 PUBLIC_BASE_URL: {PUBLIC_BASE_URL}")
    print(f"Starting backend with DATABASE_PATH: {app.config['DATABASE_PATH']}")
    
    # Force DB Initialization on Startup
    try:
        init_db(app.config["DATABASE_PATH"])
    except Exception as e:
        print(f"❌ Critical: DB initialization failed: {e}")

    app.config["ALERT_ACCEL_THRESHOLD"] = float(os.getenv("ALERT_ACCEL_THRESHOLD", "15.0"))

    # Updated CORS for deployment stabilization
    CORS(app, 
         resources={r"/*": {"origins": "*"}}, 
         supports_credentials=True,
         expose_headers=["Content-Type", "Authorization"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"])


    @app.route("/")
    def health_check():
        return {"status": "PocketIoT backend running"}, 200

    @app.route("/_ping")
    def ping():
        return jsonify({"status": "online", "timestamp": datetime.now(timezone.utc).isoformat()})

    if not os.path.exists("logs"):
        os.makedirs("logs")
    file_handler = logging.FileHandler("logs/pocketiot.log")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s"))
    app.logger.addHandler(file_handler)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        handlers=[logging.StreamHandler(), file_handler]
    )
    # Suppress verbose Flask startup logs
    logging.getLogger('werkzeug').disabled = True

    # Resilient Limiter storage selection (Render-optimized)
    # Only use Redis if explicitly configured via environment variable
    redis_url = os.environ.get("REDIS_URL")
    if redis_url:
        storage_uri = redis_url
        try:
            import redis
            r = redis.from_url(storage_uri, socket_timeout=2)
            r.ping()
            logging.info("✅ Redis connected for Rate Limiting.")
        except Exception:
            logging.warning("⚠️ Redis URL provided but connection failed. Falling back to memory://")
            storage_uri = "memory://"
    else:
        # No REDIS_URL env var? Just use memory.
        storage_uri = "memory://"

    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        storage_uri=storage_uri,
        default_limits=["10000 per day", "2000 per hour"]
    )

    
    # Auto-seed admin user
    if db.DB_INITIALIZED:
        try:
            with app.app_context():
                with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                    cursor = conn.cursor()
                
                    # Delete existing variants to prevent confusion
                    cursor.execute("DELETE FROM users WHERE email IN ('admin@example.com', 'admin@pocketiot.com')")
                    conn.commit()
                    
                    # Always ensure admin@pocketiot.com exists (matches the brand)
                    pwd_hash = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                    
                    # Ensure 'Default Organization' exists for multi-tenant isolation
                    cursor.execute("SELECT id FROM organizations WHERE name = 'Default Organization'")
                    org_row = cursor.fetchone()
                    
                    if not org_row:
                        print("Seeding 'Default Organization'...")
                        cursor.execute("INSERT INTO organizations (name, plan) VALUES ('Default Organization', 'Enterprise')")
                        conn.commit()
                        cursor.execute("SELECT id FROM organizations WHERE name = 'Default Organization'")
                        org_row = cursor.fetchone()
                    
                    # Robust ID extraction for dict cursors
                    if org_row and (isinstance(org_row, dict) or hasattr(org_row, '__getitem__')):
                        try:
                            default_org_id = org_row["id"]
                        except (KeyError, TypeError):
                            default_org_id = org_row[0]
                    else:
                        default_org_id = org_row[0] if org_row else None
                    
                    # Check if admin already exists to avoid redundant hashing/inserts
                    cursor.execute("SELECT id FROM users WHERE email = 'admin@pocketiot.com'")
                    if not cursor.fetchone():
                        pwd_hash = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                        models.create_user(conn, "admin@pocketiot.com", pwd_hash, role="admin", org_id=default_org_id)
                        print(f"✅ Admin user auto-seeded successfully with org {default_org_id}.")
                    else:
                        # Optional: Reset password if needed, but for now just log it
                        print(f"✅ Admin user ready: admin@pocketiot.com (Org: {default_org_id})")
                        print("Seeding demo device (ID=1) for simulator...")
                        now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
                        p = get_placeholder(conn)
                        try:
                            # Try forcing ID=1
                            cursor.execute(
                                f"INSERT INTO devices (id, name, device_token, organization_id, created_at) VALUES (1, {p}, {p}, {p}, {p})",
                                ("demo-device", "device_1_token", default_org_id, now)
                            )
                        except Exception:
                            # Fallback if ID 1 is somehow taken
                            cursor.execute(
                                f"INSERT INTO devices (name, device_token, organization_id, created_at) VALUES ({p}, {p}, {p}, {p})",
                                ("demo-device", "device_1_token", default_org_id, now)
                            )
                        conn.commit()
                        print("Demo device seeded successfully.")
        except Exception as e:
            print(f"Notice: Initialization error during auto-seed: {e}")

    # Redundant checker removed

    # ── Mobile Web App ──────────────────────────────────────────────────────

    @app.route("/mobile")
    def mobile_page():
        with open(MOBILE_HTML, "r", encoding="utf-8") as f:
            return f.read(), 200, {"Content-Type": "text/html"}

    # ── Health ──────────────────────────────────────────────────────────────
    @app.route("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "service": "PocketIoT"
        }), 200

    # ── Auth Endpoints ────────────────────────────────────────────────────────
    @app.route("/api/auth/register", methods=["POST"])
    def register():
        data = request.get_json(force=True) or {}
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400
            
        pwd_bytes = str(password).encode("utf-8")
        pwd_hash = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")
        with get_db_connection(app.config["DATABASE_PATH"]) as conn:
            models.create_user(conn, email, pwd_hash, role='admin') # First user as admin
            
        return jsonify({"message": "User registered successfully"}), 201

    @app.route("/api/auth/login", methods=["POST"])
    @limiter.limit("10 per minute")
    def login():
        data = request.get_json(force=True) or {}
        email = data.get("email")
        password = data.get("password")
        
        print(f"LOGIN ATTEMPT: {email}")
        print(f"Received request body: {data}")
        
        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400
            
        with get_db_connection(app.config["DATABASE_PATH"]) as conn:
            user = models.get_user_by_email(conn, email)
            
            print(f"User found in database: {user is not None}")
            if user:
                print(f"Stored password hash: {user['password_hash']}")
            
            if not user:
                print(f"❌ LOGIN FAILED: User {email} not found in DB")
                return jsonify({"message": "Invalid credentials"}), 401
                
            pwd_bytes = str(password).encode("utf-8")
            # Ensure the stored hash is properly encoded for bcrypt
            stored_hash = user["password_hash"]
            if isinstance(stored_hash, str):
                hash_bytes = stored_hash.encode("utf-8")
            else:
                hash_bytes = stored_hash
                
            try:
                pwd_match = bcrypt.checkpw(pwd_bytes, hash_bytes)
            except Exception as e:
                print(f"❌ Bcrypt error: {e}")
                pwd_match = False

            print(f"Password match result for {email}: {pwd_match}")
            
            if not pwd_match:
                return jsonify({"message": "Invalid credentials"}), 401
                
            token = jwt.encode(
                {
                    "user_id": user["id"],
                    "email": user["email"],
                    "role": user["role"],
                    "organization_id": user["organization_id"],
                    "exp": datetime.now(timezone.utc) + timedelta(days=1)
                },
                JWT_SECRET,
                algorithm=JWT_ALGORITHM
            )
            print(f"JWT generation result: Success for org {user['organization_id']}")
            
        return jsonify({
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "organization_id": user["organization_id"]
            }
        })

    @app.route("/api/auth/me", methods=["GET"])
    @token_required
    def get_me():
        with get_db_connection(app.config["DATABASE_PATH"]) as conn:
            user = models.get_user_by_id(conn, request.user_id)
            if not user:
                return jsonify({"message": "User not found"}), 404
            
            org = None
            if user.get("organization_id"):
                org = models.get_organization(conn, user["organization_id"])
            
            return jsonify({
                **user,
                "organization": org
            })

    # ── Sensor Data Stats ───────────────────────────────────────────────────
    @app.route("/api/sensor-data/stats", methods=["GET"])
    @token_required
    def api_sensor_stats():
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                is_pg = is_postgres(conn)
                c = conn.cursor()

                # Get optional device_id from query parameters
                device_id = request.args.get("device_id", type=int)
                
                # Default to last 7 days if not specified
                days = request.args.get("days", type=int, default=7)
                if days <= 0:
                    return jsonify({"error": "Days parameter must be positive"}), 400

                # Calculate start date for filtering
                start_date = datetime.utcnow() - timedelta(days=days)
                start_date_str = start_date.isoformat() + "Z"

                if is_pg:
                    query = """
                        SELECT
                            TO_CHAR(timestamp, 'YYYY-MM-DD') AS date,
                            AVG(motion_magnitude) AS avg_magnitude,
                            MAX(motion_magnitude) AS max_magnitude,
                            COUNT(*) AS count
                        FROM sensor_data
                        WHERE timestamp >= %s
                        {}
                        GROUP BY date
                        ORDER BY date ASC
                    """.format("AND device_id = %s" if device_id else "")
                else:
                    query = """
                        SELECT
                            STRFTIME('%Y-%m-%d', timestamp) AS date,
                            AVG(motion_magnitude) AS avg_magnitude,
                            MAX(motion_magnitude) AS max_magnitude,
                            COUNT(*) AS count
                        FROM sensor_data
                        WHERE timestamp >= ?
                        {}
                        GROUP BY date
                        ORDER BY date ASC
                    """.format("AND device_id = ?" if device_id else "")
                
                params = [start_date_str]
                if device_id:
                    params.append(device_id)

                c.execute(query, tuple(params))
                rows = c.fetchall()

                stats = []
                for r in rows:
                    rd = dict(r)
                    stats.append({
                        "date": rd["date"],
                        "avg_magnitude": float(f"{float(rd['avg_magnitude'] or 0):.2f}"),
                        "max_magnitude": float(f"{float(rd['max_magnitude'] or 0):.2f}"),
                        "count": rd["count"]
                    })
            return jsonify({"stats": stats}), 200
        except Exception:
            logging.exception("Failed to fetch sensor data stats")
            return jsonify({"error": "Internal server error"}), 500

    # ── Devices ─────────────────────────────────────────────────────────────
    @app.route("/api/devices", methods=["GET"])
    @token_required
    def api_devices():
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                is_pg = is_postgres(conn)
                p = get_placeholder(conn)
                c = conn.cursor()
                if is_pg:
                    query = f"""
                        SELECT DISTINCT ON (d.id)
                            d.id, d.name, s.battery, d.last_seen, d.status,
                            s.motion_magnitude, s.latitude, s.longitude,
                            d.group_id, dg.name as group_name
                        FROM devices d
                        LEFT JOIN sensor_data s ON d.id = s.device_id
                        LEFT JOIN device_groups dg ON d.group_id = dg.id
                        WHERE d.organization_id = {p} OR d.organization_id IS NULL
                        ORDER BY d.id, s.timestamp DESC
                    """
                else:
                    query = f"""
                        SELECT
                            d.id, d.name, s.battery, d.last_seen, d.status,
                            s.motion_magnitude, s.latitude, s.longitude,
                            d.group_id, dg.name as group_name
                        FROM devices d
                        LEFT JOIN sensor_data s ON d.id = s.device_id
                            AND s.timestamp = (
                                SELECT MAX(timestamp) FROM sensor_data WHERE device_id = d.id
                            )
                        LEFT JOIN device_groups dg ON d.group_id = dg.id
                        WHERE d.organization_id = {p} OR d.organization_id IS NULL
                    """

                c.execute(query, (request.org_id,))

                devices = []
                for row in c.fetchall():
                    row_dict = dict(row)
                    devices.append({
                        "id": row_dict["id"],
                        "name": row_dict["name"],
                        "battery": row_dict.get("battery"),
                        "last_seen": row_dict.get("last_seen"),
                        "status": row_dict.get("status"),
                        "motion_magnitude": row_dict.get("motion_magnitude"),
                        "latitude": row_dict.get("latitude"),
                        "longitude": row_dict.get("longitude"),
                        "group_id": row_dict.get("group_id"),
                        "group_name": row_dict.get("group_name"),
                    })
            return jsonify({"devices": devices}), 200
        except Exception:
            logging.exception("Failed to fetch devices")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/devices/locations", methods=["GET"])
    @token_required
    def api_device_locations():
        """Return latest GPS location for every device that has sensor data."""
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                is_pg = is_postgres(conn)
                p = get_placeholder(conn)
                c = conn.cursor()
                if is_pg:
                    query = f"""
                        SELECT DISTINCT ON (d.id)
                            d.id AS device_id, d.name, d.status, d.last_seen,
                            s.latitude, s.longitude, s.battery, s.motion_magnitude, s.noise_level, s.speed,
                            d.group_id, dg.name as group_name,
                            (SELECT COUNT(*) FROM alerts WHERE device_id = d.id AND status = 'active') as alert_count
                        FROM devices d
                        LEFT JOIN sensor_data s ON d.id = s.device_id
                        LEFT JOIN device_groups dg ON d.group_id = dg.id
                        WHERE d.organization_id = {p}
                        ORDER BY d.id, s.timestamp DESC
                    """
                else:
                    query = f"""
                        SELECT
                            d.id AS device_id, d.name, d.status, d.last_seen,
                            s.latitude, s.longitude, s.battery, s.motion_magnitude, s.noise_level, s.speed,
                            d.group_id, dg.name as group_name,
                            (SELECT COUNT(*) FROM alerts WHERE device_id = d.id AND status = 'active') as alert_count
                        FROM devices d
                        LEFT JOIN sensor_data s ON d.id = s.device_id
                        LEFT JOIN device_groups dg ON d.group_id = dg.id
                        AND s.timestamp = (
                            SELECT MAX(timestamp) FROM sensor_data WHERE device_id = d.id
                        )
                        WHERE d.organization_id = {p} OR d.organization_id IS NULL
                    """
                c.execute(query, (request.org_id,))

                locations = []
                for row in c.fetchall():
                    rd = dict(row)
                    locations.append({
                        "device_id": rd["device_id"],
                        "name": rd["name"],
                        "status": rd["status"],
                        "latitude": rd.get("latitude"),
                        "longitude": rd.get("longitude"),
                        "battery": rd.get("battery"),
                        "magnitude": rd.get("motion_magnitude"),
                        "noise_level": rd.get("noise_level"),
                        "speed": rd.get("speed"),
                        "last_seen": rd.get("last_seen"),
                        "alert_count": rd.get("alert_count", 0),
                        "group_id": rd.get("group_id"),
                        "group_name": rd.get("group_name"),
                    })
            return jsonify(locations), 200
        except Exception:
            logging.exception("Failed to fetch device locations")
            return jsonify({"error": "Internal server error"}), 500
    @app.route("/api/devices/<int:device_id>/history", methods=["GET"])
    @token_required
    def api_device_history(device_id):
        minutes = int(request.args.get("minutes", 30))
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                history = models.get_device_history(conn, device_id, minutes)
            return jsonify(history), 200
        except Exception:
            logging.exception("Failed to fetch device history")
            return jsonify({"error": "Internal server error"}), 500

    # WebRTC Signaling Infrastructure
    webrtc_sessions = {} # device_id -> session_data

    @app.route("/api/webrtc/offer", methods=["POST"])
    def webrtc_offer():
        data = request.get_json()
        device_id = data.get("device_id")
        offer = data.get("offer")
        if not device_id or not offer:
            return jsonify({"error": "Missing device_id or offer"}), 400
        
        webrtc_sessions[device_id] = {
            "offer": offer,
            "answer": None,
            "ice_candidates": []
        }
        # Notify dashboard via SSE
        broadcaster.broadcast("webrtc_offer", {"device_id": device_id, "offer": offer})
        return jsonify({"success": True}), 200

    @app.route("/api/webrtc/answer", methods=["POST"])
    def webrtc_answer():
        data = request.get_json()
        device_id = data.get("device_id")
        answer = data.get("answer")
        if not device_id or not answer:
            return jsonify({"error": "Missing device_id or answer"}), 400
        
        if device_id in webrtc_sessions:
            webrtc_sessions[device_id]["answer"] = answer
            # Notify mobile app via SSE
            broadcaster.broadcast("webrtc_answer", {"device_id": device_id, "answer": answer})
            return jsonify({"success": True}), 200
        return jsonify({"error": "Session not found"}), 404

    @app.route("/api/webrtc/ice", methods=["POST"])
    def webrtc_ice():
        data = request.get_json()
        device_id = data.get("device_id")
        candidate = data.get("candidate")
        side = data.get("side") # 'mobile' or 'dashboard'
        if not device_id or not candidate:
            return jsonify({"error": "Missing device_id or candidate"}), 400
        
        # Broadcast immediately to the other side
        broadcaster.broadcast("webrtc_ice", {
            "device_id": device_id,
            "candidate": candidate,
            "side": side
        })
        return jsonify({"success": True}), 200

    @app.route("/api/devices/<int:device_id>", methods=["DELETE"])
    @token_required
    def api_delete_device(device_id):
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                device = get_device(conn, device_id)
                if not device:
                    return jsonify({"error": "Device not found"}), 404
                
                delete_device(conn, device_id)
            
            broadcaster.broadcast("device_deleted", {"device_id": device_id})
            return jsonify({"success": True, "message": "Device deleted successfully"}), 200
        except Exception as e:
            print("DELETE DEVICE ERROR:", e)
            return jsonify({"error": str(e)}), 500

    @app.route("/api/devices/register", methods=["POST"])
    def api_register_device():
        payload = request.get_json(silent=True) or {}
        name = str(payload.get("name", "")).strip()
        if not name:
            return jsonify({"error": "Device name is required"}), 400
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                device = register_or_get_device(conn, name, request.org_id)
            broadcaster.broadcast("device_registered", {"device": device, "organization_id": request.org_id})
            return jsonify(device), 200
        except Exception:
            logging.exception("Failed to register device")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/register-mobile-device", methods=["POST"])
    @limiter.limit("30 per minute")
    def api_register_mobile_device():
        """
        Zero-friction auto-registration for mobile sensor pages.
        Creates (or retrieves) a device record and returns device_id + api_key.
        No authentication required — the returned api_key is the credential.
        """
        payload = request.get_json(silent=True) or {}
        device_name = str(payload.get("device_name", "")).strip()
        if not device_name:
            # Auto-generate a friendly name from user agent / timestamp
            import time
            device_name = f"Mobile-{int(time.time()) % 100000}"

        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                p = get_placeholder(conn)
                # Resolve the default org (first org in the DB)
                c = conn.cursor()
                c.execute("SELECT id FROM organizations ORDER BY id ASC LIMIT 1")
                org_row = c.fetchone()
                org_id = org_row[0] if org_row else None

                # Find existing device with same name in same org, or create new
                existing_query = f"SELECT id, name, device_token, device_api_key, organization_id FROM devices WHERE name = {p}"
                params = [device_name]
                if org_id:
                    existing_query += f" AND organization_id = {p}"
                    params.append(org_id)
                c.execute(existing_query, tuple(params))
                row = c.fetchone()

                if row:
                    d = dict(row)
                    # Ensure api_key exists (backfill if missing)
                    if not d.get("device_api_key"):
                        import secrets as _sec
                        new_key = _sec.token_hex(20)
                        conn.execute(
                            f"UPDATE devices SET device_api_key = {p} WHERE id = {p}",
                            (new_key, d["id"])
                        )
                        conn.commit()
                        d["device_api_key"] = new_key
                    device_id = d["id"]
                    api_key = d["device_api_key"]
                else:
                    import secrets as _sec
                    token = _sec.token_hex(16)
                    api_key = _sec.token_hex(20)
                    now = datetime.utcnow().isoformat() + "Z"
                    if org_id:
                        conn.execute(
                            f"INSERT INTO devices (name, device_token, device_api_key, organization_id, status, created_at) VALUES ({p},{p},{p},{p},'offline',{p})",
                            (device_name, token, api_key, org_id, now)
                        )
                    else:
                        conn.execute(
                            f"INSERT INTO devices (name, device_token, device_api_key, status, created_at) VALUES ({p},{p},{p},'offline',{p})",
                            (device_name, token, api_key, now)
                        )
                    conn.commit()
                    c.execute(f"SELECT id FROM devices WHERE device_api_key = {p}", (api_key,))
                    device_id = c.fetchone()[0]

            broadcaster.broadcast("device_registered", {
                "device_id": device_id,
                "device_name": device_name,
                "organization_id": org_id
            })

            return jsonify({
                "device_id": device_id,
                "api_key": api_key,
                "device_name": device_name,
                "status": "registered"
            }), 201

        except Exception:
            logging.exception("Failed to auto-register mobile device")
            return jsonify({"error": "Internal server error"}), 500

    # ── QR Pairing ──────────────────────────────────────────────────────────

    @app.route("/api/device/pair-token", methods=["POST"])
    @token_required
    def api_create_pair_token():
        """
        Dashboard calls this to generate a one-time QR pairing token.
        Requires a valid dashboard JWT (token_required).
        Returns a pair_token and the full pair_url.
        """
        import secrets as _sec
        token = _sec.token_urlsafe(24)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        org_id = request.org_id

        with _pair_tokens_lock:
            # Evict expired tokens lazily
            now_utc = datetime.now(timezone.utc)
            expired = [k for k, v in _pair_tokens.items() if v["expires_at"] < now_utc]
            for k in expired:
                del _pair_tokens[k]
            _pair_tokens[token] = {"org_id": org_id, "expires_at": expires_at}

        # Always use PUBLIC_BASE_URL (set at startup from ngrok / LAN IP).
        # This guarantees phones NEVER receive a localhost URL.
        global PUBLIC_BASE_URL
        base = PUBLIC_BASE_URL.rstrip("/") if PUBLIC_BASE_URL else (
            "http://" + get_lan_ip() + ":5000"
        )
        pair_url = base + "/mobile?pair=" + token
        print(f"📡 Generating QR Pairing URL: {pair_url}")


        return jsonify({
            "pair_token": token,
            "pair_url": pair_url,
            "expires_in": 300  # seconds
        }), 201

    @app.route("/api/device/pair", methods=["POST"])
    @limiter.limit("10 per minute")
    def api_pair_device():
        """
        Mobile page calls this after scanning a QR code.
        No auth required — validated by one-time pair_token.
        """
        import secrets as _sec
        payload = request.get_json(silent=True) or {}
        pair_token = str(payload.get("pair_token", "")).strip()
        if not pair_token:
            return jsonify({"error": "pair_token is required"}), 400

        with _pair_tokens_lock:
            entry = _pair_tokens.get(pair_token)
            if not entry:
                return jsonify({"error": "Invalid or expired pairing token"}), 401
            if entry["expires_at"] < datetime.now(timezone.utc):
                del _pair_tokens[pair_token]
                return jsonify({"error": "Pairing token has expired"}), 401
            # Consume token (one-time use)
            del _pair_tokens[pair_token]
            org_id = entry["org_id"]

        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                p = get_placeholder(conn)
                import uuid as _uuid
                device_name = "QR-Device-" + str(_uuid.uuid4())[:8].upper()
                device_token = _sec.token_hex(16)
                api_key = _sec.token_hex(20)
                now_str = datetime.utcnow().isoformat() + "Z"
                conn.execute(
                    f"INSERT INTO devices (name, device_token, device_api_key, organization_id, status, created_at) VALUES ({p},{p},{p},{p},'offline',{p})",
                    (device_name, device_token, api_key, org_id, now_str)
                )
                conn.commit()
                c = conn.cursor()
                c.execute(f"SELECT id FROM devices WHERE device_api_key = {p}", (api_key,))
                device_id = c.fetchone()[0]

            broadcaster.broadcast("device_registered", {
                "device_id": device_id,
                "device_name": device_name,
                "organization_id": org_id,
                "source": "qr_pair"
            })

            return jsonify({
                "device_id": device_id,
                "api_key": api_key,
                "device_name": device_name,
                "status": "paired"
            }), 201

        except Exception:
            logging.exception("Failed to pair device via QR")
            return jsonify({"error": "Internal server error"}), 500


    @app.route("/api/groups", methods=["GET"])
    @token_required
    def api_get_groups():
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                groups = models.get_groups(conn, request.org_id)
            return jsonify(groups), 200
        except Exception:
            logging.exception("Failed to fetch groups")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/groups", methods=["POST"])
    @token_required
    def api_create_group():
        data = request.get_json(force=True) or {}
        name = data.get("name")
        if not name:
            return jsonify({"error": "Group name is required"}), 400
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                group = models.create_group(conn, name, request.org_id)
            broadcaster.broadcast("group_created", {**group, "organization_id": request.org_id})
            return jsonify(group), 201
        except Exception:
            logging.exception("Failed to create group")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/devices/<int:device_id>/group", methods=["POST"])
    @token_required
    def api_assign_device_group(device_id):
        data = request.get_json(force=True) or {}
        group_id = data.get("group_id") # Can be None
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                device = models.get_device(conn, device_id, request.org_id)
                if not device:
                    return jsonify({"error": "Device not found"}), 404
                
                models.assign_device_to_group(conn, device_id, group_id)
                
                # Fetch updated device to get group name
                updated_device = models.get_device(conn, device_id, request.org_id)
                
            broadcaster.broadcast("device_group_update", {
                "device_id": device_id,
                "group_id": group_id,
                "organization_id": request.org_id,
                "group_name": updated_device.get("group_name") if updated_device else None
            })
            return jsonify({"success": True, "device": updated_device}), 200
        except Exception:
            logging.exception("Failed to assign device to group")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/groups/<int:group_id>/devices", methods=["GET"])
    @token_required
    def api_get_group_devices(group_id):
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                devices = models.get_devices_in_group(conn, group_id)
            return jsonify({"devices": devices}), 200
        except Exception:
            logging.exception("Failed to fetch group devices")
            return jsonify({"error": "Internal server error"}), 500

    # ── Send Data ───────────────────────────────────────────────────────────
    @app.route("/api/send-data", methods=["POST"])
    @limiter.limit("60 per minute")
    def api_send_data():
        auth = request.headers.get("Authorization", "")
        # Allow both DeviceKey (API Key) and Bearer (Device Token)
        if not auth.startswith("Bearer ") and not auth.startswith("DeviceKey "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        
        token = ""
        auth_type = ""
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1].strip()
            auth_type = "Bearer"
        else:
            token = auth.split(" ", 1)[1].strip()
            auth_type = "DeviceKey"
            
        if not token:
            return jsonify({"error": "Empty token"}), 401

        payload = request.get_json(force=True) or {}
        if not isinstance(payload, dict):
            return jsonify({"error": "Invalid JSON body"}), 400

        missing = [f for f in ["device_id", "x", "y", "z", "battery"] if f not in payload]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        try:
            device_id = int(payload["device_id"])
            x = float(payload["x"])
            y = float(payload.get("y", 0))
            z = float(payload.get("z", 0))
            battery = float(payload.get("battery", 0))
            latitude = float(payload["latitude"]) if payload.get("latitude") is not None else None
            longitude = float(payload["longitude"]) if payload.get("longitude") is not None else None
            
            # New sensor fields
            gyro_x = float(payload.get("gyro_x")) if payload.get("gyro_x") is not None else None
            gyro_y = float(payload.get("gyro_y")) if payload.get("gyro_y") is not None else None
            gyro_z = float(payload.get("gyro_z")) if payload.get("gyro_z") is not None else None
            pitch = float(payload.get("pitch")) if payload.get("pitch") is not None else None
            roll = float(payload.get("roll")) if payload.get("roll") is not None else None
            yaw = float(payload.get("yaw")) if payload.get("yaw") is not None else None
            speed = float(payload.get("speed")) if payload.get("speed") is not None else None
            ambient_light = float(payload.get("ambient_light")) if payload.get("ambient_light") is not None else None
            noise_level = float(payload.get("noise_level")) if payload.get("noise_level") is not None else None
            pressure = float(payload.get("pressure")) if payload.get("pressure") is not None else None
            
            # Diagnostics
            battery_health = payload.get("battery_health")
            storage_usage = float(payload.get("storage_usage")) if payload.get("storage_usage") is not None else None
            network_strength = payload.get("network_strength")
            os_info = payload.get("os_info")
            
            # Visual Data
            camera_frame = payload.get("camera_frame")
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid numeric values in payload"}), 400

        ts_str = payload.get("timestamp")
        if isinstance(ts_str, str):
            if ts_str.endswith("Z"):
                ts_str = ts_str.replace("Z", "+00:00")
            try:
                timestamp = datetime.fromisoformat(ts_str)
            except ValueError:
                return jsonify({"error": "Invalid timestamp format"}), 400
        else:
            timestamp = datetime.now(timezone.utc)

        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                # Command timeout logic
                fail_old_commands(conn)

                # Robust Lookup: Prioritize the Token/Key which is UNIQUE.
                # This ensures the simulator works even if the Database ID has shifted (e.g. after a reset).
                c = conn.cursor()
                p = get_placeholder(conn)
                if auth_type == "DeviceKey":
                    c.execute(f"SELECT id, name, organization_id FROM devices WHERE device_api_key = {p}", (token,))
                else:
                    c.execute(f"SELECT id, name, organization_id FROM devices WHERE device_token = {p}", (token,))
                
                device_row = c.fetchone()
                if device_row:
                    device = models._row(device_row)
                    # Sync device_id to the actual ID in the database
                    device_id = device["id"]
                else:
                    device = None
                
                if device is None:
                    return jsonify({"error": "Invalid device or token"}), 401
                
                # Check status
                full_device = get_device(conn, device_id)
                if full_device and full_device.get("status") == "disabled":
                    return jsonify({"error": "Device is disabled"}), 403

                # STEP 4: STABILIZE MOTION MAGNITUDE Rounding
                raw_mag = float(math.sqrt(x**2 + y**2 + z**2))
                # Using floor(x * 100 + 0.5) / 100.0 instead of round() for Pyre stability if needed, 
                # but standard round() is better. Let's cast ndigits to int and number to float.
                magnitude = float(f"{float(raw_mag):.2f}")
                
                # AI Anomaly Detection
                score, is_anomaly = detector.predict(magnitude)
                detector.add_to_buffer(magnitude)
                
                sensor_id = create_sensor_data(
                    conn, device_id=device_id, x=x, y=y, z=z,
                    gyro_x=gyro_x, gyro_y=gyro_y, gyro_z=gyro_z,
                    pitch=pitch, roll=roll, yaw=yaw,
                    battery=battery, timestamp=timestamp,
                    latitude=latitude, longitude=longitude,
                    speed=speed, ambient_light=ambient_light,
                    noise_level=noise_level, pressure=pressure,
                    anomaly_score=score, is_anomaly=is_anomaly
                )
                
                # Update Device State - Use SERVER TIME for last_seen to avoid clock skew issues
                diag_fields = {
                    "status": "online",
                    "battery": battery,
                    "last_lat": latitude,
                    "last_lng": longitude,
                    "last_seen": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                logging.debug(f"Telemetry from device {device_id} updated state. Status: ONLINE")
                if battery_health: diag_fields["battery_health"] = battery_health
                if storage_usage is not None: diag_fields["storage_usage"] = storage_usage
                if network_strength: diag_fields["network_strength"] = network_strength
                if os_info: diag_fields["os_info"] = os_info
                
                if full_device and full_device.get("status") != "online":
                    broadcaster.broadcast("device_status_changed", {
                        "device_id": device_id,
                        "status": "online",
                        "last_seen": diag_fields["last_seen"]
                    })
                update_device(conn, device_id, diag_fields)

                # Broadcast status update if it was not online before (optional, but good for UI)
                # For simplicity, we just broadcast the latest state via sensor_data SSE update in the next step

                # Handle Camera Snapshot
                if camera_frame:
                    create_device_snapshot(conn, device_id, camera_frame, timestamp)

                # Rule-based alerts
                rules = get_alert_rules(conn, device_id)
                for rule in rules:
                    if not rule["is_enabled"]: continue
                    s_type = rule["sensor_type"]
                    op = rule["operator"]
                    thresh = rule["threshold"]
                    
                    val = None
                    if s_type == "motion": val = magnitude
                    elif s_type == "noise": val = noise_level
                    elif s_type == "battery": val = battery
                    elif s_type == "light": val = ambient_light
                    
                    if val is not None:
                        triggered_now = False
                        if op == ">" and val > thresh: triggered_now = True
                        elif op == "<" and val < thresh: triggered_now = True
                        elif op == "==" and val == thresh: triggered_now = True
                        
                        req = rule.get("required_samples", 1)
                        cur = rule.get("current_samples", 0)
                        
                        if triggered_now:
                            new_count = cur + 1
                            if new_count >= req:
                                aid = create_alert(
                                    conn, device_id, f"rule_{s_type}",
                                    f"Rule triggered: {s_type} {op} {thresh} for {req} samples (Current: {val})",
                                    timestamp, severity="WARNING"
                                )
                                # Trigger Notification
                                models.create_notification(conn, full_device["organization_id"], "alert_rule", f"Rule triggered: {s_type}", device_id=device_id, alert_id=aid)
                                # Reset count after alert to avoid spamming
                                update_alert_rule_count(conn, rule["id"], 0)
                            else:
                                update_alert_rule_count(conn, rule["id"], new_count)
                        else:
                            # Reset count if condition breaks
                            if cur > 0:
                                update_alert_rule_count(conn, rule["id"], 0)

                threshold = app.config["ALERT_ACCEL_THRESHOLD"]
                alerts_created = []

                if battery <= 20:
                    # Check if we already alerted for low battery recently (within 1 hour)
                    c = conn.cursor()
                    placeholder = get_placeholder(conn)
                    if is_postgres(conn):
                        check_query = "SELECT COUNT(*) FROM alerts WHERE device_id = %s AND type = 'battery' AND created_at::timestamp > NOW() - INTERVAL '1 hour'"
                    else:
                        check_query = "SELECT COUNT(*) FROM alerts WHERE device_id = ? AND type = 'battery' AND created_at > datetime('now', '-1 hour')"
                    
                    c.execute(check_query, (device_id,))
                    if c.fetchone()[0] == 0:
                        aid = create_alert(
                            conn, device_id, "battery",
                            f"Low battery ({battery:.1f}%) on {device['name']}", timestamp,
                            severity="WARNING",
                            status="active"
                        )
                        alerts_created.append({
                            "id": aid,
                            "type": "battery",
                            "severity": "WARNING",
                            "status": "active",
                            "message": f"Low battery ({battery:.1f}%)",
                            "created_at": timestamp.isoformat()
                        })
                        # Trigger Notification
                        models.create_notification(conn, full_device["organization_id"], "low_battery", f"Low battery: {battery:.1f}%", device_id=device_id, alert_id=aid)

                if magnitude > threshold:
                    # ... [existing alert logic] ...
                    pass

                # AI Anomaly Processing
                if is_anomaly:
                    if magnitude < 20:
                        severity = "NORMAL"
                    elif magnitude < 40:
                        severity = "WARNING"
                    elif magnitude <= 80:
                        severity = "CRITICAL"
                    else:
                        severity = "EMERGENCY"
                        
                    aid = create_alert(
                        conn, device_id, "ai_motion_anomaly", 
                        f"Abnormal motion pattern detected on {device['name']}", 
                        timestamp,
                        severity=severity,
                        magnitude=magnitude,
                        status="active"
                    )
                    alerts_created.append({
                        "id": aid,
                        "type": "ai_motion_anomaly",
                        "message": "Abnormal motion detected",
                        "severity": severity,
                        "magnitude": magnitude,
                        "status": "active",
                        "created_at": timestamp.isoformat()
                    })
                    # Trigger Notification
                    models.create_notification(conn, full_device["organization_id"], "ai_anomaly", "Abnormal motion detected", device_id=device_id, alert_id=aid)
                    
                    broadcaster.broadcast("ai_anomaly_detected", {
                        "device_id": device_id,
                        "organization_id": device["organization_id"],
                        "device_name": device["name"],
                        "magnitude": magnitude,
                        "score": score
                    })

            # SSE notification
            broadcaster.broadcast("sensor_data_received", {
                "device_id": device_id, 
                "organization_id": device["organization_id"],
                "device_name": device["name"],
                "x": x, "y": y, "z": z,
                "gyro_x": gyro_x, "gyro_y": gyro_y, "gyro_z": gyro_z,
                "pitch": pitch, "roll": roll, "yaw": yaw,
                "speed": speed, "ambient_light": ambient_light,
                "noise_level": noise_level, "pressure": pressure,
                "battery": battery, 
                "battery_health": battery_health, "storage_usage": storage_usage,
                "network_strength": network_strength, "os_info": os_info,
                "latitude": latitude, "longitude": longitude,
                "motion_magnitude": magnitude, 
                "anomaly_score": score,
                "is_anomaly": is_anomaly,
                "timestamp": timestamp.isoformat(),
                "sensor_data_id": sensor_id,
                "alerts": alerts_created
            })

            # Force dashboard refresh via device_update event
            broadcaster.broadcast("device_update", {
                "id": device_id,
                "organization_id": device["organization_id"],
                "status": "online",
                "last_seen": diag_fields["last_seen"]
            })

            return jsonify({
                "status": "ok", 
                "sensor_data_id": sensor_id, 
                "is_anomaly": is_anomaly, 
                "alerts_created": len(alerts_created)
            }), 201
        except Exception:
            logging.exception("Failed to handle /api/send-data")
            return jsonify({"error": "Internal server error"}), 500

    # ── Sensor Data ─────────────────────────────────────────────────────────
    @app.route("/api/sensor-data", methods=["GET"])
    @token_required
    def api_sensor_data():
        try:
            limit = int(request.args.get("limit", "100"))
            if limit <= 0:
                raise ValueError()
        except ValueError:
            return jsonify({"error": "Invalid 'limit' parameter"}), 400

        device_id = None
        if request.args.get("device_id"):
            try:
                device_id = int(request.args["device_id"])
            except ValueError:
                return jsonify({"error": "Invalid 'device_id' parameter"}), 400

        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                data = get_sensor_data(conn, request.org_id, limit=limit, device_id=device_id)
            return jsonify({"sensor_data": data}), 200
        except Exception:
            logging.exception("Failed to fetch sensor data")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/alerts", methods=["GET"])
    @token_required
    def api_alerts():
        try:
            limit = int(request.args.get("limit", "100"))
            device_id = request.args.get("device_id")
            if device_id:
                device_id = int(device_id)
            
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                alerts = get_alerts(conn, request.org_id, limit=limit, device_id=device_id)
            return jsonify({"alerts": alerts}), 200
        except Exception:
            logging.exception("Failed to fetch alerts")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/alerts", methods=["DELETE"])
    @token_required
    def api_delete_alerts():
        try:
            device_id = request.args.get("device_id")
            if device_id:
                device_id = int(device_id)
            
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                count = models.delete_alerts(conn, request.org_id, device_id=device_id)
            return jsonify({"success": True, "deleted_count": count}), 200
        except Exception:
            logging.exception("Failed to delete alerts")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/stats", methods=["GET"])
    @limiter.exempt
    @token_required
    def api_stats():
        cache_key = f"org:{request.org_id}:dashboard_metrics"
        try:
            from services.task_worker import USE_REDIS, redis_conn
            import json
            
            if USE_REDIS and redis_conn:
                cached = redis_conn.get(cache_key)
                if cached:
                    return jsonify(json.loads(cached)), 200
        except Exception as e:
            logging.warning(f"Cache read error: {e}")
            USE_REDIS = False
            
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                devices = get_devices(conn, request.org_id)
                total_devices = len(devices)
                online_devices = sum(1 for d in devices if d.get("last_seen") and (datetime.utcnow() - datetime.fromisoformat(d["last_seen"].replace("Z", "+00:00")).replace(tzinfo=None)).total_seconds() < 30)
                data_points_today = count_today_data_points(conn, request.org_id)
                alerts = get_alerts(conn, request.org_id, limit=100)
                active_alerts = len(alerts) # Simplified
                
            result = {
                "total_devices": total_devices,
                "online_devices": online_devices,
                "data_points_today": data_points_today,
                "active_alerts": active_alerts
            }
            
            try:
                if USE_REDIS and redis_conn:
                    redis_conn.setex(cache_key, 60, json.dumps(result))
            except Exception as e:
                logging.warning(f"Cache write error: {e}")
                
            return jsonify(result), 200
        except Exception:
            logging.exception("Failed to fetch stats")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/devices/<int:device_id>/snapshot", methods=["GET"])
    @token_required
    def api_get_latest_snapshot(device_id):
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                # Ownership check
                dev = get_device(conn, device_id, request.org_id)
                if not dev:
                    return jsonify({"error": "Unauthorized or not found"}), 403
                
                snapshot = get_latest_snapshot(conn, device_id)
            if not snapshot:
                return jsonify({"error": "No snapshot found"}), 404
            return jsonify(snapshot), 200
        except Exception:
            logging.exception("Failed to fetch snapshot")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/devices/<int:device_id>/snapshots", methods=["GET"])
    @token_required
    def api_get_snapshots(device_id):
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                # Ownership check
                dev = get_device(conn, device_id, request.org_id)
                if not dev:
                    return jsonify({"error": "Unauthorized or not found"}), 403

                c = conn.cursor()
                p = get_placeholder(conn)
                c.execute(
                    f"SELECT id, image_base64, timestamp FROM device_snapshots WHERE device_id = {p} ORDER BY timestamp DESC LIMIT 12",
                    (device_id,)
                )
                rows = c.fetchall()
                snapshots = [{"id": r[0], "image_base64": r[1], "timestamp": r[2]} for r in rows]
            return jsonify(snapshots), 200
        except Exception:
            logging.exception("Failed to fetch snapshots")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/devices/<int:device_id>/rules", methods=["GET"])
    @token_required
    def api_get_device_rules(device_id):
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                # Ownership check
                dev = get_device(conn, device_id, request.org_id)
                if not dev:
                    return jsonify({"error": "Unauthorized or not found"}), 403
                
                rules = get_alert_rules(conn, device_id)
            return jsonify({"rules": rules}), 200
        except Exception:
            logging.exception("Failed to fetch rules")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/devices/<int:device_id>/rules", methods=["POST"])
    @token_required
    def api_create_device_rule(device_id):
        payload = request.get_json(force=True) or {}
        s_type = payload.get("sensor_type")
        op = payload.get("operator")
        thresh = payload.get("threshold")
        
        if not all([s_type, op, thresh is not None]):
            return jsonify({"error": "Missing fields"}), 400
        
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                rule_id = create_alert_rule(conn, device_id, s_type, op, float(thresh))
            return jsonify({"status": "created", "rule_id": rule_id}), 201
        except Exception:
            logging.exception("Failed to create rule")
            return jsonify({"error": "Internal server error"}), 500

    # ── Commands ─────────────────────────────────────────────────────────────
    @app.route("/api/devices/<int:device_id>/command", methods=["POST"])
    @token_required
    def api_send_command(device_id):
        payload = request.get_json(force=True) or {}
        command = payload.get("command")
        if not command:
            return jsonify({"error": "Command is required"}), 400
        
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                cmd_id = create_command(conn, device_id, command, payload.get("payload", {}))
            
            broadcaster.broadcast("command_sent", {
                "id": cmd_id, "device_id": device_id, "command": command
            })
            return jsonify({"status": "queued", "command_id": cmd_id}), 202
        except Exception:
            logging.exception("Failed to queue command")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/devices/<int:device_id>/commands", methods=["GET"])
    def api_get_commands(device_id):
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                fail_old_commands(conn)
                commands = get_pending_commands(conn, device_id)
            return jsonify({"commands": commands}), 200
        except Exception:
            logging.exception("Failed to fetch commands")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/commands/<int:command_id>", methods=["PATCH"])
    def api_update_command(command_id):
        payload = request.get_json(force=True) or {}
        status = payload.get("status")
        if status not in ["executed", "failed"]:
            return jsonify({"error": "Invalid status"}), 400
        
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                update_command_status(conn, command_id, status)
            
            broadcaster.broadcast("command_executed", {
                "id": command_id, "status": status
            })
            return jsonify({"status": "updated"}), 200
        except Exception:
            logging.exception("Failed to update command")
            return jsonify({"error": "Internal server error"}), 500

    # ── Device Management ────────────────────────────────────────────────────
    @app.route("/api/devices/<int:device_id>", methods=["GET"])
    @token_required
    def api_get_device(device_id):
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                device = get_device(conn, device_id, request.org_id)
            if not device:
                return jsonify({"error": "Device not found"}), 404
            return jsonify(device), 200
        except Exception:
            logging.exception("Failed to fetch device")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/devices/<int:device_id>", methods=["PATCH"])
    @token_required
    def api_update_device(device_id):
        payload = request.get_json(force=True) or {}
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                update_device(conn, device_id, payload, request.org_id)
            return jsonify({"status": "updated"}), 200
        except Exception:
            logging.exception("Failed to update device")
            return jsonify({"error": "Internal server error"}), 500

    # ── History Analytics ────────────────────────────────────────────────────
    def create_notification(device_id, n_type, message, alert_id=None):
        """Helper to create notifications across all channels."""
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                c = conn.cursor()
                p = get_placeholder(conn)
                # Fetch device info and org settings
                c.execute(f"""
                    SELECT d.name, d.organization_id, o.email, o.webhook_url 
                    FROM devices d 
                    JOIN organizations o ON d.organization_id = o.id 
                    WHERE d.id = {p}
                """, (device_id,))
                row = c.fetchone()
                if not row: return
                
                device_name, org_id, org_email, org_webhook = row
            
            # Use the new service
            trigger_alert_notifications(
                organization_id=org_id,
                device_id=device_id,
                device_name=device_name,
                alert_id=alert_id,
                message=message,
                severity=n_type,
                org_email=org_email,
                org_webhook=org_webhook
            )
        except Exception:
            logging.exception("Error in create_notification helper")

    @app.route("/api/notifications", methods=["GET"])
    @token_required
    def api_notifications():
        """Fetch notifications for the current organization with pagination."""
        try:
            # Pagination params
            limit = request.args.get("limit", 50, type=int)
            offset = request.args.get("offset", 0, type=int)
            
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                is_pg = is_postgres(conn)
                c = conn.cursor()
                p = get_placeholder(conn)
                
                query = f"""
                    SELECT n.id, n.device_id, d.name as device_name, n.type, n.message, n.status, n.created_at
                    FROM notifications n
                    LEFT JOIN devices d ON n.device_id = d.id
                    WHERE n.organization_id = {p}
                    ORDER BY n.created_at DESC
                    LIMIT {p} OFFSET {p}
                """
                c.execute(query, (request.org_id, limit, offset))
                rows = c.fetchall()
                
                if is_pg:
                    desc = c.description
                    notifications = [dict(zip([col[0] for col in desc], row)) for row in rows]
                else:
                    notifications = []
                    for r in rows:
                        notifications.append({
                            "id": r[0],
                            "device_id": r[1],
                            "device_name": r[2],
                            "type": r[3],
                            "message": r[4],
                            "status": r[5],
                            "created_at": r[6]
                        })

            return jsonify(notifications), 200
        except Exception:
            logging.exception("Failed to fetch notifications")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/export/sensor-data", methods=["GET"])
    @token_required
    def api_export_sensor_data():
        try:
            device_id = request.args.get("device_id")
            time_range = request.args.get("range", "24h")
            
            if not device_id:
                return jsonify({"error": "device_id is required"}), 400
                
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                is_pg = is_postgres(conn)
                c = conn.cursor()
                
                # Time range logic (matching aggregation logic)
                now = datetime.utcnow()
                if time_range == "1h":
                    start_time = now - timedelta(hours=1)
                elif time_range == "24h":
                    start_time = now - timedelta(days=1)
                elif time_range == "7d":
                    start_time = now - timedelta(days=7)
                elif time_range == "30d":
                    start_time = now - timedelta(days=30)
                else:
                    start_time = now - timedelta(days=1)
                start_iso = start_time.isoformat()

                query = """
                    SELECT timestamp, device_id, motion_magnitude, battery, latitude, longitude, is_anomaly
                    FROM sensor_data
                    WHERE device_id = ? AND timestamp >= ?
                    ORDER BY timestamp ASC
                """
                
                if is_pg:
                    query = query.replace("?", "%s")
                
                c.execute(query, (device_id, start_iso))
                rows = c.fetchall()
                
                if is_pg:
                    desc = c.description
                    data_rows = [dict(zip([col[0] for col in desc], row)) for row in rows]
                else:
                    data_rows = [_row(r) for r in rows]

            # Generate CSV
            import io
            import csv
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=["timestamp", "device_id", "motion_magnitude", "battery", "latitude", "longitude", "is_anomaly"])
            writer.writeheader()
            for row in data_rows:
                writer.writerow(row)
            
            csv_data = output.getvalue()
            output.close()

            # Return as file response
            from flask import make_response
            response = make_response(csv_data)
            response.headers["Content-Disposition"] = f"attachment; filename=sensor-data-{device_id}-{time_range}.csv"
            response.headers["Content-type"] = "text/csv"
            return response

        except Exception:
            logging.exception("Failed to export sensor data")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/ai/insights", methods=["GET"])
    @token_required
    def api_ai_insights():
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                is_pg = is_postgres(conn)
                c = conn.cursor()
                
                p = get_placeholder(conn)
                
                # Verify rows exist for this org to avoid crash
                c.execute(f"SELECT COUNT(s.id) FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE d.organization_id = {p}", (request.org_id,))
                total_rows = c.fetchone()[0]
                
                if total_rows == 0:
                    return jsonify({
                        "anomalies_today": 0,
                        "most_active_device": "N/A",
                        "highest_motion_spike": 0.0,
                        "average_magnitude": 0.0
                    }), 200
                
                # 1. Anomalies today
                if is_pg:
                    c.execute(f"SELECT COUNT(s.id) FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE s.is_anomaly = TRUE AND s.timestamp::date = CURRENT_DATE AND d.organization_id = {p}", (request.org_id,))
                else:
                    c.execute(f"SELECT COUNT(s.id) FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE s.is_anomaly = 1 AND date(s.timestamp) = date('now') AND d.organization_id = {p}", (request.org_id,))
                anomalies_today = c.fetchone()[0] or 0

                # 2. Most active device
                c.execute(f"""
                    SELECT d.name, COUNT(s.id) as count 
                    FROM devices d 
                    JOIN sensor_data s ON d.id = s.device_id 
                    WHERE d.organization_id = {p}
                    GROUP BY d.id 
                    ORDER BY count DESC LIMIT 1
                """, (request.org_id,))
                row = c.fetchone()
                most_active_device = row[0] if row else "N/A"

                # 3. Highest motion spike
                c.execute(f"SELECT MAX(s.motion_magnitude) FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE d.organization_id = {p}", (request.org_id,))
                highest_spike = c.fetchone()[0]
                highest_spike = float(highest_spike) if highest_spike is not None else 0.0

                # 4. Average magnitude (recent 1000 points)
                c.execute(f"SELECT AVG(motion_magnitude) FROM (SELECT s.motion_magnitude FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE d.organization_id = {p} ORDER BY s.timestamp DESC LIMIT 1000) as recent", (request.org_id,))
                avg_magnitude = c.fetchone()[0]
                avg_magnitude = float(avg_magnitude) if avg_magnitude is not None else 0.0
                
                print(f"DEBUG AI Insights: Anomalies={anomalies_today}, ActiveDevice={most_active_device}, Spike={highest_spike}, Avg={avg_magnitude}")

            return jsonify({
                "anomalies_today": anomalies_today,
                "most_active_device": most_active_device,
                "highest_motion_spike": round(highest_spike, 2),
                "average_magnitude": round(avg_magnitude, 2)
            }), 200
        except Exception as e:
            logging.exception("Failed to fetch AI insights")
            print(f"DEBUG AI Insights Error: {e}")
            return jsonify({
                "error": "AI insights unavailable",
                "anomalies_today": 0,
                "most_active_device": "N/A",
                "highest_motion_spike": 0.0,
                "average_magnitude": 0.0
            }), 200




    @app.route("/api/sensor-data/history", methods=["GET"])
    @token_required
    def api_sensor_history():
        device_id = request.args.get("device_id")
        timerange = request.args.get("range", "24h")
        
        sql_map = {
            "1h": "-1 hour",
            "24h": "-24 hours",
            "7d": "-7 days",
            "30d": "-30 days"
        }
        interval = sql_map.get(timerange, "-24 hours")

        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                is_pg = is_postgres(conn)
                c = conn.cursor()
                
                params = [request.org_id, interval]
                
                if timerange == "1h":
                    # Raw data for 1h
                    if is_pg:
                        query = "SELECT s.* FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE d.organization_id = ? AND (s.timestamp::timestamp AT TIME ZONE 'UTC') > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + ?::interval)"
                    else:
                        query = "SELECT s.* FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE d.organization_id = ? AND s.timestamp > datetime('now', ?)"
                else:
                    # Aggregated data
                    if is_pg:
                        if timerange == "24h": bucket = "YYYY-MM-DD HH24:MI"
                        elif timerange == "7d": bucket = "YYYY-MM-DD HH24:00"
                        else: bucket = "YYYY-MM-DD"
                        
                        query = f"""
                            SELECT 
                                to_char(s.timestamp::timestamp, '{bucket}') as time_bucket,
                                AVG(s.motion_magnitude) as avg_magnitude,
                                AVG(s.battery) as avg_battery,
                                COUNT(*) as frequency
                            FROM sensor_data s
                            JOIN devices d ON s.device_id = d.id
                            WHERE d.organization_id = ? AND (s.timestamp::timestamp AT TIME ZONE 'UTC') > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + ?::interval)
                        """
                    else:
                        if timerange == "24h": bucket = "%Y-%m-%d %H:%M"
                        elif timerange == "7d": bucket = "%Y-%m-%d %H:00"
                        else: bucket = "%Y-%m-%d"
                        
                        query = f"""
                            SELECT 
                                strftime('{bucket}', s.timestamp) as time_bucket,
                                AVG(s.motion_magnitude) as avg_magnitude,
                                AVG(s.battery) as avg_battery,
                                COUNT(*) as frequency
                            FROM sensor_data s
                            JOIN devices d ON s.device_id = d.id
                            WHERE d.organization_id = ? AND s.timestamp > datetime('now', ?)
                        """

                if device_id:
                    if is_pg:
                        query += " AND device_id = %s"
                    else:
                        query += " AND device_id = ?"
                    params.append(device_id)

                if timerange == "1h":
                    query += " ORDER BY timestamp ASC"
                else:
                    query += " GROUP BY time_bucket ORDER BY time_bucket ASC"

                c.execute(query, tuple(params))
                
                if is_pg:
                    desc = c.description
                    data = [dict(zip([col[0] for col in desc], row)) for row in c.fetchall()]
                else:
                    data = [_row(r) for r in c.fetchall()]

            return jsonify({"sensor_data": data}), 200
        except Exception:
            logging.exception("Failed to fetch sensor history")
            return jsonify({"error": "Internal server error"}), 500

    # ── SSE Stream ───────────────────────────────────────────────────────────
    @app.route("/api/stream", methods=["GET"])
    def api_stream():
        q = broadcaster.subscribe()

        def generate():
            yield from broadcaster.stream_generator(q)

        resp = Response(generate(), mimetype="text/event-stream")
        resp.headers["Cache-Control"] = "no-cache"
        resp.headers["X-Accel-Buffering"] = "no"
        resp.headers["Connection"] = "keep-alive"
        return resp

    @app.route("/api/analytics/<metric>", methods=["GET"])
    @token_required
    def api_analytics_metric(metric):
        device_id = request.args.get("device_id")
        timerange = request.args.get("range", "24h")
        
        # map ranges to lookback intervals
        sql_map = {
            "5m": "-5 minutes",
            "30m": "-30 minutes",
            "1h": "-1 hour",
            "24h": "-24 hours"
        }
        interval = sql_map.get(timerange, "-24 hours")

        # Determine bucket size for aggregation
        # 5m data -> 10s buckets
        # 30m data -> 1m buckets
        # 1h data -> 2m buckets
        # 24h data -> 30m buckets
        bucket_map = {
            "5m": 10,
            "30m": 60,
            "1h": 120,
            "24h": 1800
        }
        bucket_size = bucket_map.get(timerange, 1800)

        metric_cols = {
            "motion": "motion_magnitude",
            "battery": "battery",
            "noise": "noise_level",
            "light": "ambient_light",
            "anomalies": "is_anomaly"
        }
        
        col = metric_cols.get(metric)
        if not col:
            return jsonify({"error": "Invalid metric"}), 400

        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                c = conn.cursor()
                placeholder = get_placeholder(conn)
                
                # Check if it's postgres or sqlite for date handling
                is_pg = is_postgres(conn)
                
                if metric == "anomalies":
                    # For anomalies we want frequency (count of anomalies per bucket)
                    if is_pg:
                        query = f"""
                            SELECT 
                                (EXTRACT(EPOCH FROM timestamp)::INT / {bucket_size}) * {bucket_size} as bucket,
                                SUM(CASE WHEN is_anomaly = TRUE THEN 1 ELSE 0 END) as value
                            FROM sensor_data
                            WHERE (timestamp::timestamp AT TIME ZONE 'UTC') > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + {placeholder}::interval)
                            {"AND device_id = " + placeholder if device_id else ""}
                            GROUP BY bucket
                            ORDER BY bucket ASC
                        """
                    else:
                        query = f"""
                            SELECT 
                                (strftime('%s', timestamp) / {bucket_size}) * {bucket_size} as bucket,
                                SUM(CASE WHEN is_anomaly = 1 THEN 1 ELSE 0 END) as value
                            FROM sensor_data
                            WHERE timestamp > datetime('now', {placeholder})
                            {"AND device_id = " + placeholder if device_id else ""}
                            GROUP BY bucket
                            ORDER BY bucket ASC
                        """
                else:
                    # For others we want average
                    if is_pg:
                        query = f"""
                            SELECT 
                                (EXTRACT(EPOCH FROM timestamp)::INT / {bucket_size}) * {bucket_size} as bucket,
                                AVG({col}) as value
                            FROM sensor_data
                            WHERE (timestamp::timestamp AT TIME ZONE 'UTC') > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + {placeholder}::interval)
                            {"AND device_id = " + placeholder if device_id else ""}
                            GROUP BY bucket
                            ORDER BY bucket ASC
                        """
                    else:
                        query = f"""
                            SELECT 
                                (strftime('%s', timestamp) / {bucket_size}) * {bucket_size} as bucket,
                                AVG({col}) as value
                            FROM sensor_data
                            WHERE timestamp > datetime('now', {placeholder})
                            {"AND device_id = " + placeholder if device_id else ""}
                            GROUP BY bucket
                            ORDER BY bucket ASC
                        """
                
                # Build params
                params = [interval]
                if device_id:
                    params.append(device_id)
                
                c.execute(query, tuple(params))
                rows = c.fetchall()
                
                results = []
                for r in rows:
                    results.append({
                        "timestamp": datetime.fromtimestamp(r[0]).isoformat(),
                        "value": round(float(r[1]), 2) if r[1] is not None else 0
                    })
                
            return jsonify(results), 200
        except Exception:
            logging.exception(f"Failed to fetch analytics for {metric}")
            return jsonify({"error": "Internal server error"}), 500

    # ── SaaS Management ──────────────────────────────────────────────────────
    @app.route("/api/organizations", methods=["GET"])
    @token_required
    def api_get_organizations():
        # Only super admins or users belonging to multiple orgs (future) would use this.
        # For now, just return the organizations.
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                orgs = models.get_organizations(conn)
            return jsonify(orgs), 200
        except Exception:
            logging.exception("Failed to fetch organizations")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/organizations", methods=["POST"])
    @token_required
    def api_create_organization():
        if request.role != "admin":
            return jsonify({"error": "Unauthorized"}), 403
        data = request.get_json(force=True) or {}
        name = data.get("name")
        if not name:
            return jsonify({"error": "Name is required"}), 400
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                org = models.create_organization(conn, name, data.get("plan", "Free"))
            return jsonify(org), 201
        except Exception:
            logging.exception("Failed to create organization")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/organization/settings", methods=["GET"])
    @token_required
    def api_get_org_settings():
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                org = models.get_organization(conn, request.org_id)
                users = models.get_organization_users(conn, request.org_id)
                devices = models.get_devices(conn, request.org_id)
            if not org:
                return jsonify({"error": "Organization not found"}), 404
            return jsonify({
                **org,
                "user_count": len(users),
                "device_count": len(devices)
            }), 200
        except Exception:
            logging.exception("Failed to fetch org settings")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/users", methods=["GET"])
    @token_required
    def api_get_users():
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                users = models.get_organization_users(conn, request.org_id)
            return jsonify(users), 200
        except Exception:
            logging.exception("Failed to fetch users")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/users/invite", methods=["POST"])
    @token_required
    def api_invite_user():
        if request.role != "admin":
            return jsonify({"error": "Only admins can invite users"}), 403
        data = request.get_json(force=True) or {}
        email = data.get("email")
        role = data.get("role", "viewer")
        password = data.get("password", "Welcome123!") # Default password for invited users
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
            
        try:
            pwd_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                user_id = models.create_user(conn, email, pwd_hash, role=role, org_id=request.org_id)
            return jsonify({"status": "invited", "user_id": user_id}), 201
        except Exception:
            logging.exception("Failed to invite user")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/teams", methods=["GET"])
    @token_required
    def api_get_teams():
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                teams = models.get_teams(conn, request.org_id)
                # For each team, get member count (simplified)
                for team in teams:
                    members = models.get_team_members(conn, team["id"])
                    team["member_count"] = len(members)
            return jsonify(teams), 200
        except Exception:
            logging.exception("Failed to fetch teams")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/teams", methods=["POST"])
    @token_required
    def api_create_team():
        if request.role != "admin":
            return jsonify({"error": "Unauthorized"}), 403
        data = request.get_json(force=True) or {}
        name = data.get("name")
        if not name:
            return jsonify({"error": "Team name is required"}), 400
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                team = models.create_team(conn, name, request.org_id)
            return jsonify(team), 201
        except Exception:
            logging.exception("Failed to create team")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/teams/<int:team_id>/members", methods=["POST"])
    @token_required
    def api_add_team_member(team_id):
        if request.role != "admin":
            return jsonify({"error": "Unauthorized"}), 403
        data = request.get_json(force=True) or {}
        user_id = data.get("user_id")
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                # Verify team belongs to org
                c = conn.cursor()
                p = get_placeholder(conn)
                c.execute(f"SELECT id FROM teams WHERE id = {p} AND organization_id = {p}", (team_id, request.org_id))
                if not c.fetchone():
                    return jsonify({"error": "Team not found"}), 404
                
                models.add_team_member(conn, team_id, user_id)
            return jsonify({"status": "added"}), 200
        except Exception:
            logging.exception("Failed to add team member")
            return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()

# AI Model Startup & Retraining
def setup_ai():
    if not db.DB_INITIALIZED:
        logging.warning("AI setup skipped: Database not initialized.")
        return
        
    with app.app_context():
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                c = conn.cursor()
                c.execute("SELECT motion_magnitude FROM sensor_data ORDER BY timestamp DESC LIMIT 2000")
                mags = [r[0] for r in c.fetchall() if r[0] is not None]
                if mags:
                    print(f"DEBUG AI: Pre-training with {len(mags)} historical points.")
                    detector.train(mags)
                    for m in mags:
                        detector.add_to_buffer(m)
                else:
                    print("DEBUG AI: No historical data found for pre-training.")
        except Exception:
            logging.exception("Failed to pre-train AI model")

    def retrain_loop():
        while True:
            time.sleep(300) # Every 5 minutes
            if detector.history_buffer:
                detector.train(detector.history_buffer)

    thread = threading.Thread(target=retrain_loop, daemon=True)
    thread.start()

def heartbeat_monitor():
    """Background service to detect offline devices every 15 seconds."""
    while True:
        # Wait for database initialization to finish
        import db
        if not getattr(db, 'DB_INITIALIZED', False):
            time.sleep(2)
            continue
            
        time.sleep(15)
        try:
            with get_db_connection(app.config["DATABASE_PATH"]) as conn:
                devices = get_all_devices(conn)
                now = datetime.now(timezone.utc)
                for d in devices:
                    if d.get("status") in ["offline", "disabled"]:
                        continue
                    
                    ls_str = d.get("last_seen")
                    if not ls_str:
                        # Never sent data — don't mark offline yet
                        continue
                    
                    try:
                        ls = datetime.fromisoformat(ls_str.replace("Z", "+00:00"))
                        diff = (now - ls).total_seconds()
                        
                        # 120 seconds grace period (was 60s — caused false offline)
                        if diff > 120:
                            update_device(conn, d["id"], {"status": "offline"})
                            broadcaster.broadcast("device_status_changed", {
                                "device_id": d["id"],
                                "status": "offline",
                                "last_seen": ls_str
                            })
                            logging.info(f"Device {d['id']} timed out → offline (diff={diff:.0f}s)")
                    except (ValueError, TypeError):
                        continue
        except Exception:
            logging.exception("Heartbeat monitor thread crashed")

import threading
import time

# Start background workers
monitor_thread = threading.Thread(target=heartbeat_monitor, daemon=True)
monitor_thread.start()

setup_ai()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    if not os.environ.get("APP_URL") and not os.environ.get("RENDER"):
        try:
            from pyngrok import ngrok as _ngrok, conf as _ngrok_conf
            _ngrok_token = os.environ.get("NGROK_AUTHTOKEN", "")
            if _ngrok_token:
                _ngrok_conf.get_default().auth_token = _ngrok_token
            _tunnel = _ngrok.connect(port, bind_tls=True)
            PUBLIC_BASE_URL = _tunnel.public_url.rstrip("/")
            print(f"🌐 ngrok public URL: {PUBLIC_BASE_URL}")
        except Exception as _ngrok_err:
            print(f"⚠️ ngrok fallback: {_ngrok_err}")

    app.run(host="0.0.0.0", port=port, threaded=True, debug=False)
