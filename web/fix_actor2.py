import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# We find the specific render function for Actor
pattern = r'header:\s*"Actor",\s*render:\s*\(log\)\s*=>\s*\(\s*<span[^>]*>.*?</span>'

replacement = '''header: "Actor",
        render: (log) => (
          <span className="font-mono text-slate-500 text-[11px] truncate inline-block max-w-[150px] align-bottom" title={log.userId ? `#${log.userId}` : log.actorId ? `#${log.actorId}` : "System"}>
            {log.userId ? `#${log.userId}` : log.actorId ? `#${log.actorId}` : "System"}
          </span>'''

text = re.sub(pattern, replacement, text, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Replaced whole actor block!")
