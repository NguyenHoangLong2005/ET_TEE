#!/usr/bin/env python3
"""Sprint 3 - FP-Growth: luat "thuong duoc mua kem" cho trang Gio hang va popup them gio.

    python scripts/fpgrowth/mine_rules.py              # danh gia (chia theo thoi gian) + ghi luat vao DB
    python scripts/fpgrowth/mine_rules.py --dry-run    # chi danh gia, khong ghi DB

Vi sao khai pha o muc NHOM (target_group:product_type) chu khong o muc san pham: ~1.7k don, chi
~670 don co >= 2 mon va chi vai chuc cap san pham xuat hien cung nhau >= 2 lan - luat tung mon gan
nhu khong ton tai. Luat nhom ("quan nam -> phu kien") on dinh; mon cu the duoc chon sau trong nhom
ket qua (gia vua phai, ban chay) - cung quy tac voi backend AssociationRuleService.
"""
import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from mlxtend.frequent_patterns import association_rules, fpgrowth
from mlxtend.preprocessing import TransactionEncoder

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'embeddings'))
from common import connect  # noqa: E402

HERE = Path(__file__).resolve().parent
GROUPS = {'men', 'women', 'kids'}


def segment(target_group, product_type) -> str:
    """Giong AssociationRuleService.segmentOf(): nhom khong ro (accessories, family, null) -> unisex."""
    g = (target_group or '').lower()
    return f"{g if g in GROUPS else 'unisex'}:{(product_type or 'other').lower()}"


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--min-support', type=float, default=0.004)
    p.add_argument('--min-confidence', type=float, default=0.05)
    p.add_argument('--min-lift', type=float, default=1.1)
    p.add_argument('--max-antecedent', type=int, default=2)
    p.add_argument('--test-share', type=float, default=0.2, help='phan don MOI NHAT dung de danh gia')
    p.add_argument('--dry-run', action='store_true')
    return p.parse_args()


def load():
    conn = connect()
    cur = conn.cursor()
    cur.execute("""
        SELECT o.id, o.created_at, oi.product_id, oi.quantity
        FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status NOT IN ('CANCELLED', 'REFUNDED', 'RETURNED')
        ORDER BY o.created_at, o.id
    """)
    lines = cur.fetchall()
    cur.execute("""
        SELECT id, target_group, product_type, COALESCE(NULLIF(sale_price, 0), price)::float, status
        FROM products
    """)
    products = {r[0]: {'segment': segment(r[1], r[2]), 'price': r[3] or 0.0, 'active': r[4] == 'ACTIVE'}
                for r in cur.fetchall()}
    conn.close()
    orders = defaultdict(lambda: {'at': None, 'items': []})
    for oid, at, pid, qty in lines:
        if pid in products:
            orders[oid]['at'] = at
            orders[oid]['items'].append(pid)
    baskets = [o for o in orders.values() if o['items']]
    baskets.sort(key=lambda o: o['at'])
    return baskets, products


def mine(baskets, products, args) -> pd.DataFrame:
    tx = [sorted({products[p]['segment'] for p in b['items']}) for b in baskets]
    enc = TransactionEncoder()
    df = pd.DataFrame(enc.fit(tx).transform(tx), columns=enc.columns_)
    freq = fpgrowth(df, min_support=args.min_support, use_colnames=True, max_len=args.max_antecedent + 1)
    if freq.empty:
        return pd.DataFrame(columns=['antecedents', 'consequents', 'support', 'confidence', 'lift'])
    rules = association_rules(freq, num_itemsets=len(df), metric='lift', min_threshold=args.min_lift)
    rules = rules[(rules['consequents'].apply(len) == 1)
                  & (rules['antecedents'].apply(len) <= args.max_antecedent)
                  & (rules['confidence'] >= args.min_confidence)]
    return rules.sort_values(['lift', 'confidence'], ascending=False).reset_index(drop=True)


