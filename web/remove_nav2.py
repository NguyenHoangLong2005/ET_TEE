import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\config\role-navigation.config.ts'
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "'/admin/monitoring'" in line or "'/admin/backup'" in line:
        continue
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Removed based on paths.')
