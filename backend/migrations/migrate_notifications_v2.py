import sqlite3
import os
import sys
from datetime import datetime

# Add parent directory to path to import db
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db import get_db_connection, get_placeholder

def migrate():
    db_path = os.getenv("DATABASE_PATH", "backend/pocketiot.db")
    if not os.path.exists(db_path):
        db_path = "backend/iot_data.db"
    
    print(f"Connecting to {db_path} for Notifications migration...")
    
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        p = get_placeholder(conn)
        
        # 1. Drop old table if exists (or we could alter, but user wants specific fields)
        # Since this is a new feature extension, we'll try to re-create it correctly.
        print("Re-creating notifications table with SaaS fields...")
        cursor.execute("DROP TABLE IF EXISTS notifications")
        
        if p == "?": # SQLite
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id INTEGER,
                    device_id INTEGER,
                    alert_id INTEGER,
                    type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'unsent',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_org_time ON notifications (organization_id, created_at)")
        else: # Postgres
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    organization_id INTEGER,
                    device_id INTEGER,
                    alert_id INTEGER,
                    type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'unsent',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
                )
            """)
        # 2. Alter Organizations Table to add email and webhook_url
        print("Adding email and webhook_url to organizations...")
        try:
            cursor.execute("ALTER TABLE organizations ADD COLUMN email TEXT")
            cursor.execute("ALTER TABLE organizations ADD COLUMN webhook_url TEXT")
        except Exception:
            pass # Already exists
        
        conn.commit()
        print("Notifications Migration completed successfully!")

if __name__ == "__main__":
    migrate()
