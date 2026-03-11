import sqlite3
import os

def check_db():
    db_path = 'iot_data.db'
    if not os.path.exists(db_path):
        print(f"File {db_path} does not exist.")
        return
        
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    print(f"Tables in {db_path}: {[t[0] for t in tables]}")
    conn.close()

if __name__ == "__main__":
    check_db()
