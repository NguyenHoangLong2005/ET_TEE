import psycopg2
import os
from dotenv import load_dotenv
import re

load_dotenv('../.env')
url = os.environ.get('DB_URL')
m = re.match(r'jdbc:postgresql://([^:/]+):?(\d*)/([^?]+)', url)
conn = psycopg2.connect(host=m.group(1), port=int(m.group(2)) if m.group(2) else 5432, dbname=m.group(3).split('?')[0], user=os.environ.get('DB_USERNAME'), password=os.environ.get('DB_PASSWORD'), sslmode='require')
cur = conn.cursor()

cur.execute("SELECT email, role, is_staff FROM users WHERE email LIKE '%admin%';")
print(cur.fetchall())
