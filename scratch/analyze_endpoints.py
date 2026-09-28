import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\userdata\fashion-recommendation-system\scratch\endpoints_audit.json', 'r', encoding='utf-8') as f:
    endpoints = json.load(f)

by_controller = {}
for ep in endpoints:
    c = ep['class']
    by_controller.setdefault(c, []).append(ep)

print('=== ORPHANED / UNUSED ENDPOINTS BY CONTROLLER ===')
for c, eps in sorted(by_controller.items()):
    unused = [e for e in eps if not e['is_used']]
    if unused:
        print(f"\n{c} ({len(unused)}/{len(eps)} unused):")
        for e in unused:
            print(f"  {e['http']:<6} {e['path']:<50} ({e['method']})")
