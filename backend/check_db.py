import sqlite3
conn = sqlite3.connect('iot_data.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print('Tables:', tables)
c.execute("SELECT email, role FROM users LIMIT 5")
users = c.fetchall()
print('Users:', users)
