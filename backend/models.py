from __future__ import annotations

import math
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


from dataclasses import dataclass

@dataclass
class Command:
    id: int
    device_id: int
    command: str
    payload: Optional[str]
    status: str
    created_at: str
    executed_at: Optional[str]

from db import get_placeholder

def _row(row: Any) -> Dict[str, Any]:
    if isinstance(row, dict):
        return row
    try:
        if hasattr(row, 'keys'):
            return {key: row[key] for key in row.keys()}
        return dict(row)
    except (AttributeError, TypeError):
        return dict(row)

# ──────────────────────────────── Organizations ──────────────────────────────
def get_organizations(conn: Any) -> List[Dict[str, Any]]:
    c = conn.cursor()
    c.execute("SELECT id, name, plan, created_at FROM organizations ORDER BY name ASC")
    return [_row(r) for r in c.fetchall()]

def get_organization(conn: Any, org_id: int) -> Optional[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"SELECT id, name, plan, created_at FROM organizations WHERE id = {p}", (org_id,))
    row = c.fetchone()
    return _row(row) if row else None

def create_organization(conn: Any, name: str, plan: str = "Free") -> Dict[str, Any]:
    c = conn.cursor()
    p = get_placeholder(conn)
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    c.execute(f"INSERT INTO organizations (name, plan, created_at) VALUES ({p}, {p}, {p})", (name, plan, now))
    conn.commit()
    if p == "?":
        org_id = c.lastrowid
    else:
        c.execute("SELECT LASTVAL()")
        org_id = c.fetchone()[0]
    return get_organization(conn, org_id) # type: ignore

# ────────────────────────────────── Teams ────────────────────────────────────
def get_teams(conn: Any, org_id: int) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"SELECT id, name, organization_id, created_at FROM teams WHERE organization_id = {p} ORDER BY name ASC", (org_id,))
    return [_row(r) for r in c.fetchall()]

def create_team(conn: Any, name: str, org_id: int) -> Dict[str, Any]:
    c = conn.cursor()
    p = get_placeholder(conn)
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    c.execute(f"INSERT INTO teams (name, organization_id, created_at) VALUES ({p}, {p}, {p})", (name, org_id, now))
    conn.commit()
    if p == "?":
        team_id = c.lastrowid
    else:
        c.execute("SELECT LASTVAL()")
        team_id = c.fetchone()[0]
    c.execute(f"SELECT id, name, organization_id, created_at FROM teams WHERE id = {p}", (team_id,))
    return _row(c.fetchone())

def add_team_member(conn: Any, team_id: int, user_id: int) -> None:
    c = conn.cursor()
    p = get_placeholder(conn)
    try:
        c.execute(f"INSERT INTO team_members (team_id, user_id) VALUES ({p}, {p})", (team_id, user_id))
        conn.commit()
    except sqlite3.IntegrityError:
        pass # Already a member

def get_team_members(conn: Any, team_id: int) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"""
        SELECT u.id, u.email, u.role, u.organization_id
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = {p}
    """, (team_id,))
    return [_row(r) for r in c.fetchall()]

# ──────────────────────────────── Devices ────────────────────────────────────
def get_devices(conn: Any, org_id: int) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"""
        SELECT d.id, d.name, d.device_token, d.status, d.last_seen, d.battery, d.last_lat, d.last_lng, 
               d.battery_health, d.storage_usage, d.network_strength, d.os_info, d.created_at, d.group_id,
               dg.name as group_name, d.organization_id, d.team_id
        FROM devices d
        LEFT JOIN device_groups dg ON d.group_id = dg.id
        WHERE d.organization_id = {p} OR d.organization_id IS NULL
        ORDER BY d.id ASC
    """, (org_id,))
    return [_row(r) for r in c.fetchall()]

