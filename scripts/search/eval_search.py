#!/usr/bin/env python3
"""Sprint 5 - so sanh cac cach tim kiem tren bo cau hoi viet tay (can embedder dang chay, xem
services/embedder/app.py).

    python scripts/search/eval_search.py

Moi cau hoi la loi noi tu nhien (co y KHONG lap lai nguyen ten trong catalog) kem dinh nghia "dung":
loai san pham + nhom khach (+ tu khoa trong text neu can). Do P@10 / nDCG@10 voi nhan nhi phan.
Day la bo nho tu xay (30 cau), khong phai benchmark chuan - dung de chon cach tron, khong de quang cao.
Ban phuc vu (RRF tu khoa + vector tron) va cau SQL GIONG backend SemanticSearchService. Vector van ban
rieng (product_text_embeddings) duoc do va bi loai vi lam ket qua kem di.
"""
import json
import math
import re
import sys
import urllib.request
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'embeddings'))
from common import connect, to_pgvector  # noqa: E402

HERE = Path(__file__).resolve().parent
EMBEDDER = 'http://127.0.0.1:8090'
RRF_K = 60
POOL = 50

M, W, K = {'men'}, {'women'}, {'kids'}
ANY = {'men', 'women', 'kids', 'family', 'accessories', None}
# (cau hoi, nhom khach chap nhan, loai chap nhan, tu khoa bat buoc trong ten/mo ta - tuy chon)
QUERIES = [
    ('đồ mặc ở nhà cho chồng', M, {'homewear'}, None),
    ('quần tây đi làm cho nam', M, {'pants'}, None),
    ('váy đi tiệc cho phụ nữ', W, {'dress'}, None),
    ('áo khoác chống nắng cho bé', K, {'outerwear'}, None),
    ('quần đùi đá bóng nam', M, {'shorts'}, None),
    ('áo sơ mi công sở nữ', W, {'shirt'}, None),
    ('chân váy đi làm', W, {'skirt'}, None),
    ('đồ ngủ cho bé', K, {'homewear'}, None),
    ('áo thun trẻ em đi học', K, {'tshirt'}, None),
    ('giày đi tiệc nữ', ANY, {'accessories'}, r'giày|guốc|sandal|cao gót'),
    ('dép đi trong nhà', ANY, {'accessories'}, r'dép|slipper'),
    ('túi đeo vai', ANY, {'accessories'}, r'túi'),
    ('tất vớ thể thao', ANY, {'accessories'}, r'tất|vớ'),
    ('mũ lưỡi trai', ANY, {'accessories'}, r'mũ|nón'),
    ('áo polo chơi golf nam', M, {'polo'}, None),
    ('áo khoác mùa đông cho nữ', W, {'outerwear'}, None),
    ('áo khoác gió nam', M, {'outerwear'}, None),
    ('quần jean nữ', W, {'pants'}, r'jean|denim|bò'),
    ('quần jean nam', M, {'pants'}, r'jean|denim|bò'),
    ('áo thun nữ dáng rộng', W, {'tshirt'}, None),
    ('áo phông nam basic', M, {'tshirt'}, None),
    ('quần short nữ mùa hè', W, {'shorts'}, None),
    ('quần dài cho bé trai', K, {'pants'}, None),
    ('váy cho bé gái', K, {'dress', 'skirt'}, None),
    ('áo len ấm', ANY, {'outerwear', 'tshirt', 'shirt', 'polo'}, r'len|dệt kim|nỉ'),
    ('áo tập gym nam', M, {'tshirt', 'polo'}, r'thể thao|tập|gym|chạy|active'),
    ('quần chạy bộ nữ', W, {'pants', 'shorts'}, r'thể thao|chạy|active|jogger|legging'),
    ('đồ bộ mặc nhà nữ', W, {'homewear'}, None),
    ('áo khoác cho cả nhà', {'family'}, {'outerwear'}, None),
    ('áo sơ mi trắng nam', M, {'shirt'}, r'trắng'),
]


# Bo kiem chung: viet SAU khi thay loi "hub" (2026-10-07), khong dung de chon tham so - chi de bao cao.
HOLDOUT = [
    ('đầm dự tiệc sang trọng', W, {'dress'}, None),
    ('áo khoác chống nắng', ANY, {'outerwear'}, None),
    ('quần short bé trai', K, {'shorts'}, None),
    ('áo polo nữ', W, {'polo'}, None),
    ('quần tây nam công sở', M, {'pants'}, None),
    ('đồ lót nam', M, {'homewear', 'pants', 'accessories'}, r'lót|boxer|brief|sịp'),
    ('chân váy xếp ly', W, {'skirt'}, None),
    ('áo sơ mi kẻ caro', ANY, {'shirt'}, r'kẻ|caro|sọc|flannel'),
    ('áo thun in hình cho bé', K, {'tshirt'}, None),
    ('quần jogger thể thao', ANY, {'pants'}, r'jogger|thể thao|active'),
    ('váy liền thân nữ', W, {'dress'}, None),
    ('áo khoác gió trẻ em', K, {'outerwear'}, None),
    ('bộ đồ ngủ nữ', W, {'homewear'}, None),
    ('áo ba lỗ nam', M, {'tshirt'}, r'ba lỗ|tanktop|tank top|sát nách'),
    ('quần jean ống rộng', ANY, {'pants'}, r'jean|denim|bò'),
    ('khăn quàng cổ', ANY, {'accessories'}, r'khăn'),
    ('áo nỉ mùa đông nam', M, {'outerwear', 'tshirt'}, r'nỉ|giữ nhiệt|len'),
    ('quần short jean nữ', W, {'shorts'}, r'jean|denim|bò'),
    ('áo đôi gia đình', {'family'}, {'tshirt', 'shirt', 'polo', 'outerwear'}, None),
    ('áo sơ mi trẻ em', K, {'shirt'}, None),
]

