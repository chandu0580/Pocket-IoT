import sqlite3
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path to import db
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db import get_db_connection, get_placeholder, init_db

def migrate():
    # Detect DB URL from environment or use default
    db_url = os.getenv("DATABASE_URL", "sqlite:///iot_data.db")
    if db_url.startswith("sqlite:///"):
        db_filename = db_url.replace("sqlite:///", "", 1)
        if not os.path.isabs(db_filename):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            db_path = os.path.abspath(os.path.join(base_dir, db_filename))
        else:
            db_path = db_filename
        db_url = f"sqlite:///{db_path}"

    print(f"Ensuring database is initialized at {db_url}...")
    init_db(db_url)
    
    print(f"Connecting to {db_url} for SaaS migration...")
    
    with get_db_connection(db_url) as conn:
        cursor = conn.cursor()
        p = get_placeholder(conn)
        
        # 1. Create Organizations Table
        print("Creating organizations table...")
        if p == "?": # SQLite
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS organizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    plan TEXT NOT NULL DEFAULT 'Free',
                    email TEXT,
                    webhook_url TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
            """)
        else: # Postgres
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS organizations (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    plan TEXT NOT NULL DEFAULT 'Free',
                    email TEXT,
                    webhook_url TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)

        # 2. Create Teams Table
        print("Creating teams table...")
        if p == "?":
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS teams (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    organization_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
                )
            """)
        else:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS teams (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    organization_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
                )
            """)

        # 3. Create Team Members Table
        print("Creating team_members table...")
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS team_members (
                team_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                PRIMARY KEY (team_id, user_id),
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 4. Alter Existing Tables
        print("Altering existing tables...")
        
        # Helper to ignore already exists errors
        def add_column(table, column, type_def):
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}")
                print(f"  Added {column} to {table}")
            except Exception as e:
                # print(f"  Status: {column} in {table} already exists or error: {e}")
                pass

        add_column("users", "organization_id", "INTEGER")
        add_column("devices", "organization_id", "INTEGER")
        add_column("devices", "team_id", "INTEGER")
        add_column("device_groups", "organization_id", "INTEGER")

        # 5. Seed Default Organization
        print("Seeding default organization...")
        cursor.execute("SELECT id FROM organizations WHERE name = 'Default Organization'")
        org = cursor.fetchone()
        if not org:
            cursor.execute(f"INSERT INTO organizations (name, plan) VALUES ({p}, {p})", ("Default Organization", "Pro"))
            if p == "?":
                default_org_id = cursor.lastrowid
            else:
                cursor.execute("SELECT LASTVAL()")
                default_org_id = cursor.fetchone()[0]
        else:
            default_org_id = org[0]

        print(f"Default Organization ID: {default_org_id}")

        # 6. Update Existing Records
        print("Assigning existing records to default organization...")
        # Check if users table has records without org
        cursor.execute(f"UPDATE users SET organization_id = {p} WHERE organization_id IS NULL", (default_org_id,))
        cursor.execute(f"UPDATE devices SET organization_id = {p} WHERE organization_id IS NULL", (default_org_id,))
        cursor.execute(f"UPDATE device_groups SET organization_id = {p} WHERE organization_id IS NULL", (default_org_id,))

        conn.commit()
        print("SaaS Migration completed successfully!")

if __name__ == "__main__":
    migrate()