def get_all_devices(conn: Any) -> List[Dict[str, Any]]:
    c = conn.cursor()
    c.execute("""
        SELECT id, name, device_token, status, last_seen, battery, last_lat, last_lng, 
               battery_health, storage_usage, network_strength, os_info, created_at, group_id,
               organization_id
        FROM devices
        ORDER BY id ASC
    """)
    return [_row(r) for r in c.fetchall()]


def get_device(conn: Any, device_id: int, org_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    query = f"""
        SELECT d.id, d.name, d.device_token, d.status, d.last_seen, d.battery, d.last_lat, d.last_lng, 
               d.battery_health, d.storage_usage, d.network_strength, d.os_info, d.created_at, d.group_id,
               dg.name as group_name, d.organization_id, d.team_id
        FROM devices d
        LEFT JOIN device_groups dg ON d.group_id = dg.id
        WHERE d.id = {p}
    """
    params = [device_id]
    if org_id is not None:
        query += f" AND (d.organization_id = {p} OR d.organization_id IS NULL)"
        params.append(org_id)
        
    c.execute(query, tuple(params))
    row = c.fetchone()
    return _row(row) if row else None


def update_device(conn: Any, device_id: int, fields: Dict[str, Any], org_id: Optional[int] = None) -> None:
    if not fields:
        return
    p = get_placeholder(conn)
    keys = []
    values = []
    for k, v in fields.items():
        keys.append(f"{k} = {p}")
        values.append(v)
    
    query = f"UPDATE devices SET {', '.join(keys)} WHERE id = {p}"
    values.append(device_id)
    
    if org_id is not None:
        query += f" AND organization_id = {p}"
        values.append(org_id)
        
    conn.execute(query, tuple(values))
    conn.commit()


def delete_device(conn: Any, device_id: int, org_id: Optional[int] = None) -> None:
    c = conn.cursor()
    p = get_placeholder(conn)
    
    # Verify ownership
    device = get_device(conn, device_id, org_id)
    if not device:
        return

    try:
        c.execute("DELETE FROM notifications WHERE device_id = " + p, (device_id,))
        c.execute("DELETE FROM alerts WHERE device_id = " + p, (device_id,))
        c.execute("DELETE FROM sensor_data WHERE device_id = " + p, (device_id,))
        c.execute("DELETE FROM device_commands WHERE device_id = " + p, (device_id,))
        c.execute("DELETE FROM devices WHERE id = " + p, (device_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e


def get_device_by_token(conn: Any, device_id: int, token: str) -> Optional[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(
        f"SELECT id, name, device_token, organization_id FROM devices WHERE id = {p} AND device_token = {p}",
        (device_id, token),
    )
    row = c.fetchone()
    return _row(row) if row else None

def get_device_by_api_key(conn: Any, device_id: int, api_key: str) -> Optional[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(
        f"SELECT id, name, device_token, device_api_key, organization_id FROM devices WHERE id = {p} AND device_api_key = {p}",
        (device_id, api_key),
    )
    row = c.fetchone()
    return _row(row) if row else None

def register_or_get_device(conn: Any, name: str, org_id: Optional[int] = None) -> Dict[str, Any]:
    c = conn.cursor()
    p = get_placeholder(conn)
    
    query = f"SELECT id, name, device_token, last_seen, created_at, organization_id FROM devices WHERE name = {p}"
    params = [name]
    if org_id:
        query += f" AND organization_id = {p}"
        params.append(org_id)
        
    c.execute(query, tuple(params))
    row = c.fetchone()
    if row:
        return _row(row)
    
    token = secrets.token_hex(16)
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    
    if org_id:
        c.execute(
            f"INSERT INTO devices (name, device_token, created_at, organization_id) VALUES ({p}, {p}, {p}, {p})",
            (name, token, now, org_id),
        )
    else:
        c.execute(
            f"INSERT INTO devices (name, device_token, created_at) VALUES ({p}, {p}, {p})",
            (name, token, now),
        )
    conn.commit()
    
    if p == "?":
        device_id = c.lastrowid
    else:
        c.execute("SELECT LASTVAL()")
        device_id = c.fetchone()[0]
        
    c.execute(f"SELECT id, name, device_token, last_seen, created_at, organization_id FROM devices WHERE id = {p}", (device_id,))
    return _row(c.fetchone())


def update_device_last_seen(conn: Any, device_id: int, ts: str) -> None:
    p = get_placeholder(conn)
    conn.execute(f"UPDATE devices SET last_seen = {p} WHERE id = {p}", (ts, device_id))
    conn.commit()


# ─────────────────────────────── Device Groups ───────────────────────────────
def get_groups(conn: Any, org_id: int) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"SELECT id, name, organization_id, created_at FROM device_groups WHERE organization_id = {p} ORDER BY name ASC", (org_id,))
    return [_row(r) for r in c.fetchall()]


def create_group(conn: Any, name: str, org_id: int) -> Dict[str, Any]:
    c = conn.cursor()
    p = get_placeholder(conn)
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    c.execute(f"INSERT INTO device_groups (name, organization_id, created_at) VALUES ({p}, {p}, {p})", (name, org_id, now))
    conn.commit()
    
    if p == "?":
        group_id = c.lastrowid
    else:
        c.execute("SELECT LASTVAL()")
        group_id = c.fetchone()[0]
        
    c.execute(f"SELECT id, name, organization_id, created_at FROM device_groups WHERE id = {p}", (group_id,))
    return _row(c.fetchone())


def assign_device_to_group(conn: Any, device_id: int, group_id: Optional[int]) -> None:
    p = get_placeholder(conn)
    conn.execute(f"UPDATE devices SET group_id = {p} WHERE id = {p}", (group_id, device_id))
    conn.commit()


def get_devices_in_group(conn: Any, group_id: int, org_id: Optional[int] = None) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    query = f"""
        SELECT d.id, d.name, d.device_token, d.status, d.last_seen, d.battery, d.last_lat, d.last_lng, 
               d.battery_health, d.storage_usage, d.network_strength, d.os_info, d.created_at, d.group_id,
               dg.name as group_name
        FROM devices d
        JOIN device_groups dg ON d.group_id = dg.id
        WHERE d.group_id = {p}
    """
    params = [group_id]
    if org_id:
        query += f" AND d.organization_id = {p}"
        params.append(org_id)
        
    query += " ORDER BY d.id ASC"
    c.execute(query, tuple(params))
    return [_row(r) for r in c.fetchall()]


# ─────────────────────────────── Sensor Data ─────────────────────────────────
def create_sensor_data(
    conn: Any,
    device_id: int,
    x: float,
    y: float,
    z: float,
    battery: float,
    timestamp: datetime,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    gyro_x: Optional[float] = None,
    gyro_y: Optional[float] = None,
    gyro_z: Optional[float] = None,
    pitch: Optional[float] = None,
    roll: Optional[float] = None,
    yaw: Optional[float] = None,
    speed: Optional[float] = None,
    ambient_light: Optional[float] = None,
    noise_level: Optional[float] = None,
    pressure: Optional[float] = None,
    anomaly_score: float = 0.0,
    is_anomaly: bool = False,
) -> int:
    magnitude = math.sqrt(x ** 2 + y ** 2 + z ** 2)
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(
        f"""
        INSERT INTO sensor_data
            (device_id, x, y, z, gyro_x, gyro_y, gyro_z, pitch, roll, yaw, battery, latitude, longitude, speed, ambient_light, noise_level, pressure, motion_magnitude, anomaly_score, is_anomaly, timestamp)
        VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p})
        """,
        (
            device_id, x, y, z, gyro_x, gyro_y, gyro_z, pitch, roll, yaw, battery, latitude, longitude, speed, ambient_light, noise_level, pressure, magnitude, anomaly_score, is_anomaly,
            timestamp.replace(tzinfo=None).isoformat() + "Z"
        ),
    )
    conn.commit()
    
    if p == "?":
        return c.lastrowid # type: ignore
    else:
        c.execute("SELECT LASTVAL()")
        return c.fetchone()[0]


def get_sensor_data(
    conn: Any,
    org_id: int,
    limit: int = 100,
    device_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    cols = "s.id, s.device_id, s.x, s.y, s.z, s.gyro_x, s.gyro_y, s.gyro_z, s.pitch, s.roll, s.yaw, s.battery, s.latitude, s.longitude, s.speed, s.ambient_light, s.noise_level, s.pressure, s.motion_magnitude, s.anomaly_score, s.is_anomaly, s.timestamp"
    
    query = f"SELECT {cols} FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE (d.organization_id = {p} OR d.organization_id IS NULL)"
    params = [org_id]
    
    if device_id is not None:
        query += f" AND s.device_id = {p}"
        params.append(device_id)
        
    query += f" ORDER BY s.timestamp DESC LIMIT {p}"
    params.append(limit)
    
    c.execute(query, tuple(params))
    return list(reversed([_row(r) for r in c.fetchall()]))


# ───────────────────────────── Snapshots ─────────────────────────────────────
def create_device_snapshot(conn: Any, device_id: int, image_base64: str, timestamp: datetime) -> int:
    c = conn.cursor()
    p = get_placeholder(conn)
    ts_str = timestamp.replace(tzinfo=None).isoformat() + "Z"
    c.execute(
        f"INSERT INTO device_snapshots (device_id, image_base64, timestamp) VALUES ({p}, {p}, {p})",
        (device_id, image_base64, ts_str)
    )
    conn.commit()
    if p == "?":
        return c.lastrowid # type: ignore
    else:
        c.execute("SELECT LASTVAL()")
        return c.fetchone()[0]


def get_latest_snapshot(conn: Any, device_id: int) -> Optional[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(
        f"SELECT id, device_id, image_base64, timestamp FROM device_snapshots WHERE device_id = {p} ORDER BY timestamp DESC LIMIT 1",
        (device_id,)
    )
    row = c.fetchone()
    return _row(row) if row else None


# ───────────────────────────── Alert Rules ───────────────────────────────────
def create_alert_rule(conn: Any, device_id: Optional[int], sensor_type: str, operator: str, threshold: float, required_samples: int = 1) -> int:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(
        f"INSERT INTO alert_rules (device_id, sensor_type, operator, threshold, required_samples, current_samples) VALUES ({p}, {p}, {p}, {p}, {p}, 0)",
        (device_id, sensor_type, operator, threshold, required_samples)
    )
    conn.commit()
    if p == "?":
        return c.lastrowid # type: ignore
    else:
        c.execute("SELECT LAST_INSERT_ID()") # Fallback for Postgres
        return c.fetchone()[0]

def update_alert_rule_count(conn: Any, rule_id: int, count: int) -> None:
    p = get_placeholder(conn)
    conn.execute(
        f"UPDATE alert_rules SET current_samples = {p} WHERE id = {p}",
        (count, rule_id)
    )
    conn.commit()


def get_alert_rules(conn: Any, device_id: Optional[int] = None) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    cols = "id, device_id, sensor_type, operator, threshold, is_enabled, required_samples, current_samples"
    if device_id is not None:
        c.execute(f"SELECT {cols} FROM alert_rules WHERE device_id = {p} OR device_id IS NULL", (device_id,))
    else:
        c.execute(f"SELECT {cols} FROM alert_rules")
    return [_row(r) for r in c.fetchall()]


# ──────────────────────────────── Alerts ─────────────────────────────────────
def create_alert(
    conn: Any,
    device_id: int,
    alert_type: str,
    message: str,
    timestamp: datetime,
    severity: Optional[str] = None,
    magnitude: Optional[float] = None,
    status: str = 'active',
    organization_id: Optional[int] = None
) -> int:
    c = conn.cursor()
    p = get_placeholder(conn)
    
    if organization_id is None:
        c.execute(f"SELECT organization_id FROM devices WHERE id = {p}", (device_id,))
        row = c.fetchone()
        if row:
            organization_id = row[0]
            
    c.execute(
        f"INSERT INTO alerts (device_id, organization_id, type, message, severity, magnitude, status, created_at) VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p})",
        (device_id, organization_id, alert_type, message, severity, magnitude, status, timestamp.replace(tzinfo=None).isoformat() + "Z"),
    )
    conn.commit()
    
    if p == "?":
        return c.lastrowid # type: ignore
    else:
        c.execute("SELECT LASTVAL()")
        return c.fetchone()[0]


def get_alerts(
    conn: Any,
    org_id: int,
    limit: int = 100,
    device_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    cols = "a.id, a.device_id, d.name as device, a.type, a.message, a.severity, a.magnitude, a.status, a.created_at as timestamp"
    
    query = f"SELECT {cols} FROM alerts a JOIN devices d ON a.device_id = d.id WHERE (d.organization_id = {p} OR d.organization_id IS NULL)"
    params = [org_id]
    
    if device_id is not None:
        query += f" AND a.device_id = {p}"
        params.append(device_id)
        
    query += f" ORDER BY a.created_at DESC LIMIT {p}"
    params.append(limit)
    
    c.execute(query, tuple(params))
    return list(reversed([_row(r) for r in c.fetchall()]))


def delete_alerts(conn: Any, org_id: int, device_id: Optional[int] = None) -> int:
    c = conn.cursor()
    p = get_placeholder(conn)
    if device_id is not None:
        c.execute(f"DELETE FROM alerts WHERE device_id = {p} AND device_id IN (SELECT id FROM devices WHERE organization_id = {p})", (device_id, org_id))
    else:
        c.execute(f"DELETE FROM alerts WHERE device_id IN (SELECT id FROM devices WHERE organization_id = {p})", (org_id,))
    conn.commit()
    return c.rowcount


# ──────────────────────────────── Stats ──────────────────────────────────────
def count_today_data_points(conn: Any, org_id: int) -> int:
    today = datetime.now(timezone.utc).date().isoformat()
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"SELECT COUNT(*) FROM sensor_data s JOIN devices d ON s.device_id = d.id WHERE d.organization_id = {p} AND s.timestamp >= {p}", (org_id, today))
    return c.fetchone()[0]


# ────────────────────────────── Commands ─────────────────────────────────────
def create_command(conn: Any, device_id: int, command: str, payload: Dict[str, Any] = {}) -> int:
    import json
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(
        f"INSERT INTO device_commands (device_id, command, payload, status, created_at) VALUES ({p}, {p}, {p}, {p}, {p})",
        (device_id, command, json.dumps(payload), 'pending', now)
    )
    conn.commit()
    
    if p == "?":
        return c.lastrowid # type: ignore
    else:
        c.execute("SELECT LASTVAL()")
        return c.fetchone()[0]


def get_pending_commands(conn: Any, device_id: int) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(
        f"SELECT id, device_id, command, payload, status, created_at FROM device_commands WHERE device_id = {p} AND status = 'pending' ORDER BY created_at ASC",
        (device_id,)
    )
    return [_row(r) for r in c.fetchall()]


def update_command_status(conn: Any, command_id: int, status: str) -> None:
    executed_at = None
    if status in ['executed', 'failed']:
        executed_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    
    p = get_placeholder(conn)
    conn.execute(
        f"UPDATE device_commands SET status = {p}, executed_at = {p} WHERE id = {p}",
        (status, executed_at, command_id)
    )
    conn.commit()


def fail_old_commands(conn: Any) -> int:
    # Mark commands older than 20 seconds as failed
    c = conn.cursor()
    p = get_placeholder(conn)
    
    if p == "?":
        c.execute(
            "UPDATE device_commands SET status = 'failed' WHERE status = 'pending' AND created_at < datetime('now', '-20 seconds')"
        )
    else:
        # PostgreSQL syntax
        c.execute(
            "UPDATE device_commands SET status = 'failed' WHERE status = 'pending' AND created_at::timestamp < NOW() - INTERVAL '20 seconds'"
        )
    conn.commit()
    return c.rowcount
# ──────────────────────────────── Users ──────────────────────────────────────
def create_user(conn: Any, email: str, password_hash: str, role: str = 'viewer', org_id: Optional[int] = None) -> int:
    p = get_placeholder(conn)
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    c = conn.cursor()
    if org_id:
        c.execute(
            f"INSERT INTO users (email, password_hash, role, created_at, organization_id) VALUES ({p}, {p}, {p}, {p}, {p})",
            (email, password_hash, role, now, org_id)
        )
    else:
        c.execute(
            f"INSERT INTO users (email, password_hash, role, created_at) VALUES ({p}, {p}, {p}, {p})",
            (email, password_hash, role, now)
        )
    conn.commit()
    
    if p == "?":
        return c.lastrowid # type: ignore
    else:
        c.execute("SELECT LASTVAL()")
        return c.fetchone()[0]

def get_user_by_email(conn: Any, email: str) -> Optional[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"SELECT id, email, password_hash, role, organization_id, created_at FROM users WHERE email = {p}", (email,))
    row = c.fetchone()
    return _row(row) if row else None

def get_user_by_id(conn: Any, user_id: int) -> Optional[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"SELECT id, email, role, organization_id, created_at FROM users WHERE id = {p}", (user_id,))
    row = c.fetchone()
    return _row(row) if row else None

def get_organization_users(conn: Any, org_id: int) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"SELECT id, email, role, organization_id, created_at FROM users WHERE organization_id = {p} ORDER BY email ASC", (org_id,))
    return [_row(r) for r in c.fetchall()]

# ────────────────────────────── Notifications ───────────────────────────────
def create_notification(conn: Any, org_id: int, n_type: str, message: str, device_id: Optional[int] = None, alert_id: Optional[int] = None) -> int:
    p = get_placeholder(conn)
    now = datetime.now(timezone.utc).isoformat()
    c = conn.cursor()
    c.execute(
        f"INSERT INTO notifications (organization_id, device_id, alert_id, type, message, status, created_at) VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p})",
        (org_id, device_id, alert_id, n_type, message, 'SENT', now)
    )
    conn.commit()
    
    if p == "?":
        return c.lastrowid # type: ignore
    else:
        c.execute("SELECT LASTVAL()")
        return c.fetchone()[0]

def get_notifications(conn: Any, org_id: int, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    c.execute(f"""
        SELECT n.id, n.device_id, d.name as device_name, n.type, n.message, n.status, n.created_at
        FROM notifications n
        LEFT JOIN devices d ON n.device_id = d.id
        WHERE n.organization_id = {p}
        ORDER BY n.created_at DESC LIMIT {p} OFFSET {p}
    """, (org_id, limit, offset))
    return [_row(r) for r in c.fetchall()]

def get_device_history(conn: Any, device_id: int, minutes: int = 30) -> List[Dict[str, Any]]:
    c = conn.cursor()
    p = get_placeholder(conn)
    
    # Calculate cutoff time in ISO format for comparison
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat().replace('+00:00', 'Z')
    
    query = f"""
        SELECT latitude, longitude, timestamp 
        FROM sensor_data 
        WHERE device_id = {p} 
          AND latitude IS NOT NULL 
          AND timestamp >= {p} 
        ORDER BY timestamp ASC
    """
    c.execute(query, (device_id, cutoff))
    return [_row(r) for r in c.fetchall()]
