"""Sanity check sau khi chay pipeline (muc 5 cua spec).

    python scripts/embeddings/sanity_check.py                      # 3 bai test mac dinh
    python scripts/embeddings/sanity_check.py --slug <slug> --k 10 # xem lan can cua 1 san pham

Test 1/2: tim san pham mau theo tu khoa trong ten, in top-k lan can (cung query voi backend) de nhin
          bang mat; dong thoi dem ty le lan can cung product_type de co 1 con so so sanh.
Test 3:   EXPLAIN ANALYZE truy van ANN, kiem tra dung HNSW index va thoi gian thuc thi < 15 ms.
"""
import argparse
import statistics

from common import connect

# Giong het ProductRepository.findSimilarIdsByEmbedding (backend), can
# hnsw.iterative_scan = relaxed_order trong cung transaction (main() bat mot lan).
SIMILAR_SQL = """
WITH nn AS MATERIALIZED (
    SELECT p.name, p.product_type, p.target_group,
           pe.embedding <=> (SELECT embedding FROM product_embeddings WHERE product_id = %(id)s) AS distance
    FROM product_embeddings pe
    JOIN products p ON p.id = pe.product_id
    WHERE p.id <> %(id)s
      AND p.status = 'ACTIVE'
      AND (CAST(%(tg)s AS VARCHAR) IS NULL OR p.target_group = CAST(%(tg)s AS VARCHAR))
    ORDER BY pe.embedding <=> (SELECT embedding FROM product_embeddings WHERE product_id = %(id)s)
    LIMIT %(k)s
)
SELECT name, product_type, target_group, distance FROM nn WHERE distance IS NOT NULL ORDER BY distance
"""

DEFAULT_PROBES = [
    ('Test 1 - blazer / ao khoac', ['blazer', 'vest', 'áo khoác']),
    ('Test 2 - vay linen / dui', ['linen', 'đũi']),
    ('Test 2b - polo', ['polo']),
]


def find_product(cur, slug=None, keywords=()):
    if slug:
        cur.execute("SELECT p.id, p.name, p.product_type, p.target_group FROM products p "
                    "JOIN product_embeddings pe ON pe.product_id = p.id WHERE p.slug = %s", (slug,))
    else:
        cond = ' OR '.join(['p.name ILIKE %s'] * len(keywords))
        cur.execute(f"SELECT p.id, p.name, p.product_type, p.target_group FROM products p "
                    f"JOIN product_embeddings pe ON pe.product_id = p.id "
                    f"WHERE p.status = 'ACTIVE' AND ({cond}) ORDER BY p.id LIMIT 1",
                    [f'%{k}%' for k in keywords])
    return cur.fetchone()


def show_neighbours(cur, title, target, k):
    pid, name, ptype, tg = target
    cur.execute(SIMILAR_SQL, {'id': pid, 'tg': tg, 'k': k})
    rows = cur.fetchall()
    print(f'\n=== {title}\nINPUT: [{ptype}/{tg}] {name}')
    for i, (n, t, g, d) in enumerate(rows, 1):
        print(f'  {i:2}. d={d:.3f}  [{t}/{g}] {n}')
    same = sum(1 for r in rows if r[1] == ptype)
    print(f'  -> {same}/{len(rows)} cung product_type')


def type_precision(cur, k=10, sample=200):
    """Ty le trung binh lan can cung product_type tren mau ngau nhien (seed co dinh)."""
    cur.execute("SELECT setseed(0.42)")
    cur.execute("SELECT p.id, p.name, p.product_type, p.target_group FROM products p "
                "JOIN product_embeddings pe ON pe.product_id = p.id "
                "WHERE p.status = 'ACTIVE' AND p.product_type IS NOT NULL ORDER BY random() LIMIT %s", (sample,))
    scores = []
    for pid, _, ptype, tg in cur.fetchall():
        cur.execute(SIMILAR_SQL, {'id': pid, 'tg': tg, 'k': k})
        rows = cur.fetchall()
        if rows:
            scores.append(sum(1 for r in rows if r[1] == ptype) / len(rows))
    print(f'\n=== Same-product_type@{k} tren {len(scores)} san pham ngau nhien: {statistics.mean(scores):.1%}')


def explain(cur, target, runs=5):
    pid, _, _, tg = target
    times = []
    plan = None
    for _ in range(runs):
        cur.execute('EXPLAIN (ANALYZE, BUFFERS) ' + SIMILAR_SQL,
                    {'id': pid, 'tg': tg, 'k': 10})
        plan = [r[0] for r in cur.fetchall()]
        times.append(float(next(l for l in plan if l.startswith('Execution Time')).split()[2]))
    uses_hnsw = any('idx_product_embeddings_hnsw' in l for l in plan)
    print('\n=== Test 3 - EXPLAIN ANALYZE (lan chay cuoi)')
    print('\n'.join('  ' + l for l in plan))
    print(f'  -> HNSW index: {"CO" if uses_hnsw else "KHONG"} | execution time median '
          f'{statistics.median(times):.2f} ms, max {max(times):.2f} ms ({runs} lan) | '
          f'{"PASS" if statistics.median(times) < 15 else "FAIL"} (< 15 ms)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug')
    ap.add_argument('--k', type=int, default=10)
    args = ap.parse_args()

    conn = connect()
    cur = conn.cursor()
    # mot transaction READ ONLY cho ca lan chay; set_config(..., true) chi co hieu luc trong transaction nay
    cur.execute('SET TRANSACTION READ ONLY')
    cur.execute("SELECT set_config('hnsw.iterative_scan', 'relaxed_order', true)")
    cur.execute("SELECT source, count(*) FROM product_embeddings GROUP BY 1 ORDER BY 1")
    print('product_embeddings:', dict(cur.fetchall()))

    if args.slug:
        target = find_product(cur, slug=args.slug)
        if not target:
            raise SystemExit(f'khong tim thay embedding cho slug {args.slug}')
        show_neighbours(cur, args.slug, target, args.k)
        explain(cur, target)
    else:
        target = None
        for title, kws in DEFAULT_PROBES:
            t = find_product(cur, keywords=kws)
            if t:
                show_neighbours(cur, title, t, args.k)
                target = target or t
            else:
                print(f'\n=== {title}: khong co san pham nao khop {kws}')
        type_precision(cur, args.k)
        if target:
            explain(cur, target)
    conn.close()


if __name__ == '__main__':
    main()
