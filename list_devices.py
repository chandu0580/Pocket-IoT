import sqlite3
import os

db_path = 'backend/backend/iot_data.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT id, name, device_token FROM devices")
rows = cursor.fetchall()

for row in rows:
    print(f"ID: {row['id']} | Name: {row['name']} | Token: {row['device_token']}")

conn.close()
