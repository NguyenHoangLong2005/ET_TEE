#!/usr/bin/env python3
"""Sprint 7 - train lai dinh ky ca 3 model goi y, kiem tra roi moi dua len phuc vu.

    python scripts/pipeline/retrain.py                    # ca 3 model
    python scripts/pipeline/retrain.py --only fpgrowth    # mot model
    python scripts/pipeline/retrain.py --dry-run          # train + kiem tra, khong dua len
    python scripts/pipeline/retrain.py --force            # dua len du cong chat luong khong dat

Moi model:
  1. train vao scripts/pipeline/staging/<run>/<model>/ (khong dung vao model dang chay / bao cao chinh)
  2. CONG CHAT LUONG: metric test cua ban moi khong duoc kem ban dang chay qua mot nguong nho;
     SASRec con kiem tra file ONNX vua xuat xep hang giong het PyTorch (onnxruntime)
  3. dat: chep nguyen thu muc vao backend/models-live/<model>/ (doi ten mot lan, khong ghi de tung file);
     backend tu nap lai trong ~1 phut (ModelReloader). FP-Growth: thay luat trong association_rules
     (backend doc lai sau toi da 10 phut).
  4. ghi phien ban vao ai_model_versions (ban moi active, ban cu cung ten thanh inactive)

Luu y: metric hai lan chay do tren tap test KHAC NHAU (du lieu da them), nen cong nay chi chan ban
hong / tut ro rang, khong phai A/B test. Vector CLIP (Sprint 1) can GPU - pipeline chi canh bao so san
pham chua co vector, phan do chay tren Colab (scripts/embeddings/COLAB_README.md).
"""
import argparse
import json
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
LIVE = ROOT / 'backend' / 'models-live'
BUNDLED = ROOT / 'backend' / 'src' / 'main' / 'resources' / 'models'

sys.path.insert(0, str(ROOT / 'scripts' / 'embeddings'))
sys.path.insert(0, str(ROOT / 'scripts' / 'fpgrowth'))
from common import connect  # noqa: E402

# Bao nhieu duoc phep kem hon ban dang chay (cung don vi metric)
TOLERANCE = {'sasrec': 0.005, 'outfit': 0.010, 'fpgrowth': 0.030}
REGISTRY_NAME = {'sasrec': 'SASRec - Danh rieng cho ban (trang chu)',
                 'outfit': 'CSN outfit - Phoi tron bo (PDP)',
                 'fpgrowth': 'FP-Growth - Thuong duoc mua kem (gio hang)'}


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--only', default='sasrec,fpgrowth,outfit')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--force', action='store_true')
    p.add_argument('--sasrec-seeds', type=int, default=1)
    return p.parse_args()


def run(cmd):
    print('  $', ' '.join(str(c) for c in cmd), flush=True)
    t = time.time()
    res = subprocess.run([str(c) for c in cmd], cwd=ROOT, capture_output=True, text=True, encoding='utf-8',
                         errors='replace')
    if res.returncode != 0:
        raise RuntimeError(f"exit {res.returncode}\n{res.stdout[-2000:]}\n{res.stderr[-2000:]}")
    print(f"    xong sau {time.time() - t:.0f}s", flush=True)
    return res.stdout


def current_meta(model, marker):
    for base in (LIVE, BUNDLED):
        f = base / model / marker
        if f.is_file():
            return json.loads(f.read_text(encoding='utf-8')), str(f.parent)
    return None, None


def promote(model, staged: Path):
    """Doi ten thu muc mot lan: backend khong bao gio thay mot ban viet do dang."""
    LIVE.mkdir(parents=True, exist_ok=True)
    tmp, target, old = LIVE / f'.{model}.tmp', LIVE / model, LIVE / f'.{model}.old'
    for d in (tmp, old):
        if d.exists():
            shutil.rmtree(d)
    shutil.copytree(staged, tmp)
    if target.exists():
        target.rename(old)
    tmp.rename(target)
    if old.exists():
        shutil.rmtree(old)


def register(cur, model, version, description):
    name = REGISTRY_NAME[model]
    cur.execute("UPDATE ai_model_versions SET is_active = FALSE WHERE model_name = %s", (name,))
    cur.execute("""INSERT INTO ai_model_versions (model_name, version_string, is_active, description, created_at)
                   VALUES (%s, %s, TRUE, %s, now())""", (name, version[:255], description[:1000]))