# Cau chung de lay huong "moi cau hoi" (tru di truoc khi tim vector) - giong SemanticSearchService.CENTER_PHRASES
CENTER_PHRASES = ['áo', 'quần', 'thời trang', 'quần áo', 'đồ mặc hằng ngày', 'sản phẩm mới', 'trang phục', 'đồ đẹp',
                  'mặc đi chơi', 'đồ đi làm', 'phụ kiện', 'đồ trẻ em', 'đồ nam', 'đồ nữ', 'màu đen', 'màu trắng',
                  'cotton', 'giá rẻ', 'mùa hè', 'mùa đông', 'áo thun', 'áo sơ mi', 'quần dài', 'váy', 'áo khoác',
                  'đồ thể thao', 'đồ ngủ', 'tất', 'mũ', 'túi']

# Giong SemanticSearchService.TYPE_INTENTS / GROUP_INTENTS
TYPES = [
    (r'chân váy', {'skirt'}), (r'(?<!chân )(váy|đầm)', {'dress', 'skirt'}),
    (r'áo khoác|áo gió|chống nắng|cardigan|áo nỉ|hoodie|blazer', {'outerwear'}),
    (r'sơ mi', {'shirt'}), (r'polo', {'polo'}), (r'áo thun|áo phông|ba lỗ|tank ?top|áo tập', {'tshirt'}),
    (r'quần (short|đùi|soóc|sooc|sọt)', {'shorts'}),
    (r'quần (tây|jean|dài|jogger|âu|kaki|bò|ống)|quần chạy', {'pants'}),
    (r'đồ ngủ|mặc (ở )?nhà|đồ bộ|pijama|pyjama|đồ lót|quần lót', {'homewear'}),
    (r'\b(tất(?! cả)|vớ|mũ|nón|túi|khăn|giày|dép|guốc|sandal|thắt lưng|phụ kiện)\b', {'accessories'}),
]
GROUPS = [
    (r'cả nhà|gia đình|đồ đôi|áo đôi', {'family'}),
    (r'\bbé|trẻ em|em bé|cho con|học sinh|đi học', {'kids'}),
    (r'\b(nữ|phụ nữ|vợ|mẹ|con gái|chị em)\b', {'women'}),
    (r'\b((?<!việt )nam|chồng|bố|ba(?! lỗ)|đàn ông|con trai)\b', {'men'}),
]


def intent(q):
    ql = q.lower()
    t = next((v for pat, v in TYPES if re.search(pat, ql)), None)
    g = next((v for pat, v in GROUPS if re.search(pat, ql)), None)
    return t, g


def boost(info, q, ids):
    t, g = intent(q)
    if not t and not g:
        return ids
    def ok(p):
        tg, pt, _ = info[p]
        return (t is None or pt in t) and (g is None or tg in g or (tg == 'family' and 'kids' not in g))
    return [p for p in ids if ok(p)] + [p for p in ids if not ok(p)]


def nearest_ip(cur, vec, n):
    lit = to_pgvector(vec)
    cur.execute("""SELECT p.id FROM product_embeddings e JOIN products p ON p.id = e.product_id WHERE p.status = 'ACTIVE'
                    ORDER BY e.embedding <#> %s::vector LIMIT %s""", (lit, n))
    return [r[0] for r in cur.fetchall()]


def embed(text):
    req = urllib.request.Request(f'{EMBEDDER}/embed/text', data=json.dumps({'text': text}).encode(),
                                 headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=30))['vector']


def keyword(cur, q, n):
    """Giong tim kiem tu khoa hien tai (ProductSpecification) va SemanticSearchService.keywordIds:
    MOI tu phai co trong ten / mo ta / slug / loai; xep theo ban chay."""
    words = [w for w in q.lower().split() if w]
    field = "(LOWER(name) LIKE %s OR LOWER(COALESCE(description, '')) LIKE %s OR LOWER(slug) LIKE %s " \
            "OR LOWER(COALESCE(product_type, '')) LIKE %s)"
    cond = ' AND '.join([field] * len(words))
    params = [p for w in words for p in [f'%{w}%'] * 4]
    cur.execute(f"SELECT id FROM products WHERE status = 'ACTIVE' AND {cond} "
                f"ORDER BY sold_count DESC NULLS LAST, id LIMIT %s", (*params, n))
    return [r[0] for r in cur.fetchall()]


