import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\config\role-navigation.config.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the two items from ADMIN_NAV_GROUPS
# { label: 'Giám sát Hệ tầng', path: '/admin/monitoring', icon: Activity, allowedRoles: ['ADMIN'] },
# { label: 'Sao lưu Dữ liệu', path: '/admin/backup', icon: HardDrive, allowedRoles: ['ADMIN'] },

text = re.sub(r"\s*\{\s*label:\s*'Giám sát Hệ tầng'.*?\},", "", text)
text = re.sub(r"\s*\{\s*label:\s*'Sao lưu Dữ liệu'.*?\},", "", text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Done')