def onnx_parity(model_dir: Path, parity_file: Path):
    """File ONNX vua xuat (chay bang onnxruntime) phai cho top-10 giong PyTorch luc xuat."""
    import onnxruntime as ort
    meta = json.loads((model_dir / 'items.json').read_text(encoding='utf-8'))
    index = {pid: i for i, pid in enumerate(meta['product_ids']) if i > 0}
    sess = ort.InferenceSession(str(model_dir / 'sasrec.onnx'))
    for case in json.loads(parity_file.read_text(encoding='utf-8')):
        seq = [index[p] for p in case['history'] if p in index][-meta['maxlen']:]
        x = np.zeros((1, meta['maxlen']), dtype=np.int64)
        x[0, meta['maxlen'] - len(seq):] = seq
        scores = sess.run(None, {'seq': x})[0][0]
        scores[0] = -np.inf
        top = [meta['product_ids'][i] for i in np.argsort(-scores)[:10]]
        if top != case['top10']:
            return False
    return True


def step_sasrec(stage: Path, args, log):
    out = stage / 'sasrec'
    run([sys.executable, '-u', 'scripts/sasrec/train.py', '--seeds', args.sasrec_seeds, '--model-dir', out,
         '--parity-file', out / 'parity.json', '--report-dir', out / 'report'])
    new = json.loads((out / 'items.json').read_text(encoding='utf-8'))
    old, where = current_meta('sasrec', 'items.json')
    new_v = new['test_metrics']['NDCG@10']['mean']
    old_v = old['test_metrics']['NDCG@10']['mean'] if old else None
    ok_parity = onnx_parity(out, out / 'parity.json')
    passed = ok_parity and (old_v is None or new_v >= old_v - TOLERANCE['sasrec'])
    log.append(('sasrec', 'NDCG@10', old_v, new_v, ok_parity, passed, where))
    version = f"SASRec CLIP-init @ {new['trained_at']}"
    desc = f"NDCG@10 test {new_v:.4f} (truoc {old_v if old_v is None else round(old_v, 4)}), " \
           f"{len(new['product_ids']) - 1} san pham, onnx parity {'OK' if ok_parity else 'LOI'}"
    return passed, out, version, desc


def step_outfit(stage: Path, args, log):
    out = stage / 'outfit'
    run([sys.executable, '-u', 'scripts/outfit/train_outfit.py', '--model-dir', out,
         '--parity-file', out / 'parity.json', '--report-dir', out / 'report'])
    new = json.loads((out / 'outfit.json').read_text(encoding='utf-8'))
    old, where = current_meta('outfit', 'outfit.json')
    new_v, old_v = new['test_metrics']['MRR'], (old['test_metrics']['MRR'] if old else None)
    passed = old_v is None or new_v >= old_v - TOLERANCE['outfit']
    log.append(('outfit', 'MRR', old_v, new_v, None, passed, where))
    version = f"CSN outfit @ {new['trained_at']}"
    desc = f"MRR test {new_v:.4f}, HR@10 {new['test_metrics']['HR@10']:.4f}, AUC {new['test_metrics']['AUC']:.4f}"
    return passed, out, version, desc


def step_fpgrowth(stage: Path, args, log):
    import mine_rules as mr
    out = stage / 'fpgrowth'
    out.mkdir(parents=True, exist_ok=True)
    sys_argv, sys.argv = sys.argv, [sys.argv[0]]       # mine_rules defaults, not this script's flags
    try:
        margs = mr.parse_args()
    finally:
        sys.argv = sys_argv
    baskets, products = mr.load()
    cut = int(len(baskets) * (1 - margs.test_share))
    _, _, seg, n = mr.evaluate(baskets[:cut], baskets[cut:], products, margs)
    rules = mr.mine(baskets, products, margs)
    new_v = seg['FP-Growth']
    prev = LIVE / 'fpgrowth' / 'report.json'
    old_v = json.loads(prev.read_text(encoding='utf-8'))['complement_segment_hit@3'] if prev.is_file() else None
    passed = len(rules) > 0 and (old_v is None or new_v >= old_v - TOLERANCE['fpgrowth'])
    version = f"fpgrowth-segment@{datetime.now():%Y%m%d%H%M}"
    (out / 'report.json').write_text(json.dumps({'version': version, 'rules': len(rules), 'orders': len(baskets),
                                                 'complement_segment_hit@3': new_v, 'samples': n},
                                                ensure_ascii=False, indent=2), encoding='utf-8')
    log.append(('fpgrowth', 'segment hit@3 (mon bo tro)', old_v, new_v, None, passed,
                str(prev.parent) if old_v is not None else None))
    desc = f"{len(rules)} luat nhom tren {len(baskets)} don; nhom dung trong top-3 (mon bo tro) {new_v:.4f}"
    return passed, out, version, desc, rules


