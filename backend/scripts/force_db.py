from db import init_db
import sqlite3
import bcrypt
from datetime import datetime, timezone
import os

def force_init_and_seed():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, 'iot_data.db')
    abs_path = os.path.abspath(db_path)
    print(f"Initializing database at: {abs_path}")
    
    # Run the init_db from the project
    init_db(f"sqlite:///{abs_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if tables exist now
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"Tables after init: {tables}")
    
    if 'users' not in tables:
        print("ERROR: 'users' table still does not exist!")
        return

    # Seed admin
    cursor.execute("SELECT id FROM users WHERE email = 'admin@pocketiot.com'")
    if cursor.fetchone():
        print("Admin user already exists.")
    else:
        pwd_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
            ('admin@pocketiot.com', pwd_hash, 'admin', now)
        )
        conn.commit()
        print("Admin user seeded successfully.")
    
    # Seed test device
    cursor.execute("SELECT id FROM devices WHERE device_token = 'device_1_token'")
    if cursor.fetchone():
        print("Test device already exists.")
    else:
        cursor.execute(
            "INSERT INTO devices (name, device_token, status) VALUES (?, ?, ?)",
            ('TestPhone', 'device_1_token', 'active')
        )
        conn.commit()
        print("Test device seeded successfully.")
    
    conn.close()

if __name__ == "__main__":
    force_init_and_seed()
