#!/usr/bin/env python3
"""Sprint 4 - Outfit Compatibility cho trang chi tiet san pham: "Phoi tron bo" ao + quan + phu kien.

    python scripts/outfit/train_outfit.py               # danh gia + xuat model cho backend
    python scripts/outfit/train_outfit.py --no-export

Mo hinh: Conditional Similarity Network (Veit et al. 2017; huong "type-aware" cua Vasileva et al. 2018
cho Polyvore). Vector CLIP 512 chieu (Sprint 1, co dinh) -> MLP chung -> 128 chieu; moi CAP VI TRI
(ao-quan, quan-phu kien, ...) co mot mat na rieng tren 128 chieu do:
    compat(a, b) = sum_k mask[vi_tri(a), vi_tri(b)][k] * g(a)[k] * g(b)[k]  + bias(b)
=> "hop nhau" khac "giong nhau": ao va quan hop nhau du anh khong giong nhau. bias(b) la muc do
duoc chon chung cua rieng mon b (thanh phan pho bien, chuan cua BPR).

Cap duong (train, truoc moc thoi gian): 2 mon khac vi tri cung 1 don hang; 2 lan xem lien tiep
cung phien, khac vi tri. Cap am: thay mon thu hai bang mon ngau nhien CUNG vi tri, cung nhom khach.
Loss BPR. Danh gia "fill in the blank": don hang SAU moc thoi gian, biet mon a, xep hang mon b that
trong toan bo ung vien cung vi tri / nhom khach (dung tap ung vien backend dung khi phuc vu).
"""
import argparse
import json
import random
import struct
import time
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'embeddings'))
from common import connect  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MODEL_DIR = ROOT / 'backend' / 'src' / 'main' / 'resources' / 'models' / 'outfit'
PARITY_FILE = ROOT / 'backend' / 'src' / 'test' / 'resources' / 'outfit' / 'parity.json'

# Vi tri trong bo do. homewear khong phoi (bo mac nha ban rieng).
SLOT_OF = {'tshirt': 'top', 'shirt': 'top', 'polo': 'top',
           'pants': 'bottom', 'shorts': 'bottom', 'skirt': 'bottom',
           'dress': 'dress', 'outerwear': 'outer', 'accessories': 'accessory'}
SLOTS = ['top', 'bottom', 'dress', 'outer', 'accessory']
# Vi tri can lap cho mot bo, theo vi tri cua mon dang xem (backend OutfitService dung lai bang nay)
TEMPLATE = {'top': ['bottom', 'outer', 'accessory'],
            'bottom': ['top', 'outer', 'accessory'],
            'dress': ['outer', 'accessory'],
            'outer': ['top', 'bottom', 'accessory'],
            'accessory': ['top', 'bottom']}
GROUPS = {'men', 'women', 'kids'}


def group_of(tg):
    g = (tg or '').lower()
    return g if g in GROUPS else 'unisex'


def compatible_groups(g):
    """Ung vien phoi cung: cung nhom khach hoac unisex (unisex thi phoi voi moi nhom)."""
    return {'men', 'women', 'kids', 'unisex'} if g == 'unisex' else {g, 'unisex'}


def pair_index(a: int, b: int) -> int:
    a, b = min(a, b), max(a, b)
    return a * len(SLOTS) + b


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--dim', type=int, default=128)
    p.add_argument('--hidden', type=int, default=256)
    p.add_argument('--epochs', type=int, default=60, help='toi da; dung som theo valid')
    p.add_argument('--lr', type=float, default=1e-3)
    p.add_argument('--weight-decay', type=float, default=1e-5)
    p.add_argument('--batch', type=int, default=512)
    p.add_argument('--negatives', type=int, default=4)
    p.add_argument('--test-share', type=float, default=0.2)
    p.add_argument('--seed', type=int, default=0)
    p.add_argument('--no-export', action='store_true')
    # retraining pipeline (scripts/pipeline/retrain.py): staging output, official report untouched
    p.add_argument('--model-dir', type=Path, default=None, help=f'default {MODEL_DIR}')
    p.add_argument('--parity-file', type=Path, default=None, help=f'default {PARITY_FILE}')
    p.add_argument('--report-dir', type=Path, default=None, help=f'default {HERE}')
    return p.parse_args()


