import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Make Monitoring Block headers match StatCard: text-[11px] font-bold text-slate-400 uppercase
text = text.replace('text-xs font-bold text-slate-500 uppercase', 'text-[11px] font-bold text-slate-400 uppercase')

# Make Uptime value match StatCard value: text-2xl font-bold text-slate-900 leading-none
text = text.replace('text-2xl font-black text-slate-900 mt-2', 'text-2xl font-bold text-slate-900 leading-none mt-2')
# (also db and memory have small values: text-sm font-black text-slate-900 -> font-bold)
text = text.replace('text-sm font-black text-slate-900', 'text-sm font-bold text-slate-900')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed admin dashboard.")
