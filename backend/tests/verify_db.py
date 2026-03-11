import sqlite3
import os

db_path = 'iot_data.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Tables ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]
for table in tables:
    print(f"Table: {table}")

required_tables = ['users', 'organizations', 'devices', 'sensor_data', 'alerts', 'notifications', 'device_groups']
missing_tables = [t for t in required_tables if t not in tables]
if missing_tables:
    print(f"MISSING TABLES: {missing_tables}")
else:
    print("All required tables exist.")

print("\n--- Indexes ---")
cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='index'")
indexes = cursor.fetchall()
for idx_name, idx_sql in indexes:
    print(f"Index: {idx_name}")

# Check for specific indexes
required_indexes = [
    'idx_sensor_data_device_timestamp',
    'idx_alerts_org_created',
    'idx_notifications_org_created',
    'idx_devices_org'
]

# Just check if these strings are in the index names or SQL
index_names = [idx[0] for idx in indexes]
print(f"Existing index names: {index_names}")

conn.close()