def load():
    conn = connect()
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.target_group, p.product_type, COALESCE(p.sold_count, 0), pe.embedding::text
        FROM products p JOIN product_embeddings pe ON pe.product_id = p.id
        WHERE p.status = 'ACTIVE'
        ORDER BY p.id
    """)
    items = []
    for pid, tg, ptype, sold, vec in cur.fetchall():
        slot = SLOT_OF.get((ptype or '').lower())
        if slot:
            items.append((pid, group_of(tg), slot, np.array(json.loads(vec), dtype=np.float32)))
    cur.execute("""
        SELECT o.id, o.created_at, oi.product_id FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status NOT IN ('CANCELLED', 'REFUNDED', 'RETURNED') ORDER BY o.created_at
    """)
    order_rows = cur.fetchall()
    cur.execute("""
        SELECT session_id, product_id, created_at FROM user_behavior_events
        WHERE event_type = 'VIEW' AND session_id IS NOT NULL ORDER BY session_id, created_at, id
    """)
    view_rows = cur.fetchall()
    conn.close()
    return items, order_rows, view_rows


class CSN(nn.Module):
    def __init__(self, clip: torch.Tensor, slot_idx: torch.Tensor, hidden: int, dim: int):
        super().__init__()
        self.register_buffer('clip', clip)
        self.register_buffer('slot', slot_idx)
        self.g = nn.Sequential(nn.Linear(clip.shape[1], hidden), nn.ReLU(), nn.Linear(hidden, dim))
        self.mask_logit = nn.Parameter(torch.zeros(len(SLOTS) * len(SLOTS), dim))
        self.bias = nn.Parameter(torch.zeros(clip.shape[0]))

    def masks(self):
        return F.softplus(self.mask_logit)

    def embed(self, idx=None):
        x = self.clip if idx is None else self.clip[idx]
        return F.normalize(self.g(x), dim=-1)

    def score(self, a, b):
        sa, sb = self.slot[a], self.slot[b]
        pair = torch.minimum(sa, sb) * len(SLOTS) + torch.maximum(sa, sb)
        return (self.masks()[pair] * self.embed(a) * self.embed(b)).sum(-1) + self.bias[b]


def train_csn(clip, slot, group, pool, positives, args, epochs, eval_fn=None, eval_every=5, patience=3):
    """BPR. Co eval_fn: dung som theo MRR valid, tra ve (model tot nhat, so epoch tot nhat)."""
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    model = CSN(clip, torch.as_tensor(slot), args.hidden, args.dim)
    opt = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    pos = torch.as_tensor(positives)
    best, best_state, best_epoch, bad = -1.0, None, epochs, 0
    t0 = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        perm = torch.randperm(len(pos))
        for s in range(0, len(perm), args.batch):
            batch = pos[perm[s:s + args.batch]]
            a, b = batch[:, 0], batch[:, 1]
            # am: cung vi tri va cung nhom khach voi b (kho hon am ngau nhien toan catalog)
            neg = torch.as_tensor([[random.choice(pool[(slot[bi], group[bi])]) for _ in range(args.negatives)]
                                   for bi in b.tolist()])
            sp = model.score(a, b)
            sn = model.score(a.unsqueeze(1).expand_as(neg), neg)
            loss = -F.logsigmoid(sp.unsqueeze(1) - sn).mean()
            opt.zero_grad()
            loss.backward()
            opt.step()
        if eval_fn is not None and epoch % eval_every == 0:
            mrr = eval_fn(scorer_of(model, slot))['MRR']
            print(f"  epoch {epoch}: valid MRR {mrr:.4f} ({time.time() - t0:.0f}s)", flush=True)
            if mrr > best:
                best, best_epoch, bad = mrr, epoch, 0
                best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
            else:
                bad += 1
                if bad >= patience:
                    break
    if best_state is not None:
        model.load_state_dict(best_state)
    return model, best_epoch


def scorer_of(model, slot):
    model.eval()
    with torch.no_grad():
        emb = model.embed().numpy()
        masks = model.masks().numpy()
        bias = model.bias.detach().numpy()

    def score(a, cand):
        m = masks[pair_index(slot[a], slot[cand[0]])]
        return (emb[cand] * m) @ emb[a] + bias[cand]
    score.arrays = (emb, masks, bias)
    return score


def main():
    global MODEL_DIR, PARITY_FILE, HERE
    args = parse_args()
    MODEL_DIR = args.model_dir or MODEL_DIR
    PARITY_FILE = args.parity_file or PARITY_FILE
    HERE = args.report_dir or HERE
    HERE.mkdir(parents=True, exist_ok=True)
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.set_num_threads(4)        # mac dinh tren Windows tao qua nhieu luong, cham hon ca chuc lan

    items, order_rows, view_rows = load()
    index = {pid: i for i, (pid, _, _, _) in enumerate(items)}
    group = [g for _, g, _, _ in items]
    slot = [SLOTS.index(s) for _, _, s, _ in items]
    clip = torch.as_tensor(np.stack([v for *_, v in items]))
    pool = defaultdict(list)                                  # (slot, group) -> item idx
    for i in range(len(items)):
        pool[(slot[i], group[i])].append(i)

    orders = defaultdict(lambda: [None, []])
    for oid, at, pid in order_rows:
        if pid in index:
            orders[oid][0] = at
            orders[oid][1].append(index[pid])
    orders = sorted((v for v in orders.values() if v[1]), key=lambda v: v[0])
    # thoi gian: [.. valid_cut) train | [valid_cut, test_cut) valid | [test_cut ..) test
    test_cut = orders[int(len(orders) * (1 - args.test_share))][0]
    valid_cut = orders[int(len(orders) * (1 - 2 * args.test_share))][0]

    def pairs_of(basket):
        uniq = list(dict.fromkeys(basket))
        return [(a, b) for a in uniq for b in uniq
                if a != b and slot[a] != slot[b] and group[b] in compatible_groups(group[a])]

    def positives(until):
        """Cap duong co truoc moc `until`: cung don + xem lien tiep cung phien khac vi tri."""
        out = [p for at, b in orders if at < until for p in pairs_of(b)]
        n_orders = len(out)
        prev = (None, None)
        for sid, pid, at in view_rows:
            i = index.get(pid)
            if i is not None and prev[0] == sid and at < until and prev[1] is not None \
                    and slot[prev[1]] != slot[i] and group[i] in compatible_groups(group[prev[1]]):
                out += [(prev[1], i), (i, prev[1])]
            prev = (sid, i)
        return out, n_orders

    def order_pairs(lo, hi):
        return [p for at, b in orders if lo <= at < hi for p in pairs_of(b)]

    far_future = orders[-1][0] + (orders[-1][0] - orders[0][0])
    valid_pos = order_pairs(valid_cut, test_cut)
    test_pos = order_pairs(test_cut, far_future)
    train_pos, n_order_pairs = positives(valid_cut)
    print(f"{len(items)} san pham co the phoi; train: {n_order_pairs} cap tu don + "
          f"{len(train_pos) - n_order_pairs} cap xem lien tiep (truoc {valid_cut:%Y-%m-%d}); "
          f"valid {len(valid_pos)} cap, test {len(test_pos)} cap (don tu {test_cut:%Y-%m-%d})")

    sold_before_test = np.zeros(len(items))
    for at, b in orders:
        if at < test_cut:
            for i in b:
                sold_before_test[i] += 1

    def candidates(a, target_slot):
        return [c for g in compatible_groups(group[a]) for c in pool[(target_slot, g)] if c != a]

    def evaluate(score_fn, pairs, k=10):
        hits, mrr, auc = [], [], []
        for a, b in pairs:
            cand = candidates(a, slot[b])
            s = score_fn(a, cand)
            rank = int((s >= s[cand.index(b)]).sum())         # bi quan khi bang diem
            hits.append(rank <= k)
            mrr.append(1.0 / rank)
            auc.append(1.0 - (rank - 1) / max(len(cand) - 1, 1))
        return {'HR@10': float(np.mean(hits)), 'MRR': float(np.mean(mrr)), 'AUC': float(np.mean(auc)),
                'n': len(pairs)}

    def coverage(score_fn):
        """So mon KHAC NHAU dung dau mot vi tri khi xem lan luot moi san pham: bo goi y co doi theo
        san pham khong, hay moi san pham cung nhom deu nhan cung mot bo."""
        firsts = set()
        for a in range(len(items)):
            for target in TEMPLATE[SLOTS[slot[a]]]:
                cand = candidates(a, SLOTS.index(target))
                if cand:
                    firsts.add(cand[int(np.argmax(score_fn(a, cand)))])
        return len(firsts)

    clip_np = clip.numpy()
    rng = np.random.default_rng(args.seed)

    def popular(a, c):
        return sold_before_test[c] + 1e-6 * rng.random(len(c))

    def cosine(a, c):
        return clip_np[c] @ clip_np[a]

    results = {
        'Ngau nhien (ky vong)': {
            'HR@10': float(np.mean([min(10, len(candidates(a, slot[b]))) / len(candidates(a, slot[b]))
                                    for a, b in test_pos])),
            'MRR': float('nan'), 'AUC': 0.5, 'coverage': None},
        'Ban chay trong vi tri': {**evaluate(popular, test_pos), 'coverage': coverage(popular)},
        'CLIP giong nhau (cosine)': {**evaluate(cosine, test_pos), 'coverage': coverage(cosine)},
    }

    model, best_epoch = train_csn(clip, slot, group, pool, train_pos, args, args.epochs,
                                  eval_fn=lambda f: evaluate(f, valid_pos))
    csn = scorer_of(model, slot)
    results['CSN tren CLIP (Sprint 4)'] = {**evaluate(csn, test_pos), 'coverage': coverage(csn)}
    print(f"So epoch chon theo valid: {best_epoch}")

    write_report(results, args, len(items), n_order_pairs, len(train_pos), valid_cut, test_cut, best_epoch)
    if not args.no_export:
        # ban phuc vu: hoc lai tren TOAN BO du lieu voi so epoch da chon
        full_pos, _ = positives(far_future)
        final, _ = train_csn(clip, slot, group, pool, full_pos, args, best_epoch)
        emb, masks, bias = scorer_of(final, slot).arrays
        export(items, emb, masks, bias, args, results['CSN tren CLIP (Sprint 4)'])


def write_report(results, args, n_items, n_order_pairs, n_train, valid_cut, test_cut, best_epoch):
    lines = ['# Sprint 4 - Outfit Compatibility: ket qua offline', '',
             f"Sinh luc {datetime.now():%Y-%m-%d %H:%M} boi `scripts/outfit/train_outfit.py`.", '',
             f"- {n_items} san pham ACTIVE co vector CLIP va thuoc vi tri phoi duoc (ao / quan / dam / ao khoac / phu kien).",
             f"- Train: {n_order_pairs} cap cung don + {n_train - n_order_pairs} cap xem lien tiep cung phien, "
             f"truoc {valid_cut:%Y-%m-%d}. Valid (chon so epoch = {best_epoch}): don tu {valid_cut:%Y-%m-%d}. "
             f"Test: don tu {test_cut:%Y-%m-%d}.",
             '- Fill-in-the-blank: biet mon a, xep hang mon b that trong TOAN BO ung vien cung vi tri va nhom khach.',
             '- Do phu: so mon khac nhau dung dau mot vi tri khi xem lan luot tung san pham '
             '(cao = bo phoi doi theo san pham).',
             '- **Hanh vi va don hang la du lieu mo phong** (`scripts/generate_synthetic_data.py`).', '',
             '| Mo hinh | HR@10 | MRR | AUC | Do phu top-1 |', '|---|---:|---:|---:|---:|']
    for name, r in results.items():
        cov = '-' if r.get('coverage') is None else str(r['coverage'])
        lines.append(f"| {name} | {r['HR@10']:.4f} | {r['MRR']:.4f} | {r['AUC']:.4f} | {cov} |")
    (HERE / 'results.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines))


def write_parity_fixture(n_cases: int = 8):
    """Tu CHINH cac file da xuat: diem compat cua vai cap -> test Java (OutfitModelParityTest)."""
    meta = json.loads((MODEL_DIR / 'outfit.json').read_text(encoding='utf-8'))
    dim, n = meta['dim'], len(meta['product_ids'])
    emb = np.fromfile(MODEL_DIR / 'outfit.bin', dtype='<f4').reshape(n, dim)
    masks, bias = np.array(meta['masks']), np.array(meta['bias'])
    slots = [SLOTS.index(s) for s in meta['item_slots']]
    rng = np.random.default_rng(1)
    cases = []
    while len(cases) < n_cases:
        a, b = (int(x) for x in rng.integers(0, n, 2))
        if slots[a] == slots[b]:
            continue
        score = float((masks[pair_index(slots[a], slots[b])] * emb[a] * emb[b]).sum() + bias[b])
        cases.append({'a': meta['product_ids'][a], 'b': meta['product_ids'][b], 'compat': score})
    PARITY_FILE.parent.mkdir(parents=True, exist_ok=True)
    PARITY_FILE.write_text(json.dumps(cases), encoding='utf-8')


def export(items, emb, masks, bias, args, metrics):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    # float32 little-endian, hang i = vector da chieu cua product_ids[i]
    with open(MODEL_DIR / 'outfit.bin', 'wb') as f:
        f.write(struct.pack(f'<{emb.size}f', *emb.astype(np.float32).ravel()))
    meta = {
        'model': 'CSN outfit compatibility on CLIP',
        'trained_at': datetime.now().isoformat(timespec='seconds'),
        'dim': int(emb.shape[1]),
        'slots': SLOTS,
        'slot_of_type': SLOT_OF,
        'template': TEMPLATE,
        # masks[pair] voi pair = min(slot_a, slot_b) * len(slots) + max(...)
        'masks': [[round(float(x), 6) for x in row] for row in masks],
        'product_ids': [int(pid) for pid, *_ in items],
        'groups': [g for _, g, _, _ in items],
        'item_slots': [s for _, _, s, _ in items],
        'bias': [round(float(x), 6) for x in bias],
        'test_metrics': metrics,
    }
    (MODEL_DIR / 'outfit.json').write_text(json.dumps(meta), encoding='utf-8')
    write_parity_fixture()
    print(f"Exported {MODEL_DIR / 'outfit.bin'} ({(MODEL_DIR / 'outfit.bin').stat().st_size / 1e6:.1f} MB) + outfit.json")


if __name__ == '__main__':
    main()
