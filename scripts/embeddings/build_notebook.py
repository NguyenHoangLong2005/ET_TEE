"""Sinh colab_product_embeddings.ipynb từ colab_product_embeddings.py (định dạng cell "# %%").

Bản .py là nguồn duy nhất; sửa .py rồi chạy lại script này để notebook không lệch với .py:

    python scripts/embeddings/build_notebook.py
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / 'colab_product_embeddings.py'
DST = HERE / 'colab_product_embeddings.ipynb'


def split_cells(text):
    cells, kind, buf = [], None, []
    for line in text.splitlines():
        m = re.match(r'^# %%( \[markdown\])?\s*$', line)
        if m:
            if kind:
                cells.append((kind, buf))
            kind, buf = ('markdown' if m.group(1) else 'code'), []
        elif kind:
            buf.append(line)
    if kind:
        cells.append((kind, buf))
    out = []
    for kind, lines in cells:
        while lines and not lines[0].strip():
            lines.pop(0)
        while lines and not lines[-1].strip():
            lines.pop()
        if kind == 'markdown':
            lines = [re.sub(r'^# ?', '', l) for l in lines]
        src = [l + '\n' for l in lines]
        if src:
            src[-1] = src[-1].rstrip('\n')
        cell = {'cell_type': kind, 'metadata': {}, 'source': src}
        if kind == 'code':
            cell.update(execution_count=None, outputs=[])
        out.append(cell)
    return out


def main():
    nb = {
        'nbformat': 4, 'nbformat_minor': 5,
        'metadata': {
            'accelerator': 'GPU',
            'colab': {'provenance': [], 'gpuType': 'T4', 'name': 'colab_product_embeddings.ipynb'},
            'kernelspec': {'name': 'python3', 'display_name': 'Python 3'},
            'language_info': {'name': 'python'},
        },
        'cells': split_cells(SRC.read_text(encoding='utf-8')),
    }
    for i, c in enumerate(nb['cells']):
        c['id'] = f'cell-{i:02d}'
    DST.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{DST.name}: {len(nb["cells"])} cells')


if __name__ == '__main__':
    main()
