#!/usr/bin/env python3
"""Sprint 2 - huan luyen va danh gia SASRec cho cum "Danh rieng cho ban" o trang chu.

    python scripts/sasrec/train.py                 # danh gia baseline + 2 bien the SASRec (3 seed), xuat ONNX
    python scripts/sasrec/train.py --seeds 1 --no-export

Chay CPU duoc (vai phut): ~800 user, ~3k san pham. Ket qua ghi vao scripts/sasrec/results.md / .json;
model tot nhat (CLIP-init) xuat ra backend/src/main/resources/models/sasrec/ de backend phuc vu.
"""
import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).resolve().parent))
from baselines import ClipRecent, MarkovChain, Popularity, rank_metrics  # noqa: E402
from data import leave_one_out, load_dataset, load_session_truth  # noqa: E402
from model import SASRec, pad_left  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MODEL_DIR = ROOT / 'backend' / 'src' / 'main' / 'resources' / 'models' / 'sasrec'
PARITY_FILE = ROOT / 'backend' / 'src' / 'test' / 'resources' / 'sasrec' / 'parity.json'


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--maxlen', type=int, default=50)
    p.add_argument('--dim', type=int, default=128)   # chon bang sweep.py tren VALID
    p.add_argument('--blocks', type=int, default=2)
    p.add_argument('--dropout', type=float, default=0.4)
    p.add_argument('--lr', type=float, default=1e-3)
    p.add_argument('--weight-decay', type=float, default=1e-4)
    p.add_argument('--batch', type=int, default=128)
    p.add_argument('--max-epochs', type=int, default=300)
    p.add_argument('--patience', type=int, default=6, help='so lan danh gia valid khong tien bo thi dung')
    p.add_argument('--eval-every', type=int, default=5)
    p.add_argument('--seeds', type=int, default=3)
    p.add_argument('--no-export', action='store_true')
    p.add_argument('--threads', type=int, default=4)
    # retraining pipeline (scripts/pipeline/retrain.py): train into a staging area, leave the official
    # report and the bundled model alone
    p.add_argument('--model-dir', type=Path, default=None, help=f'default {MODEL_DIR}')
    p.add_argument('--parity-file', type=Path, default=None, help=f'default {PARITY_FILE}')
    p.add_argument('--report-dir', type=Path, default=None, help=f'default {HERE}')
    return p.parse_args()


def scores_of(model: SASRec, inputs, maxlen: int, batch: int = 512) -> np.ndarray:
    model.eval()
    out = []
    with torch.no_grad():
        for i in range(0, len(inputs), batch):
            x = torch.as_tensor(pad_left(inputs[i:i + batch], maxlen))
            out.append(model(x).numpy())
    return np.concatenate(out)


def train_sasrec(ds, split, args, seed: int, use_clip: bool):
    torch.manual_seed(seed)
    np.random.seed(seed)
    model = SASRec(ds.n_items, args.maxlen, args.dim, args.blocks, 1, args.dropout,
                   clip=ds.clip if use_clip else None)
    opt = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    seqs = [s for s in split.train if len(s) >= 2]
    x_all = pad_left([s[:-1] for s in seqs], args.maxlen)
    y_all = pad_left([s[1:] for s in seqs], args.maxlen)

    best, best_state, bad, epoch = -1.0, None, 0, 0
    for epoch in range(1, args.max_epochs + 1):
        model.train()
        order = np.random.permutation(len(seqs))
        for i in range(0, len(order), args.batch):
            idx = order[i:i + args.batch]
            x, y = torch.as_tensor(x_all[idx]), torch.as_tensor(y_all[idx])
            items = model.item_matrix()
            h = model.encode(x, items)
            logits = h @ items.T                               # [B, L, N+1]
            loss = F.cross_entropy(logits.reshape(-1, logits.shape[-1]), y.reshape(-1), ignore_index=0)
            opt.zero_grad()
            loss.backward()
            opt.step()
        if epoch % args.eval_every == 0:
            _, ndcg, _ = rank_metrics(scores_of(model, split.valid_input, args.maxlen), split.valid_target)
            if ndcg.mean() > best:
                best, bad = ndcg.mean(), 0
                best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
            else:
                bad += 1
                if bad >= args.patience:
                    break
    model.load_state_dict(best_state)
    return model, best, epoch


