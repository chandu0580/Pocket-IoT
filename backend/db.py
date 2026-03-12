from __future__ import annotations

import logging
import os
import sqlite3
from contextlib import contextmanager
from typing import Generator, Any, Union

# ─── Resilient Database Driver Import (V2 & V3 Support) ──────────────────────
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor as dict_row_factory
    HAS_POSTGRES = True
    IS_PSYCOPG3 = False
except ImportError:
    try:
        import psycopg
        from psycopg.rows import dict_row as dict_row_factory
        HAS_POSTGRES = True
        IS_PSYCOPG3 = True
    except ImportError:
        HAS_POSTGRES = False
        dict_row_factory = None
        IS_PSYCOPG3 = False


# ─────────────────────────────── Connection ──────────────────────────────────

@contextmanager
def get_db_connection(url_or_path: str) -> Generator[Union[sqlite3.Connection, Any], None, None]:

    # PostgreSQL
    if url_or_path.startswith(("postgres://", "postgresql://")):
        if not HAS_POSTGRES:
            logging.error("❌ No Postgres driver found! Please ensure 'psycopg[binary]' is in requirements.txt")
            raise ImportError("No Postgres driver installed (psycopg or psycopg2).")

        db_url = url_or_path.replace("postgres://", "postgresql://", 1)

        try:
            if IS_PSYCOPG3:
                # Modern psycopg (v3) usage
                import psycopg
                conn = psycopg.connect(db_url, row_factory=dict_row_factory, connect_timeout=10)
            else:
                # Legacy psycopg2 usage
                import psycopg2
                conn = psycopg2.connect(db_url, cursor_factory=dict_row_factory, connect_timeout=10)

            conn.autocommit = False
        except Exception as e:
            error_msg = str(e)
            if "Network is unreachable" in error_msg or "2406:" in error_msg:
                logging.error("❌ IPv6 Connection Error detected!")
                logging.error("💡 Render does not support IPv6. You MUST use the Supabase Connection Pooler URL (Host ending in .pooler.supabase.com) in your Render settings.")
            
            logging.error("❌ Postgres connection failed: %s", e)
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
    if HAS_POSTGRES:
        if IS_PSYCOPG3:
            return "%s" # psycopg v3 always uses %s
        else:
            import psycopg2
            if isinstance(conn, psycopg2.extensions.connection):
                return "%s"
    return "?"


# ─────────────────────────────── Helpers ─────────────────────────────────────

def _migrate(cursor: Any, stmt: str) -> None:
    """Execute a SQL statement, with informative logging for errors."""
    try:
        cursor.execute(stmt)
        # Commit each migration individually to ensure success is registered even if subsequent ones fail.
        # This prevents Postgres transaction aborts from rolling back previous successful migrations.
        cursor.connection.commit()
    except Exception as e:
        err = str(e).lower()
        
        # If we are on Postgres, a failed command aborts the transaction.
        # We MUST rollback to clear the "aborted" state and continue with next commands.
        is_pg = is_postgres(cursor.connection)
        if is_pg:
            cursor.connection.rollback()

        # Silently ignore "already exists" errors which are common in idempotent migrations
        if "already exists" in err or "duplicate column" in err or "duplicate key" in err:
            return
            
        logging.warning("Migration notice (non-critical): %s | Statement: %s", e, (stmt[:50] + "...") if len(stmt) > 50 else stmt)