def nearest(cur, table, vec, n):
    lit = to_pgvector(vec)
    cur.execute(f"""SELECT p.id FROM {table} e JOIN products p ON p.id = e.product_id WHERE p.status = 'ACTIVE'
                    ORDER BY e.embedding <=> %s::vector LIMIT %s""", (lit, n))
    return [r[0] for r in cur.fetchall()]


def rrf(*rankings, weights=None):
    weights = weights or [1.0] * len(rankings)
    score = {}
    for w, ranking in zip(weights, rankings):
        for r, pid in enumerate(ranking):
            score[pid] = score.get(pid, 0.0) + w / (RRF_K + r + 1)
    return [pid for pid, _ in sorted(score.items(), key=lambda kv: -kv[1])]


def main():
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id, target_group, product_type, LOWER(name || ' ' || COALESCE(description, '')) FROM products")
    info = {r[0]: r[1:] for r in cur.fetchall()}

    def relevant(pid, groups, types, pattern):
        tg, pt, text = info[pid]
        return (tg in groups) and (pt in types) and (pattern is None or re.search(pattern, text) is not None)

    methods = {
        'Tu khoa (hien tai)': lambda q, v: keyword(cur, q, POOL),
        'Vector tron anh+text (Sprint 1)': lambda q, v: nearest(cur, 'product_embeddings', v, POOL),
        'Vector van ban (Sprint 5)': lambda q, v: nearest(cur, 'product_text_embeddings', v, POOL),
        'RRF: tu khoa + van ban + tron (da thu, bi loai)': lambda q, v: rrf(keyword(cur, q, POOL),
                                                                 nearest(cur, 'product_text_embeddings', v, POOL),
                                                                 nearest(cur, 'product_embeddings', v, POOL)),
        'RRF: tu khoa + tron (ban cu, truoc 2026-10-07)': lambda q, v: rrf(keyword(cur, q, POOL),
                                                                   nearest(cur, 'product_embeddings', v, POOL)),
        'RRF tu khoa x2 + tron da can giua': lambda q, v: rrf(keyword(cur, q, POOL),
                                                              nearest_ip(cur, list(np.array(v) - center), POOL), weights=[2, 1]),
        '... + uu tien dung loai/nhom (BAN PHUC VU)': lambda q, v: boost(info, q, rrf(
            keyword(cur, q, POOL), nearest_ip(cur, list(np.array(v) - center), POOL), weights=[2, 1])),
    }
    center = np.mean([embed(t) for t in CENTER_PHRASES], axis=0)
    out = {}
    for set_name, queries in (('30 cau goc', QUERIES), ('20 cau kiem chung', HOLDOUT)):
        out[set_name] = run(queries, methods, relevant)
    conn.close()
    lines = ['# Sprint 5 - Tim kiem: ket qua tren bo cau hoi viet tay', '',
             '"Dung" = dung loai san pham + nhom khach (+ tu khoa neu cau hoi yeu cau). Bo cau hoi tu xay, nho - '
             'chi de so sanh cac cach, khong phai benchmark chuan.', '',
             '2026-10-07: ban cu tra ve cung vai san pham "hub" (tat, ao so mi tron) cho moi cau ("vay di tiec" -> '
             'tat nam). Sua: tru vector trung binh cua cac cau chung (can giua) truoc khi tim vector, trong so tu '
             'khoa x2 trong RRF, roi dua san pham dung loai/nhom khach duoc nhac trong cau len truoc. Bo 20 cau kiem '
             'chung viet SAU khi thay loi; cac tu nhan dien loai/nhom duoc viet sau khi xem ca hai bo, nen so lieu '
             'van lac quan hon thuc te.', '']
    for set_name, per in out.items():
        lines += [f'## {set_name}', '', '| Cach tim | P@10 | nDCG@10 | Cau khong ra ket qua |', '|---|---:|---:|---:|']
        n = len(QUERIES) if set_name.startswith('30') else len(HOLDOUT)
        for name, r in per.items():
            lines.append(f"| {name} | {np.mean(r['p10']):.3f} | {np.mean(r['ndcg']):.3f} | {r['zero']}/{n} |")
        lines.append('')
    (HERE / 'results.md').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))


def run(queries, methods, relevant):
    per = {m: {'p10': [], 'ndcg': [], 'zero': 0} for m in methods}
    for q, groups, types, pattern in queries:
        v = embed(q)
        for name, fn in methods.items():
            top = fn(q, v)[:10]
            rel = [relevant(p, groups, types, pattern) for p in top]
            if not top:
                per[name]['zero'] += 1
            per[name]['p10'].append(sum(rel) / 10)
            dcg = sum(1 / math.log2(i + 2) for i, r in enumerate(rel) if r)
            per[name]['ndcg'].append(dcg / sum(1 / math.log2(i + 2) for i in range(10)))
    return per


if __name__ == '__main__':
    main()