def summarize(hit, ndcg, mrr, mask=None):
    if mask is not None:
        hit, ndcg, mrr = hit[mask], ndcg[mask], mrr[mask]
    return {'HR@10': float(hit.mean()), 'NDCG@10': float(ndcg.mean()), 'MRR': float(mrr.mean()), 'n': int(len(hit))}


def export(model: SASRec, ds, args, metrics: dict):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.eval()

    class Scorer(torch.nn.Module):
        """seq [B, maxlen] int64, pad 0 ben trai -> diem [B, N+1]; ma tran item da tinh san thanh hang so."""

        def __init__(self, m: SASRec):
            super().__init__()
            self.m = m
            self.register_buffer('items', m.item_matrix().detach())

        def forward(self, seq):
            h = self.m.encode(seq, self.items)[:, -1, :]
            return h @ self.items.T

    scorer = Scorer(model).eval()
    dummy = torch.as_tensor(pad_left([[1, 2, 3]], args.maxlen))
    onnx_path = MODEL_DIR / 'sasrec.onnx'
    torch.onnx.export(scorer, (dummy,), str(onnx_path), input_names=['seq'], output_names=['scores'],
                      dynamic_axes={'seq': {0: 'batch'}, 'scores': {0: 'batch'}}, opset_version=17,
                      dynamo=False)
    meta = {
        'model': 'SASRec (CLIP-init)',
        'trained_at': datetime.now().isoformat(timespec='seconds'),
        'maxlen': args.maxlen,
        'dim': args.dim,
        'blocks': args.blocks,
        'event_types': ['VIEW', 'ADD_TO_CART', 'PURCHASE'],
        'test_metrics': metrics,
        # index i cua output = product_ids[i]; index 0 la padding
        'product_ids': [int(x) for x in ds.product_ids],
    }
    (MODEL_DIR / 'items.json').write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')

    # Fixture cho test Java: cung dau vao phai ra cung top-10 voi PyTorch
    rng = np.random.default_rng(0)
    cases = []
    for u in rng.choice(len(ds.sequences), 5, replace=False):
        seq = ds.sequences[u][-args.maxlen:]
        with torch.no_grad():
            s = scorer(torch.as_tensor(pad_left([seq], args.maxlen)))[0].numpy()
        s[0] = -np.inf
        top = np.argsort(-s)[:10]
        cases.append({'history': [int(ds.product_ids[i]) for i in seq],
                      'top10': [int(ds.product_ids[i]) for i in top]})
    PARITY_FILE.parent.mkdir(parents=True, exist_ok=True)
    PARITY_FILE.write_text(json.dumps(cases), encoding='utf-8')
    print(f"Exported {onnx_path} ({onnx_path.stat().st_size / 1e6:.1f} MB), items.json, parity fixture")


