from __future__ import annotations

import logging
import os
import sqlite3
from contextlib import contextmanager
from typing import Generator, Any, Union

# Try importing PostgreSQL driver
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_POSTGRES = True
except Exception:
    psycopg2 = None
    RealDictCursor = None
    HAS_POSTGRES = False


# ─────────────────────────────── Connection ──────────────────────────────────

@contextmanager
def get_db_connection(url_or_path: str) -> Generator[Union[sqlite3.Connection, Any], None, None]:

    # PostgreSQL
    if url_or_path.startswith(("postgres://", "postgresql://")):

        db_url = url_or_path.replace("postgres://", "postgresql://", 1)

        try:
            conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
            conn.autocommit = False
        except Exception as e:
            logging.error("Postgres connection failed: %s", e)
            raise

        try:
            yield conn
        finally:
            conn.close()


    # SQLite
    else:
        db_path = url_or_path

        if db_path.startswith("sqlite:///"):
            db_path = db_path.replace("sqlite:///", "", 1)

        dir_name = os.path.dirname(db_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)

        conn = sqlite3.connect(
            db_path,
            detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
            check_same_thread=False,
        )

        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")

        try:
            yield conn
        finally:
            conn.close()


def get_placeholder(conn: Any) -> str:
    """Return '?' for SQLite and '%s' for PostgreSQL."""
    if HAS_POSTGRES and hasattr(psycopg2, "extensions") and isinstance(conn, psycopg2.extensions.connection):
        return "%s"
    return "?"


# ─────────────────────────────── Helpers ─────────────────────────────────────

def _migrate(cursor: Any, stmt: str) -> None:
    """Execute a SQL statement, silently ignoring any errors (e.g. column already exists)."""
    try:
        cursor.execute(stmt)
    except Exception:
        pass


def column_exists(cursor: Any, table: str, column: str) -> bool:
    """Return True if the given column exists in the given table (SQLite only)."""
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        cols = [row[1] for row in cursor.fetchall()]
        return column in cols
    except Exception:
        return False


def _is_postgres(conn: Any) -> bool:
    """Return True if the connection is a PostgreSQL connection."""
    if not HAS_POSTGRES or psycopg2 is None:
        return False
    return isinstance(conn, psycopg2.extensions.connection)



# ─────────────────────────── Step 1: Base Tables ─────────────────────────────

def _create_base_tables(cursor: Any, is_pg: bool) -> None:
    """
    Create all core tables with minimal schemas (no FK refs to migration-only tables).
    SERIAL / INTEGER PRIMARY KEY AUTOINCREMENT is handled per-engine below.
    """
    pk = "SERIAL PRIMARY KEY" if is_pg else "INTEGER PRIMARY KEY AUTOINCREMENT"
    dt = "CURRENT_TIMESTAMP" if is_pg else "(datetime('now'))"

    stmts = [
        # Organizations (SaaS top-level tenant)
        f"""CREATE TABLE IF NOT EXISTS organizations (
            id          {pk},
            name        TEXT NOT NULL UNIQUE,
            email       TEXT,
            webhook_url TEXT,
            plan        TEXT NOT NULL DEFAULT 'free',
            created_at  TEXT NOT NULL DEFAULT {dt}
        )""",

        # Teams
        f"""CREATE TABLE IF NOT EXISTS teams (
            id              {pk},
            organization_id INTEGER NOT NULL,
            name            TEXT NOT NULL,
            created_at      TEXT NOT NULL DEFAULT {dt}
        )""",

        # Device groups
        f"""CREATE TABLE IF NOT EXISTS device_groups (
            id         {pk},
            name       TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT {dt}
        )""",

        # Devices (minimal — further columns added via migration)
        f"""CREATE TABLE IF NOT EXISTS devices (
            id           {pk},
            name         TEXT NOT NULL UNIQUE,
            device_token TEXT NOT NULL UNIQUE,
            created_at   TEXT NOT NULL DEFAULT {dt}
        )""",

        # Sensor data (minimal)
        f"""CREATE TABLE IF NOT EXISTS sensor_data (
            id        {pk},
            device_id INTEGER NOT NULL,
            x         REAL NOT NULL,
            y         REAL NOT NULL DEFAULT 0,
            z         REAL NOT NULL DEFAULT 0,
            battery   REAL NOT NULL DEFAULT 0,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        )""",

        # Device snapshots
        f"""CREATE TABLE IF NOT EXISTS device_snapshots (
            id           {pk},
            device_id    INTEGER NOT NULL,
            image_base64 TEXT NOT NULL,
            timestamp    TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        )""",

        # Alert rules
        f"""CREATE TABLE IF NOT EXISTS alert_rules (
            id          {pk},
            device_id   INTEGER,
            sensor_type TEXT NOT NULL,
            operator    TEXT NOT NULL,
            threshold   REAL NOT NULL,
            is_enabled  BOOLEAN DEFAULT 1,
            created_at  TEXT NOT NULL DEFAULT {dt}
        )""",

        # Alerts (minimal — organization_id added via migration)
        f"""CREATE TABLE IF NOT EXISTS alerts (
            id         {pk},
            device_id  INTEGER NOT NULL,
            message    TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        )""",

        # Device commands
        f"""CREATE TABLE IF NOT EXISTS device_commands (
            id          {pk},
            device_id   INTEGER NOT NULL,
            command     TEXT NOT NULL,
            payload     TEXT,
            status      TEXT NOT NULL DEFAULT 'pending',
            created_at  TEXT NOT NULL,
            executed_at TEXT,
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        )""",

        # Users (minimal — organization_id / team_id added via migration)
        f"""CREATE TABLE IF NOT EXISTS users (
            id            {pk},
            email         TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'viewer',
            created_at    TEXT NOT NULL DEFAULT {dt}
        )""",

        # Team members junction
        f"""CREATE TABLE IF NOT EXISTS team_members (
            team_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            PRIMARY KEY (team_id, user_id),
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )""",

        # Notifications (minimal)
        f"""CREATE TABLE IF NOT EXISTS notifications (
            id         {pk},
            device_id  INTEGER,
            alert_id   INTEGER,
            type       TEXT NOT NULL,
            message    TEXT NOT NULL,
            status     TEXT NOT NULL DEFAULT 'unsent',
            created_at TEXT NOT NULL DEFAULT {dt},
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
            FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
        )""",
    ]

    for stmt in stmts:
        _migrate(cursor, stmt)