def column_exists(cursor: Any, table: str, column: str) -> bool:
    """Return True if the given column exists in the given table (cross-engine)."""
    try:
        if is_postgres(cursor.connection):
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = %s AND column_name = %s
                )
            """, (table, column))
            row = cursor.fetchone()
            if row and (isinstance(row, dict) or hasattr(row, '__getitem__')):
                try: 
                    if isinstance(row, dict):
                        return bool(row.get("exists") or list(row.values())[0])
                    return bool(row[0])
                except (KeyError, IndexError, TypeError): 
                    return False
            return bool(row)
        else:
            cursor.execute(f"PRAGMA table_info({table})")
            cols = [row[1] for row in cursor.fetchall()]
            return column in cols
    except Exception:
        return False


def is_postgres(conn: Any) -> bool:
    """Return True if the connection is a PostgreSQL connection."""
    if not HAS_POSTGRES:
        return False
    if IS_PSYCOPG3:
        import psycopg
        return isinstance(conn, psycopg.Connection)
    else:
        import psycopg2
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
            id              {pk},
            organization_id INTEGER,
            name            TEXT NOT NULL UNIQUE,
            created_at      TEXT NOT NULL DEFAULT {dt}
        )""",

        # Devices (minimal — further columns added via migration)
        f"""CREATE TABLE IF NOT EXISTS devices (
            id              {pk},
            organization_id INTEGER,
            team_id         INTEGER,
            name            TEXT NOT NULL UNIQUE,
            device_token    TEXT NOT NULL UNIQUE,
            created_at      TEXT NOT NULL DEFAULT {dt}
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
            is_enabled  BOOLEAN DEFAULT TRUE,
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

        # QR Pairing tokens — stored in DB so all workers can share them
        f"""CREATE TABLE IF NOT EXISTS qr_tokens (
            token      TEXT PRIMARY KEY,
            org_id     INTEGER NOT NULL,
            expires_at TEXT NOT NULL
        )""",
    ]

    logging.info("Building base schema...")
    for stmt in stmts:
        _migrate(cursor, stmt)
    # Final safety commit
    cursor.connection.commit()


# ──────────────────────────── Step 2: Migrations ─────────────────────────────

def _run_migrations(cursor: Any) -> None:
    """
    Add columns to existing tables safely.
    All statements are wrapped in _migrate() so re-running is idempotent.
    """
    logging.info("Running database migrations...")

    # ── devices ──────────────────────────────────────────────────────────────
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN organization_id INTEGER")
    _migrate(cursor, "ALTER TABLE devices ADD COLUMN team_id INTEGER")
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
    
    # ── device_groups ──────────────────────────────────────────────────────────
    _migrate(cursor, "ALTER TABLE device_groups ADD COLUMN organization_id INTEGER")

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

    # ── qr_tokens — no extra columns, but purge any stale rows at startup ─────
    # (Table is created by _create_base_tables; migration just keeps it clean)
    try:
        cursor.execute("DELETE FROM qr_tokens WHERE expires_at < datetime('now')")
        cursor.connection.commit()
    except Exception:
        pass  # Table may not exist yet on very first boot — that's fine

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

    # qr_tokens index — token is PRIMARY KEY (already unique + indexed),
    # but an explicit named index makes intent clear and speeds expires_at scans
    _migrate(cursor, "CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires ON qr_tokens (expires_at)")

    logging.info("Database indexes created.")


# ─────────────────────────────── Public API ──────────────────────────────────
DB_INITIALIZED = False

def init_db(url_or_path: str) -> None:
    """
    Initialize the database in a safe, migration-friendly order.
    """
    global DB_INITIALIZED
    try:
        with get_db_connection(url_or_path) as conn:
            cursor = conn.cursor()
            is_pg = is_postgres(conn)

            logging.info("🚀 Starting database initialization at %s", url_or_path)

            # ── Step 1: Base tables
            _create_base_tables(cursor, is_pg)
            conn.commit()

            # ── Step 2: Migrations
            _run_migrations(cursor)
            conn.commit()

            # ── Step 3: Indexes
            _create_indexes(cursor)
            conn.commit()

            # ── Verification (Safer Cross-Engine Check)
            row = None
            if is_pg:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'devices'
                    ) AS exists_check
                """)
                row = cursor.fetchone()
                
                # Psycopg dict-like row access
                if row and (isinstance(row, dict) or hasattr(row, '__getitem__')):
                    try:
                        exists = bool(row["exists_check"])
                    except (KeyError, TypeError):
                        exists = bool(row[0])
                else:
                    exists = bool(row)
            else:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='devices'")
                row = cursor.fetchone()
                exists = row is not None
            
            if exists is None: # Possible if row existed but extraction failed
                exists = True if row else False

            if not exists:
                raise Exception("'devices' table not found after initialization")

            DB_INITIALIZED = True
            logging.info("✅ Database initialization complete. 'devices' table verified.")
    except Exception as e:
        DB_INITIALIZED = False
        logging.exception("❌ Critical failure during database initialization")
        raise e
