import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Since it's currently broken as `title={log.userId ? # : log.actorId ? # : "System"}>`
old_broken = r'<span className="font-mono text-slate-500 text-[11px] truncate inline-block max-w-[150px] align-bottom" title=\{log\.userId \? # : log\.actorId \? # : "System"\}>'

new_str = '<span className="font-mono text-slate-500 text-[11px] truncate inline-block max-w-[150px] align-bottom" title={log.userId ? `#${log.userId}` : log.actorId ? `#${log.actorId}` : "System"}>'

text = re.sub(old_broken, new_str, text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed actor text!")
