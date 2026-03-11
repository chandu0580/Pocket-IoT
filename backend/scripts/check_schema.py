import sqlite3
db = sqlite3.connect('iot_data.db')
schema = db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'").fetchone()
if schema:
    print(schema[0])
else:
    print("Table not found")