class Recommender:
    """Cung thuat toan voi backend: luat khop gio -> nhom de xuat -> mon cu the trong nhom."""

    def __init__(self, rules: pd.DataFrame, products: dict, sold: Counter, max_segments: int = 3,
                 price_ceiling: bool = True):
        self.price_ceiling = price_ceiling
        self.rules = [(frozenset(r.antecedents), next(iter(r.consequents)), r.confidence, r.lift)
                      for r in rules.itertuples()]
        self.products = products
        self.max_segments = max_segments
        by_seg = defaultdict(list)
        for pid, p in products.items():
            if p['active']:
                by_seg[p['segment']].append(pid)
        # ban chay truoc, hoa thi id nho truoc (on dinh, giong ORDER BY sold_count DESC, id)
        self.by_segment = {s: sorted(ids, key=lambda i: (-sold.get(i, 0), i)) for s, ids in by_seg.items()}
        seg_sold = Counter()
        for pid, c in sold.items():
            if pid in products:
                seg_sold[products[pid]['segment']] += c
        self.popular_segments = [s for s, _ in seg_sold.most_common()]

    def rule_segments(self, cart_segs):
        best = {}
        for ante, cons, conf, lift in self.rules:
            if cons in cart_segs or not ante <= cart_segs:
                continue
            score = conf * lift
            if score > best.get(cons, 0):
                best[cons] = score
        return [s for s, _ in sorted(best.items(), key=lambda kv: -kv[1])]

    def segments_for(self, cart_ids, backoff=True):
        """Nhom tu luat (xep theo confidence x lift); con cho trong thi lui ve nhom ban chay nhat
        CUNG nhom khach voi gio (men/women/kids, unisex luon hop) - gio khong khop luat nao van co goi y."""
        cart_segs = {self.products[p]['segment'] for p in cart_ids if p in self.products}
        out = self.rule_segments(cart_segs)[:self.max_segments]
        if backoff and len(out) < self.max_segments:
            groups = {s.split(':')[0] for s in cart_segs} | {'unisex'}
            for s in self.popular_segments:
                if len(out) >= self.max_segments:
                    break
                if s not in cart_segs and s not in out and s.split(':')[0] in groups:
                    out.append(s)
        return out

    def recommend(self, cart_ids, k=10):
        cart = set(cart_ids)
        prices = [self.products[p]['price'] for p in cart_ids if p in self.products]
        # "gia vua phai": khong dat hon mon dat nhat trong gio
        ceiling = max(prices) if prices and self.price_ceiling else float('inf')
        lists = [[i for i in self.by_segment.get(s, []) if i not in cart and self.products[i]['price'] <= ceiling]
                 for s in self.segments_for(cart_ids)]
        out, pos = [], 0
        while len(out) < k and any(pos < len(l) for l in lists):   # xen ke cac nhom
            for l in lists:
                if pos < len(l) and len(out) < k:
                    out.append(l[pos])
            pos += 1
        return out


def popular_recommend(sold: Counter, products, cart_ids, k=10):
    cart = set(cart_ids)
    return [p for p, _ in sold.most_common() if p not in cart and products.get(p, {}).get('active')][:k]