# ──────────────────────────── Step 2: Migrations ─────────────────────────────

def _run_migrations(cursor: Any) -> None:
    """
    Add columns to existing tables safely.
    All statements are wrapped in _migrate() so re-running is idempotent.
    """
    logging.info("Running database migrations...")

    # ── devices ──────────────────────────────────────────────────────────────
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN organization_id INTEGER")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN group_id INTEGER")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN last_seen TEXT")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN battery REAL")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN last_lat REAL")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN last_lng REAL")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN battery_health TEXT")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN storage_usage REAL")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN network_strength TEXT")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN os_info TEXT")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN device_api_key TEXT")

    # ── sensor_data ───────────────────────────────────────────────────────────
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN gyro_x REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN gyro_y REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN gyro_z REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN pitch REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN roll REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN yaw REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN latitude REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN longitude REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN speed REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN ambient_light REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN noise_level REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN pressure REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN motion_magnitude REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN anomaly_score REAL")
    _migrate(cursor, "ALTER TABLE sensor_data ADD COLUMN is_anomaly BOOLEAN")

    # ── alerts ────────────────────────────────────────────────────────────────
    _migrate(cursor, "ALTER TABLE alerts ADD COLUMN organization_id INTEGER")
    _migrate(cursor, "ALTER TABLE alerts ADD COLUMN type TEXT NOT NULL DEFAULT 'general'")
    _migrate(cursor, "ALTER TABLE alerts ADD COLUMN severity TEXT")
    _migrate(cursor, "ALTER TABLE alerts ADD COLUMN magnitude REAL")
    _migrate(cursor, "ALTER TABLE alerts ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")

    # ── alert_rules ───────────────────────────────────────────────────────────
    _migrate(cursor, "ALTER TABLE alert_rules ADD COLUMN required_samples INTEGER DEFAULT 1")
    _migrate(cursor, "ALTER TABLE alert_rules ADD COLUMN current_samples INTEGER DEFAULT 0")

    # ── users ─────────────────────────────────────────────────────────────────
    _migrate(cursor, "ALTER TABLE users ADD COLUMN organization_id INTEGER")
    _migrate(cursor, "ALTER TABLE users ADD COLUMN team_id INTEGER")

    # ── notifications ─────────────────────────────────────────────────────────
    _migrate(cursor, "ALTER TABLE notifications ADD COLUMN organization_id INTEGER")

    logging.info("Database migrations complete.")


# ──────────────────────────── Step 3: Indexes ────────────────────────────────

def _create_indexes(cursor: Any) -> None:
    """
    Create all performance indexes.
    Each index is only created when the columns it references are confirmed to exist.
    Uses column_exists() check + _migrate() for safe idempotent execution.
    """
    logging.info("Creating database indexes...")

    # sensor_data indexes
    _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_data (device_id, timestamp)")

    if column_exists(cursor, "sensor_data", "motion_magnitude"):
        _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_sensor_magnitude ON sensor_data (device_id, motion_magnitude)")

    # alerts indexes
    _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_alerts_device_time ON alerts (device_id, created_at)")

    if column_exists(cursor, "alerts", "organization_id"):
        _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_alerts_org_time ON alerts (organization_id, created_at)")

    if column_exists(cursor, "alerts", "status"):
        _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status)")

    # device_snapshots index
    _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_snapshots_device_time ON device_snapshots (device_id, timestamp)")

    # notifications indexes
    if column_exists(cursor, "notifications", "organization_id"):
        _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_notif_org_time ON notifications (organization_id, created_at)")

    # devices indexes
    if column_exists(cursor, "devices", "organization_id"):
        _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_devices_org ON devices (organization_id)")

    if column_exists(cursor, "devices", "status"):
        _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status)")

    logging.info("Database indexes created.")


# ─────────────────────────────── Public API ──────────────────────────────────

def init_db(url_or_path: str) -> None:
    """
    Initialize the database in a safe, migration-friendly order:
      1. Create base tables (minimal schema, no cross-table FK to migration-added tables)
      2. Run migrations  (ALTER TABLE — idempotent via _migrate)
      3. Create indexes  (guarded by column_exists checks)
    Works correctly for both fresh databases and existing databases.
    """
    try:
        with get_db_connection(url_or_path) as conn:
            cursor = conn.cursor()
            is_pg = _is_postgres(conn)

            logging.info("Initializing database at %s", url_or_path)

            # ── Step 1: Base tables ───────────────────────────────────────────
            _create_base_tables(cursor, is_pg)

            # ── Step 2: Migrations ────────────────────────────────────────────
            _run_migrations(cursor)

            # ── Step 3: Indexes ───────────────────────────────────────────────
            _create_indexes(cursor)

            conn.commit()
            logging.info("Database ready.")
    except Exception:
        logging.exception("Failed to initialize database")
        raise
