import sqlite3
import bcrypt
from datetime import datetime, timezone

def seed_admin():
    conn = sqlite3.connect('backend/iot_data.db')
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE email = 'admin@pocketiot.com'")
    if cursor.fetchone():
        print("Admin user already exists.")
        conn.close()
        return

    pwd_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    
    cursor.execute(
        "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
        ('admin@pocketiot.com', pwd_hash, 'admin', now)
    )
    conn.commit()
    conn.close()
    print("Admin user created successfully.")

if __name__ == "__main__":
    seed_admin()
