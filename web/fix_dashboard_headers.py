import os
import re

directory = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)'

# We will walk the directory and find all page.tsx files inside dashboard folders.
for root, dirs, files in os.walk(directory):
    if 'page.tsx' in files and ('dashboard' in root or 'store-owner' in root or 'admin' in root):
        file_path = os.path.join(root, 'page.tsx')
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()

        changed = False

        # 1. Standardize section headers:
        # e.g., <h2 className="text-lg font-bold text-slate-900
        # or <h3 className="font-bold text-slate-900
        # Standard: text-sm font-semibold text-slate-900
        
        # We find <h2 or <h3 with className="... text-slate-900 ..."
        
        def replace_header(match):
            tag = match.group(1) # h2 or h3
            classes = match.group(2)
            if 'text-slate-900' in classes and ('font-bold' in classes or 'font-semibold' in classes or 'font-black' in classes):
                # Standardize
                if 'flex' in classes:
                    new_classes = 'text-sm font-semibold text-slate-900 flex items-center gap-2' + (' mb-5' if 'mb-5' in classes else '') + (' mb-6' if 'mb-6' in classes else '')
                else:
                    new_classes = 'text-sm font-semibold text-slate-900' + (' mb-5' if 'mb-5' in classes else '') + (' mb-6' if 'mb-6' in classes else '')
                return f'<{tag} className="{new_classes}">'
            return match.group(0)

        new_text = re.sub(r'<(h[23]) className="([^"]+)">', replace_header, text)
        if new_text != text:
            changed = True
            text = new_text
            
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"Fixed headers in {file_path}")

print("Done.")
