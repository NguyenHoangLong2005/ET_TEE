import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\components\layout\StaffHeader.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '<div className="flex items-center gap-1 shrink-0">',
    '<div className="flex items-center gap-1 shrink-0">\n          {/* Teleport target for page-specific actions */}\n          <div id="global-header-actions" className="flex items-center gap-2 mr-2 empty:hidden"></div>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Added portal target.")
