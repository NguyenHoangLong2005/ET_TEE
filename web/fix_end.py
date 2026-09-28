file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\users\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the incorrect end of my render_str
text = text.replace('        </div>\n      </div>\n    </PermissionGuard>\n  );\n\n          {/*', '        </div>\n\n          {/*')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