def evaluate(train, test, products, args):
    rules = mine(train, products, args)
    sold = Counter(p for b in train for p in b['items'])
    rec = Recommender(rules, products, sold)
    rec_free = Recommender(rules, products, sold, price_ceiling=False)
    names = ['FP-Growth (nhom) + ban chay trong nhom', 'FP-Growth, bo tran gia', 'Ban chay toan shop']
    hits = {scope: {k: [] for k in names} for scope in ('all', 'complement')}
    seg_hit = {'FP-Growth': [], 'Nhom ban chay nhat (khong luat)': []}   # FP-Growth = luat + back-off
    seg_sold = Counter(products[p]['segment'] for b in train for p in b['items'])
    n = {'all': 0, 'complement': 0}
    for b in test:
        items = list(dict.fromkeys(b['items']))
        if len(items) < 2:
            continue
        for held in items:                                   # an 1 mon, goi y tu phan con lai
            rest = [i for i in items if i != held]
            got = [held in rec.recommend(rest, 10), held in rec_free.recommend(rest, 10),
                   held in popular_recommend(sold, products, rest, 10)]
            # "bo tro" = mon bi an thuoc nhom KHAC moi mon con lai: dung bai toan mua kem. Mua 2 mon
            # cung loai la so sanh / thay the - mua kem co chu dich bo qua nhom da co trong gio.
            rest_segs = {products[i]['segment'] for i in rest}
            complement = products[held]['segment'] not in rest_segs
            for scope in (('all', 'complement') if complement else ('all',)):
                n[scope] += 1
                for name, g in zip(names, got):
                    hits[scope][name].append(g)
            if complement:
                matched = bool(rec.rule_segments(rest_segs))
                seg_hit.setdefault('Gio khop it nhat 1 luat (do phu)', []).append(matched)
                seg_hit.setdefault('FP-Growth, khong back-off', []).append(
                    products[held]['segment'] in rec.segments_for(rest, backoff=False))
                seg_hit['FP-Growth'].append(products[held]['segment'] in rec.segments_for(rest))
                seg_hit.setdefault('Nhom ban chay CUNG nhom khach (back-off thuan)', []).append(
                    products[held]['segment'] in [s for s in rec.popular_segments if s not in rest_segs
                                                  and s.split(':')[0] in {x.split(':')[0] for x in rest_segs} | {'unisex'}][:3])
                top3 = [s for s, _ in seg_sold.most_common() if s not in rest_segs][:3]
                seg_hit['Nhom ban chay nhat (khong luat)'].append(products[held]['segment'] in top3)
    hr = {scope: {k: float(np.mean(v)) if v else 0.0 for k, v in d.items()} for scope, d in hits.items()}
    seg = {k: float(np.mean(v)) if v else 0.0 for k, v in seg_hit.items()}
    return rules, hr, seg, n


def write_rules(rules: pd.DataFrame, version: str):
    conn = connect()
    cur = conn.cursor()
    cur.execute("DELETE FROM association_rules")
    for r in rules.itertuples():
        cur.execute("""INSERT INTO association_rules (antecedent, consequent, support, confidence, lift, model_version)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (sorted(r.antecedents), next(iter(r.consequents)), float(r.support), float(r.confidence),
                     float(r.lift), version))
    conn.commit()
    conn.close()


def main():
    args = parse_args()
    baskets, products = load()
    cut = int(len(baskets) * (1 - args.test_share))
    train, test = baskets[:cut], baskets[cut:]
    multi = sum(1 for b in baskets if len(set(b['items'])) >= 2)
    print(f"{len(baskets)} don ({multi} don >= 2 mon), train {len(train)} / test {len(test)} (chia theo thoi gian)")

    rules_eval, hr, seg_hr, n = evaluate(train, test, products, args)
    print(f"Luat tren tap train: {len(rules_eval)}; mau danh gia (an 1 mon): {n['all']}, "
          f"trong do mon bo tro (khac nhom gio): {n['complement']}")
    for scope, title in (('all', 'moi mon bi an'), ('complement', 'chi mon bo tro')):
        print(f"  [{title}]")
        for k, v in hr[scope].items():
            print(f"    HR@10 {k:<40} {v:.4f}")
    print("  [mon bo tro] nhom cua mon bi an nam trong 3 nhom de xuat:")
    for k, v in seg_hr.items():
        print(f"    {k:<46} {v:.4f}")

    rules = mine(baskets, products, args)                    # ban phuc vu: hoc tren toan bo don
    version = f"fpgrowth-segment@{datetime.now():%Y%m%d%H%M}"
    report = {
        'version': version, 'orders': len(baskets), 'multi_item_orders': multi,
        'params': vars(args), 'eval': {'samples': n, 'hr@10': hr, 'complement_segment_hit@3': seg_hr},
        'rules': [{'antecedent': sorted(r.antecedents), 'consequent': next(iter(r.consequents)),
                   'support': round(float(r.support), 4), 'confidence': round(float(r.confidence), 4),
                   'lift': round(float(r.lift), 3)} for r in rules.itertuples()],
    }
    (HERE / 'rules_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\n{len(rules)} luat (toan bo don). Top 15 theo lift:")
    for r in report['rules'][:15]:
        print(f"  {' + '.join(r['antecedent']):<34} -> {r['consequent']:<20} "
              f"sup {r['support']:.3f}  conf {r['confidence']:.2f}  lift {r['lift']:.2f}")
    if not args.dry_run:
        write_rules(rules, version)
        print(f"\nDa ghi {len(rules)} luat vao association_rules ({version})")


if __name__ == '__main__':
    main()