def main():
    global MODEL_DIR, PARITY_FILE, HERE
    args = parse_args()
    MODEL_DIR = args.model_dir or MODEL_DIR
    PARITY_FILE = args.parity_file or PARITY_FILE
    HERE = args.report_dir or HERE
    HERE.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(args.threads)   # Windows default oversubscribes the CPU (see scripts/outfit)
    t0 = time.time()
    ds = load_dataset()
    split = leave_one_out(ds)
    truth = load_session_truth(ROOT / 'scripts' / 'synthetic_data.sessions.jsonl')
    shifted = np.array([bool(truth.get(ds.last_session[u], {}).get('shift_at')) for u in split.test_user])
    short = np.array([len(x) <= 10 for x in split.test_input])
    print(f"{ds.n_items} items, {len(ds.sequences)} users, {sum(map(len, ds.sequences))} tokens, "
          f"{len(split.test_target)} test users ({shifted.sum()} with an intent shift in the final session)")

    # Baseline hoc tren dung phan SASRec duoc hoc (split.train); luc du doan ca hai deu nhin toan bo
    # lich su truoc token test (test_input).
    history = split.train
    results = {}

    def evaluate(name, scorer_fn):
        hit, ndcg, mrr = rank_metrics(scorer_fn(split.test_input), split.test_target)
        results.setdefault(name, []).append({
            'all': summarize(hit, ndcg, mrr),
            'intent_shift': summarize(hit, ndcg, mrr, shifted),
            'short_history': summarize(hit, ndcg, mrr, short),
        })

    for b in (Popularity(ds.n_items, history), MarkovChain(ds.n_items, history), ClipRecent(ds.clip, 5)):
        evaluate(b.name, b.score)

    best_clip_model, best_clip_valid = None, -1
    for use_clip, name in ((False, 'SASRec (random init)'), (True, 'SASRec (CLIP-init)')):
        for seed in range(args.seeds):
            model, valid_ndcg, epochs = train_sasrec(ds, split, args, seed, use_clip)
            print(f"  {name} seed {seed}: valid NDCG@10 {valid_ndcg:.4f} after {epochs} epochs")
            evaluate(name, lambda inp, m=model: scores_of(m, inp, args.maxlen))
            if use_clip and valid_ndcg > best_clip_valid:
                best_clip_model, best_clip_valid = model, valid_ndcg

    report = {}
    for name, runs in results.items():
        report[name] = {}
        for seg in ('all', 'intent_shift', 'short_history'):
            vals = {m: [r[seg][m] for r in runs] for m in ('HR@10', 'NDCG@10', 'MRR')}
            report[name][seg] = {m: {'mean': float(np.mean(v)), 'std': float(np.std(v))} for m, v in vals.items()}
            report[name][seg]['n'] = runs[0][seg]['n']
            report[name][seg]['runs'] = len(runs)

    write_report(report, ds, split, shifted, args, time.time() - t0)
    if not args.no_export:
        export(best_clip_model, ds, args, report['SASRec (CLIP-init)']['all'])


def write_report(report, ds, split, shifted, args, seconds):
    (HERE / 'results.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

    def cell(seg, m):
        s = seg[m]
        return f"{s['mean']:.4f}" + (f" ± {s['std']:.4f}" if seg['runs'] > 1 else '')

    lines = [
        '# Sprint 2 - Ket qua danh gia offline',
        '',
        f"Sinh luc {datetime.now():%Y-%m-%d %H:%M} boi `scripts/sasrec/train.py` ({seconds / 60:.1f} phut, CPU).",
        '',
        f"- Du lieu: {len(ds.sequences)} user, {ds.n_items} san pham ACTIVE co vector CLIP, "
        f"{sum(map(len, ds.sequences)):,} token (VIEW / ADD_TO_CART / PURCHASE, gop su kien lien tiep cung mon).",
        '- **Su kien la du lieu mo phong** (`scripts/generate_synthetic_data.py`), khong phai hanh vi khach that.',
        '- Giao thuc: leave-one-out theo user (token cuoi = test, ke cuoi = valid), xep hang tren TOAN BO catalog '
        '(khong lay mau am), diem bang nhau tinh bi quan.',
        f"- SASRec: maxlen {args.maxlen}, dim {args.dim}, {args.blocks} block, 1 head, dropout {args.dropout}, "
        f"cross-entropy toan catalog, early stopping theo NDCG@10 valid; trung binh ± do lech chuan qua {args.seeds} seed.",
        '',
    ]
    segments = [('all', f'Tat ca user ({len(split.test_target)})'),
                ('intent_shift', f'Phien cuoi co doi y dinh ({int(shifted.sum())})'),
                ('short_history', 'Lich su ngan (<= 10 token)')]
    for seg, title in segments:
        lines += [f'## {title}', '', '| Mo hinh | HR@10 | NDCG@10 | MRR |', '|---|---:|---:|---:|']
        for name, segs in report.items():
            s = segs[seg]
            lines.append(f"| {name} | {cell(s, 'HR@10')} | {cell(s, 'NDCG@10')} | {cell(s, 'MRR')} |")
        lines.append('')
    (HERE / 'results.md').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