def preflight():
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM user_behavior_events")
    events = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM orders WHERE status NOT IN ('CANCELLED', 'REFUNDED', 'RETURNED')")
    orders = cur.fetchone()[0]
    cur.execute("""SELECT count(*) FROM products p WHERE p.status = 'ACTIVE'
                   AND NOT EXISTS (SELECT 1 FROM product_embeddings e WHERE e.product_id = p.id)""")
    missing = cur.fetchone()[0]
    conn.close()
    return events, orders, missing


def main():
    args = parse_args()
    only = [m.strip() for m in args.only.split(',') if m.strip()]
    run_id = datetime.now().strftime('%Y%m%d-%H%M%S')
    stage = HERE / 'staging' / run_id
    stage.mkdir(parents=True, exist_ok=True)

    events, orders, missing = preflight()
    lines = [f"# Lan train lai {run_id}", '', f"- Du lieu: {events:,} su kien hanh vi, {orders:,} don hang."]
    if missing:
        lines.append(f"- **{missing} san pham ACTIVE chua co vector CLIP** -> khong vao duoc SASRec / phoi do. "
                     "Can chay lai notebook Sprint 1 tren Colab (GPU).")
    print('\n'.join(lines), flush=True)

    log, outcomes = [], []
    conn = None if args.dry_run else connect()
    for model in only:
        print(f"\n== {model} ==", flush=True)
        try:
            if model == 'sasrec':
                passed, out, version, desc = step_sasrec(stage, args, log)
            elif model == 'outfit':
                passed, out, version, desc = step_outfit(stage, args, log)
            elif model == 'fpgrowth':
                passed, out, version, desc, rules = step_fpgrowth(stage, args, log)
            else:
                raise ValueError(f'unknown model {model}')
        except Exception as e:  # noqa: BLE001 - one failing model must not stop the others
            outcomes.append((model, 'LOI', str(e).splitlines()[0][:200]))
            print(f"  LOI: {e}", flush=True)
            continue

        if args.dry_run or not (passed or args.force):
            outcomes.append((model, 'GIU BAN CU' if not passed else 'DRY-RUN', desc))
            continue
        cur = conn.cursor()
        if model == 'fpgrowth':
            import mine_rules as mr
            mr.write_rules(rules, version)
        promote(model, out)                              # fpgrowth: chi luu report de lan sau so sanh
        register(cur, model, version, desc + (' [force]' if not passed else ''))
        conn.commit()
        outcomes.append((model, 'DA DUA LEN' + (' (force)' if not passed else ''), desc))
    if conn:
        conn.close()

    lines += ['', '| Model | Metric | Ban dang chay | Ban moi | ONNX parity | Cong chat luong |', '|---|---|---:|---:|---|---|']
    for model, metric, old_v, new_v, parity, passed, _ in log:
        fmt = (lambda v: '-' if v is None else f'{v:.4f}')
        lines.append(f"| {model} | {metric} | {fmt(old_v)} | {fmt(new_v)} | "
                     f"{'-' if parity is None else ('OK' if parity else 'LOI')} | {'DAT' if passed else 'KHONG DAT'} |")
    lines += ['', '| Model | Ket qua | Chi tiet |', '|---|---|---|']
    lines += [f"| {m} | {r} | {d} |" for m, r, d in outcomes]
    report = '\n'.join(lines) + '\n'
    (stage / 'report.md').write_text(report, encoding='utf-8')
    (HERE / 'last_run.md').write_text(report, encoding='utf-8')
    print('\n' + report)
    sys.exit(1 if any(r == 'LOI' for _, r, _ in outcomes) else 0)


if __name__ == '__main__':
    main()
