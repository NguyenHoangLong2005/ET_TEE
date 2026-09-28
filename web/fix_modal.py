file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\users\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(
    r'<\/div>\s*<\/PermissionGuard>\s*\);\s*\{\/\*.*MODALS.*?\*\/\}',
    r'{/* MODALS */}',
    text
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
