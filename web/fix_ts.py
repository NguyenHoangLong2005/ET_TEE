import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('columns={auditTab === "cskh" ? cskhAuditColumns : systemAuditColumns}', 'columns={(auditTab === "cskh" ? cskhAuditColumns : systemAuditColumns) as any}')
text = text.replace('data={currentLogs}', 'data={currentLogs as any}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed TS!")
