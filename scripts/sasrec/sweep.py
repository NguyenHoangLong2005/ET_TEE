#!/usr/bin/env python3
"""Do sieu tham so SASRec tren tap VALID (khong dung test de chon). In NDCG@10 valid tung cau hinh.

    python scripts/sasrec/sweep.py
"""
import argparse
import itertools
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from data import leave_one_out, load_dataset  # noqa: E402
from train import parse_args, train_sasrec  # noqa: E402

GRID = {
    'maxlen': [20, 50],
    'dim': [64, 128],
    'dropout': [0.2, 0.4],
}


def main():
    sys.argv = sys.argv[:1]
    base = parse_args()
    ds = load_dataset()
    split = leave_one_out(ds)
    keys = list(GRID)
    for values in itertools.product(*GRID.values()):
        args = argparse.Namespace(**{**vars(base), **dict(zip(keys, values))})
        _, ndcg, epochs = train_sasrec(ds, split, args, seed=0, use_clip=True)
        print(f"{dict(zip(keys, values))}  valid NDCG@10 {ndcg:.4f}  ({epochs} epochs)", flush=True)


if __name__ == '__main__':
    main()
