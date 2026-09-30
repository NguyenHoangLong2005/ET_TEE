import os
import sys
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

be_dir = r'c:\userdata\fashion-recommendation-system\backend\src\main\java\com\nguyenhoanglong\controller'
fe_dir = r'c:\userdata\fashion-recommendation-system\web\src'

endpoints = []

for root, dirs, files in os.walk(be_dir):
    for f in files:
        if f.endswith('.java'):
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as jf:
                content = jf.read()
            
            # Find class level RequestMapping
            class_match = re.search(r'@RequestMapping\(\s*(?:value\s*=\s*)?["\']([^"\']+)["\']', content)
            base_path = class_match.group(1) if class_match else ''
            
            # Find method level mappings
            pattern = re.compile(
                r'@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)(?:\(\s*(?:(?:value|path)\s*=\s*)?["\']?([^"\')\s]*)["\']?\s*\))?[\s\S]*?(?:public|protected)\s+[\w<>\[\],\s\?]+\s+(\w+)\s*\(',
                re.MULTILINE
            )
            
            for m in pattern.finditer(content):
                http_method = m.group(1).replace('Mapping', '').upper()
                sub_path = m.group(2) or ''
                sub_path = sub_path.strip('\"\'')
                method_name = m.group(3)
                
                full_path = (base_path.rstrip('/') + '/' + sub_path.lstrip('/')).rstrip('/')
                if not full_path.startswith('/'):
                    full_path = '/' + full_path
                
                rel_file = os.path.relpath(filepath, be_dir)
                endpoints.append({
                    'file': rel_file,
                    'class': f,
                    'http': http_method,
                    'path': full_path,
                    'method': method_name
                })

# Read all FE files into memory
fe_files_content = {}
for root, dirs, files in os.walk(fe_dir):
    for f in files:
        if f.endswith(('.ts', '.tsx', '.js', '.jsx')):
            filepath = os.path.join(root, f)
            rel = os.path.relpath(filepath, fe_dir)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as fe_f:
                    fe_files_content[rel] = fe_f.read()
            except Exception:
                pass

# Cross-reference endpoints against frontend
for ep in endpoints:
    # simplify path for regex search (e.g. /api/admin/users/{id} -> /api/admin/users)
    p = ep['path']
    # remove path variables
    p_base = re.sub(r'\{[^}]+\}', '', p).rstrip('/')
    
    matches = []
    for fe_rel, fe_text in fe_files_content.items():
        # check exact path or base path occurrence
        if p in fe_text:
            matches.append((fe_rel, 'exact'))
        elif len(p_base) > 6 and p_base in fe_text:
            matches.append((fe_rel, 'base'))
            
    ep['fe_matches'] = matches
    ep['is_used'] = len(matches) > 0

with open(r'c:\userdata\fashion-recommendation-system\scratch\endpoints_audit.json', 'w', encoding='utf-8') as out_f:
    json.dump(endpoints, out_f, indent=2, ensure_ascii=False)

print(f'Total endpoints: {len(endpoints)}')
used_count = sum(1 for ep in endpoints if ep['is_used'])
print(f'Used in FE: {used_count}')
print(f'Unused / Orphaned in FE: {len(endpoints) - used_count}')
