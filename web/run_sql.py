import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('../.env')

url = os.environ.get('DB_URL')
# parse it manually or just use string replacement
# jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
import re
m = re.match(r'jdbc:postgresql://([^:/]+):?(\d*)/([^?]+)', url)
host = m.group(1)
port = int(m.group(2)) if m.group(2) else 5432
dbname = m.group(3).split('?')[0]
user = os.environ.get('DB_USERNAME')
password = os.environ.get('DB_PASSWORD')

conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password, sslmode='require')
cur = conn.cursor()

try:
    # Get all permissions in ADMIN
    cur.execute("SELECT permission FROM role_permissions WHERE role_code='ADMIN';")
    rows = cur.fetchall()
    print("ADMIN has permissions:", [r[0] for r in rows])
    
    if 'MANAGE_ROLE_PERMISSION' not in [r[0] for r in rows]:
        print("Inserting MANAGE_ROLE_PERMISSION for ADMIN...")
        cur.execute("INSERT INTO role_permissions (id, role_code, permission, created_at, updated_at) SELECT gen_random_uuid(), 'ADMIN', 'MANAGE_ROLE_PERMISSION', current_timestamp, current_timestamp;")
        conn.commit()
        print("Inserted successfully!")
except Exception as e:
    print("Error:", e)

cur.close()
conn.close()
