import sqlite3
import bcrypt

def check_users():
    conn = sqlite3.connect('iot_data.db')
    c = conn.cursor()
    c.execute("SELECT id, email, password_hash, role FROM users")
    rows = c.fetchall()
    print(f"Users found: {len(rows)}")
    for r in rows:
        print(f"ID: {r[0]}, Email: {r[1]}, Role: {r[3]}")
        # Verify password 'admin123'
        if r[1] == 'admin@pocketiot.com':
            is_match = bcrypt.checkpw('admin123'.encode('utf-8'), r[2].encode('utf-8'))
            print(f"Password 'admin123' match: {is_match}")
    conn.close()

if __name__ == "__main__":
    check_users()
