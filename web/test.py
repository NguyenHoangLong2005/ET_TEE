import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

print("File len:", len(text))
