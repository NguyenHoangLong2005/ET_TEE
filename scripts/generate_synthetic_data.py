#!/usr/bin/env python3
"""
ET.TEE Fashion Recommendation System — Synthetic Behavior Data Generator
=========================================================================
Generates realistic behavior events + purchase history for training a
recommendation model. Reads real products and real user IDs from the DB
(produced by extract_products.py), then writes SQL that can be applied
directly to the live PostgreSQL database.

What is generated (in order):
  1. user_behavior_events  — new table (DDL included in output)
  2. orders                — fake DELIVERED orders (satisfy FK constraints)
  3. order_items           — one item per PURCHASE event
  4. product_reviews       — ~40 % of purchases, with verified_purchase=true

IMPORTANT constraints respected:
  - users.id               is UUID (VARCHAR 36), not BIGINT
  - product_reviews.order_item_id  is NOT NULL UNIQUE → orders/items generated first
  - order codes are unique: SYN-{8-digit counter}
  - ID offsets (10M/20M) avoid collisions with real rows

Dependencies:
    pip install faker numpy

Usage:
    # With real user IDs from DB (recommended)
    python scripts/generate_synthetic_data.py \\
      --products scripts/products.jsonl \\
      --users-file scripts/user_ids.txt \\
      --n-users 800 --output scripts/synthetic_data.sql

    # Without real users (generates synthetic UUIDs)
    python scripts/generate_synthetic_data.py \\
      --products scripts/products.jsonl \\
      --n-users 800 --output scripts/synthetic_data.sql
"""

import argparse
import csv
import json
import math
import random
import sys
import uuid
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

try:
    import numpy as np
except ImportError:
    print("ERROR: numpy not installed. Run: pip install numpy faker", file=sys.stderr)
    sys.exit(1)
try:
    from faker import Faker
    _FK = Faker('vi_VN')
except ImportError:
    print("ERROR: faker not installed. Run: pip install numpy faker", file=sys.stderr)
    sys.exit(1)

# ─── ID Offsets (avoid collision with real rows) ─────────────────────────────
ORDER_ID_OFFSET  = 10_000_000
OI_ID_OFFSET     = 20_000_000
REVIEW_ID_OFFSET = 30_000_000

# ─── Domain constants ─────────────────────────────────────────────────────────

_TARGET_GROUPS = ['men', 'women', 'unisex', 'kids']

_PRICE_TIERS = [
    ('budget',  0,          300_000),
    ('mid',     300_000,    800_000),
    ('premium', 800_000,  2_000_000),
    ('luxury',  2_000_000, 99_999_999),
]

_FALLBACK_STYLES = [
    'casual', 'formal', 'streetwear', 'vintage', 'minimalist',
    'luxury', 'sporty', 'bohemian', 'preppy', 'workwear',
]

_WINTER_KW = ['khoác', 'coat', 'jacket', 'hoodie', 'sweater', 'len', 'vest', 'blazer']

_SOURCE_POOL = ['browse', 'search', 'recommendation', 'direct', 'campaign']
_SOURCE_W    = [0.35,    0.25,    0.20,              0.12,     0.08   ]
_DEVICE_POOL = ['mobile', 'mobile', 'mobile', 'desktop', 'desktop', 'tablet']

_PAY_METHODS  = ['COD', 'COD', 'COD', 'BANK_TRANSFER', 'MOMO']
_SIZES        = ['S', 'M', 'L', 'XL', 'XXL', 'S', 'M', 'L']
_COLORS       = ['Đen', 'Trắng', 'Xanh navy', 'Xám', 'Đỏ', 'Be', 'Nâu', 'Xanh lá']

# Rating distribution: skewed high (real ecommerce)
_RATING_W  = [0.03, 0.05, 0.10, 0.30, 0.52]

_REVIEW_CONTENT: Dict[int, List[str]] = {
    5: [
        "Sản phẩm chất lượng tuyệt vời, vượt kỳ vọng của mình!",
        "Mua lần 2 rồi, vẫn rất hài lòng. Chất liệu đẹp, form chuẩn.",
        "Giao hàng nhanh, sản phẩm y như hình. Rất ưng ý!",
        "Chất vải mềm, mặc thoải mái. Sẽ ủng hộ shop dài dài.",
        "Màu sắc đẹp, đường may tỉ mỉ. Xứng đáng 5 sao.",
        "Mặc lên rất đẹp, được nhiều người khen. Giá hợp lý nữa.",
        "Shop tư vấn nhiệt tình, hàng đúng như mô tả. Rất hài lòng!",
        "Vải dày dặn, không bị xù lông sau khi giặt. Chất lượng tốt.",
        "Đóng gói cẩn thận, hàng không bị nhàu. Mua thêm cho người thân.",
        "Giá tốt so với chất lượng, sẽ giới thiệu cho bạn bè.",
    ],
    4: [
        "Sản phẩm ổn, chất vải tốt. Trừ nửa sao vì giao hơi chậm.",
        "Nhìn chung hài lòng, form áo đẹp. Màu hơi khác hình một chút.",
        "Chất lượng tốt so với giá tiền. Sẽ mua lại.",
        "Hàng đẹp, đóng gói cẩn thận. Chỉ cần size lớn hơn một chút.",
        "Mặc được, vải mềm. Hy vọng có thêm màu mới sớm.",
        "Tốt, giao nhanh. Chất lượng khá ổn với mức giá này.",
    ],
    3: [
        "Hàng tạm ổn, chất liệu bình thường. Không như kỳ vọng lắm.",
        "Màu sắc khác hình một chút nhưng vẫn dùng được.",
        "Chất vải trung bình, form hơi rộng. Tuy nhiên giá cũng hợp lý.",
        "Nhận hàng chậm hơn dự kiến. Sản phẩm dùng tạm được.",
    ],
    2: [
        "Chất vải không như mô tả, hơi thất vọng.",
        "Size không chuẩn, phải đổi lại. Không hài lòng lắm.",
    ],
    1: [
        "Hàng không đúng mô tả, rất thất vọng.",
        "Chất lượng kém, không đáng tiền.",
    ],
}

_REVIEW_TITLES: Dict[int, List[str]] = {
    5: ["Tuyệt vời!", "Rất hài lòng", "Chất lượng xuất sắc", "Đáng mua", "Mua lại lần nữa"],
    4: ["Khá tốt", "Hài lòng", "Ổn áp", "Tốt lắm", "Sẽ mua lại"],
    3: ["Tạm được", "Bình thường", "Chấp nhận được"],
    2: ["Hơi thất vọng", "Không như mong đợi"],
    1: ["Thất vọng", "Không hài lòng"],
}

# ─── CLI ──────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description='ET.TEE Synthetic Behavior Data Generator',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument('--products',         required=True,
                   help='Path to products.jsonl (from extract_products.py) or CSV')
    p.add_argument('--users-file',       default=None,
                   help='Path to user_ids.txt — one real UUID per line. '
                        'If omitted, synthetic UUIDs are generated.')
    p.add_argument('--n-users',          type=int, default=800,
                   help='Number of users to simulate. '
                        'If --users-file has enough IDs they are used first; '
                        'the remainder are synthetic UUIDs.')
    p.add_argument('--mean-views',       type=int, default=25,
                   help='Mean VIEW events per user (log-normal distributed)')
    p.add_argument('--start-date',       default=None,
                   help='Simulation window start YYYY-MM-DD (default: 4 months ago)')
    p.add_argument('--end-date',         default=None,
                   help='Simulation window end   YYYY-MM-DD (default: today)')
    p.add_argument('--output',           default='synthetic_data.sql')
    p.add_argument('--events-table',     default='user_behavior_events')
    p.add_argument('--reviews-table',    default='product_reviews')
    p.add_argument('--orders-table',     default='orders')
    p.add_argument('--order-items-table',default='order_items')
    p.add_argument('--shop-id',          type=int, default=1,
                   help='shop_id to stamp on fake orders')
    p.add_argument('--batch-size',       type=int, default=500)
    p.add_argument('--seed',             type=int, default=42)
    p.add_argument('--zipf-s',           type=float, default=1.2,
                   help='Zipf exponent — higher → more concentrated popularity')
    p.add_argument('--create-ddl',       action='store_true', default=True,
                   help='Include CREATE TABLE DDL for user_behavior_events')
    p.add_argument('--no-ddl',           dest='create_ddl', action='store_false',
                   help='Skip DDL (table already exists)')
    return p.parse_args()


# ─── Data loading ─────────────────────────────────────────────────────────────

def _coerce(row: dict, *keys: str, default='') -> str:
    for k in keys:
        v = row.get(k)
        if v is not None:
            return str(v)
    return default


def load_products(path: str) -> Tuple[List[int], Dict[int, dict]]:
    rows: List[dict] = []
    if path.endswith('.jsonl') or path.endswith('.json'):
        with open(path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
    else:
        with open(path, encoding='utf-8') as f:
            rows = list(csv.DictReader(f))

    product_ids: List[int] = []
    product_map: Dict[int, dict] = {}

    for row in rows:
        raw_id = _coerce(row, 'id', 'productId', 'product_id')
        try:
            pid = int(float(raw_id))
        except (ValueError, TypeError):
            continue

        tg = _coerce(row, 'targetGroup', 'target_group', 'gender', 'audience',
                     default='unisex').strip().lower()
        if tg not in ('men', 'women', 'kids', 'unisex'):
            tg = 'unisex'

        tags_raw = _coerce(row, 'styleTags', 'style_tags', 'tags', 'styles', default='')
        tags = [t.strip().lower() for t in tags_raw.replace(';', ',').split(',') if t.strip()]

        rec_tags_raw = _coerce(row, 'recommendationTags', 'recommendation_tags', default='')
        rec_tags = [t.strip().lower() for t in rec_tags_raw.replace(';', ',').split(',') if t.strip()]

        price_raw = _coerce(row, 'price', 'salePrice', 'sale_price', 'finalPrice', default='0')
        try:
            price = float(str(price_raw).replace(',', '').replace('₫', '').replace('đ', '').strip())
        except ValueError:
            price = 0.0

        cat = _coerce(row, 'category', 'categoryName', 'category_name', default='').lower()
        name = _coerce(row, 'name', 'productName', default='Sản phẩm')

        product_ids.append(pid)
        product_map[pid] = {
            'id': pid, 'name': name,
            'target_group': tg, 'style_tags': tags, 'rec_tags': rec_tags,
            'price': price, 'category': cat,
        }

    if not product_ids:
        print("ERROR: no products with valid 'id' found.", file=sys.stderr)
        sys.exit(1)
    return product_ids, product_map


def load_user_ids(path: Optional[str], n_users: int, rng: random.Random) -> Tuple[List[str], List[dict]]:
    """Return exactly n_users UUIDs and any synthetic user metadata. Real IDs first, synthetic fill the rest."""
    real_ids: List[str] = []
    if path and Path(path).exists():
        with open(path, encoding='utf-8') as f:
            real_ids = [ln.strip() for ln in f if ln.strip()]
        print(f"  Loaded {len(real_ids)} real user UUIDs from {path}")

    if len(real_ids) >= n_users:
        # Sample without replacement to avoid duplicate signals per user
        return rng.sample(real_ids, n_users), []

    needed = n_users - len(real_ids)
    synthetic_ids: List[str] = []
    synthetic_users: List[dict] = []
    for _ in range(needed):
        uid = str(uuid.UUID(int=rng.getrandbits(128)))
        synthetic_ids.append(uid)
        clean_uid = uid.replace('-', '')[:10]
        synthetic_users.append({
            'id': uid,
            'email': f"syn_{clean_uid}@synthetic.ettee.vn",
            'full_name': _FK.name(),
            'created_at': datetime(2026, 1, 1, 0, 0, 0),
            'updated_at': datetime(2026, 1, 1, 0, 0, 0),
        })

    if synthetic_users:
        print(f"  Generated {len(synthetic_users)} synthetic users to reach {n_users} users")
    return real_ids + synthetic_ids, synthetic_users


# ─── Zipf weights ─────────────────────────────────────────────────────────────

def build_popularity_weights(product_ids: List[int], s: float, rng: random.Random) -> np.ndarray:
    shuffled = product_ids.copy()
    rng.shuffle(shuffled)
    ranks = np.arange(1, len(shuffled) + 1, dtype=float)
    raw   = 1.0 / (ranks ** s)
    norm  = raw / raw.sum()
    idx_of = {pid: i for i, pid in enumerate(shuffled)}
    return np.array([norm[idx_of[pid]] for pid in product_ids])


# ─── Persona ──────────────────────────────────────────────────────────────────

def make_persona(style_pool: List[str], rng: random.Random) -> dict:
    tg     = rng.choice(_TARGET_GROUPS)
    styles = rng.sample(style_pool, min(rng.randint(1, 2), len(style_pool)))
    tier   = rng.choice(_PRICE_TIERS)
    return {'tg': tg, 'styles': styles, 'price_min': tier[1], 'price_max': tier[2]}


def _matches(p: dict, persona: dict) -> bool:
    if p['target_group'] not in ('unisex', persona['tg']):
        return False
    lo, hi = persona['price_min'], persona['price_max']
    if not (lo * 0.5 <= p['price'] <= hi * 1.8):
        return False
    if persona['styles'] and p['style_tags']:
        return bool(set(persona['styles']) & set(p['style_tags']))
    return True


# ─── Timestamp ────────────────────────────────────────────────────────────────

def _ts(start: datetime, end: datetime, category: str, rng: random.Random,
        np_rng: np.random.Generator) -> datetime:
    span = (end - start).total_seconds()
    is_winter = any(kw in category for kw in _WINTER_KW)
    frac = float(np_rng.beta(1.5, 0.8)) if is_winter else rng.random()
    dt = start + timedelta(seconds=frac * span)

    roll = rng.random()
    if roll < 0.40:
        dt = dt.replace(hour=rng.randint(19, 22), minute=rng.randint(0, 59),
                        second=rng.randint(0, 59), microsecond=0)
    elif roll < 0.60:
        dt = dt.replace(hour=rng.randint(11, 13), minute=rng.randint(0, 59),
                        second=rng.randint(0, 59), microsecond=0)
    return dt


# ─── Per-user event generation ────────────────────────────────────────────────

def gen_user(
    user_id: str,
    persona: dict,
    product_ids: List[int],
    product_map: Dict[int, dict],
    zipf_w: np.ndarray,
    start: datetime,
    end: datetime,
    mean_views: int,
    order_counter: List[int],   # mutable counter shared across users
    oi_counter: List[int],
    rev_counter: List[int],
    shop_id: int,
    rng: random.Random,
    np_rng: np.random.Generator,
) -> Tuple[List[dict], List[dict], List[dict], List[dict]]:
    """
    Returns (events, orders, order_items, reviews).
    Each PURCHASE generates 1 order + 1 order_item.
    ~40% of purchases generate 1 review.
    """
    n_views = max(3, min(int(np_rng.lognormal(math.log(max(mean_views, 1)), 0.65)), 300))

    matching = [p for p in product_ids if _matches(product_map[p], persona)]
    if not matching:
        matching = product_ids
    non_match = [p for p in product_ids if p not in set(matching)]

    m_idx = np.array([product_ids.index(p) for p in matching])
    m_w   = zipf_w[m_idx]; m_w = m_w / m_w.sum()

    if non_match:
        nm_idx = np.array([product_ids.index(p) for p in non_match])
        nm_w   = zipf_w[nm_idx]; nm_w = nm_w / nm_w.sum()
    else:
        nm_idx, nm_w = m_idx, m_w

    events:      List[dict] = []
    orders:      List[dict] = []
    order_items: List[dict] = []
    reviews:     List[dict] = []

    sess_id  = str(uuid.uuid4())
    sess_cnt = 0
    sess_len = rng.randint(2, 10)

    customer_name = _FK.name()

    for _ in range(n_views):
        if sess_cnt >= sess_len:
            sess_id  = str(uuid.uuid4())
            sess_cnt = 0
            sess_len = rng.randint(2, 10)

        if rng.random() < 0.70:
            pid = int(np_rng.choice(matching, p=m_w))
        else:
            pid = int(np_rng.choice(non_match if non_match else matching,
                                     p=nm_w if non_match else m_w))

        prod   = product_map[pid]
        ts     = _ts(start, end, prod['category'], rng, np_rng)
        src    = rng.choices(_SOURCE_POOL, weights=_SOURCE_W)[0]
        device = rng.choice(_DEVICE_POOL)
        price  = prod['price']

        events.append({
            'user_id': user_id, 'product_id': pid, 'event_type': 'VIEW',
            'session_id': sess_id, 'quantity': 1, 'price_at_event': price,
            'source': src, 'device_type': device, 'created_at': ts,
        })
        sess_cnt += 1

        # ADD_TO_CART ~27.5 %
        if rng.random() > 0.725:
            cart_ts  = ts + timedelta(seconds=rng.randint(15, 600))
            qty_cart = rng.choices([1, 2, 3], weights=[0.75, 0.20, 0.05])[0]
            events.append({
                'user_id': user_id, 'product_id': pid, 'event_type': 'ADD_TO_CART',
                'session_id': sess_id, 'quantity': qty_cart, 'price_at_event': price,
                'source': src, 'device_type': device, 'created_at': cart_ts,
            })
            sess_cnt += 1

            # PURCHASE ~37.5 %
            if rng.random() > 0.625:
                buy_ts  = cart_ts + timedelta(seconds=rng.randint(60, 7200))
                qty_buy = rng.choices([1, 2], weights=[0.88, 0.12])[0]

                events.append({
                    'user_id': user_id, 'product_id': pid, 'event_type': 'PURCHASE',
                    'session_id': sess_id, 'quantity': qty_buy, 'price_at_event': price,
                    'source': src, 'device_type': device, 'created_at': buy_ts,
                })
                sess_cnt += 1

                # ── Order + OrderItem ─────────────────────────────────────────
                order_id = ORDER_ID_OFFSET + order_counter[0]
                oi_id    = OI_ID_OFFSET    + oi_counter[0]
                order_counter[0] += 1
                oi_counter[0]    += 1

                unit_price  = float(price)
                total_price = unit_price * qty_buy
                order_code  = f"SYN-{order_id - ORDER_ID_OFFSET:08d}"
                pay_method  = rng.choice(_PAY_METHODS)
                ship_fee    = rng.choice([0.0, 20000.0, 30000.0, 40000.0])
                color_snap  = rng.choice(_COLORS)
                size_snap   = rng.choice(_SIZES)
                delivered_ts = buy_ts + timedelta(days=rng.randint(2, 7))

                orders.append({
                    'id': order_id, 'user_id': user_id,
                    'order_code': order_code,
                    'shop_id': shop_id,
                    'customer_name': customer_name,
                    'customer_email': _FK.email(),
                    'subtotal': total_price,
                    'shipping_fee': ship_fee,
                    'discount_total': 0.0,
                    'total_amount': total_price + ship_fee,
                    'payment_method': pay_method,
                    'payment_status': 'PAID',
                    'order_status': 'DELIVERED',
                    'created_at': buy_ts,
                    'updated_at': delivered_ts,
                })

                order_items.append({
                    'id': oi_id, 'order_id': order_id, 'product_id': pid,
                    'variant_id': 0,
                    'product_name_snapshot': prod['name'][:255],
                    'color_snapshot': color_snap,
                    'size_snapshot': size_snap,
                    'unit_price': unit_price,
                    'quantity': qty_buy,
                    'total_price': total_price,
                    'reviewed': False,
                })

                # REVIEW ~40 %
                if rng.random() < 0.40:
                    rating = rng.choices([1, 2, 3, 4, 5], weights=_RATING_W)[0]
                    rev_ts = delivered_ts + timedelta(days=rng.randint(1, 14),
                                                      hours=rng.randint(0, 23))
                    rev_id = REVIEW_ID_OFFSET + rev_counter[0]
                    rev_counter[0] += 1
                    reviews.append({
                        'id': rev_id,
                        'product_id': pid,
                        'user_id': user_id,
                        'order_item_id': oi_id,
                        'rating': rating,
                        'content': rng.choice(_REVIEW_CONTENT[rating]),
                        'customer_name_snapshot': customer_name,
                        'purchased_size': size_snap,
                        'purchased_color': color_snap,
                        'status': 'APPROVED',
                        'is_verified_purchase': True,
                        'created_at': rev_ts,
                    })

    return events, orders, order_items, reviews


# ─── SQL output ───────────────────────────────────────────────────────────────

def _esc(s: str) -> str:
    return str(s).replace("'", "''")


def _fmt(dt: datetime) -> str:
    return dt.strftime('%Y-%m-%d %H:%M:%S')


def _batches(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def write_sql(
    path: str,
    events: List[dict],
    orders: List[dict],
    order_items: List[dict],
    reviews: List[dict],
    tables: dict,
    batch_size: int,
    create_ddl: bool,
    n_users: int,
    synthetic_users: Optional[List[dict]] = None,
) -> None:
    with open(path, 'w', encoding='utf-8') as f:

        f.write("-- ═══════════════════════════════════════════════════════════════════\n")
        f.write("-- ET.TEE Synthetic Behavior Data\n")
        f.write(f"-- Generated : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- Users     : {n_users}   Events : {len(events):,}\n")
        f.write(f"-- Orders    : {len(orders):,}   OrderItems : {len(order_items):,}"
                f"   Reviews : {len(reviews):,}\n")
        f.write("-- ═══════════════════════════════════════════════════════════════════\n\n")

        # ── DDL for new table ────────────────────────────────────────────────
        if create_ddl:
            f.write(f"-- DDL: create {tables['events']} if it does not exist yet\n")
            f.write(f"CREATE TABLE IF NOT EXISTS {tables['events']} (\n")
            f.write(f"    id              BIGSERIAL    PRIMARY KEY,\n")
            f.write(f"    user_id         VARCHAR(36)  NOT NULL,\n")
            f.write(f"    product_id      BIGINT       NOT NULL,\n")
            f.write(f"    event_type      VARCHAR(20)  NOT NULL,\n")
            f.write(f"    session_id      VARCHAR(36),\n")
            f.write(f"    quantity        INTEGER      DEFAULT 1,\n")
            f.write(f"    price_at_event  NUMERIC(15,2),\n")
            f.write(f"    source          VARCHAR(30),\n")
            f.write(f"    device_type     VARCHAR(15),\n")
            f.write(f"    created_at      TIMESTAMP    NOT NULL\n")
            f.write(f");\n")
            f.write(f"CREATE INDEX IF NOT EXISTS idx_ube_user_id    ON {tables['events']}(user_id);\n")
            f.write(f"CREATE INDEX IF NOT EXISTS idx_ube_product_id ON {tables['events']}(product_id);\n")
            f.write(f"CREATE INDEX IF NOT EXISTS idx_ube_created_at ON {tables['events']}(created_at);\n\n")

        # ── SYNTHETIC USERS ──────────────────────────────────────────────────
        if synthetic_users:
            _write_block(
                f,
                label=f"SYNTHETIC USERS ({len(synthetic_users):,} rows)",
                table="users",
                cols="id, email, email_verified, full_name, password_hash, status, role, created_at, updated_at",
                rows=[
                    (f"'{u['id']}', '{_esc(u['email'])}', TRUE, '{_esc(u['full_name'])}', "
                     f"'$2a$10$e8w6Q0Mh0v8h8mN7TqYvge.QhJzJ0Z5i6uV0N1sK4P.l4i7QvG.6e', "
                     f"'ACTIVE', 'USER', '{_fmt(u['created_at'])}', '{_fmt(u['updated_at'])}'")
                    for u in synthetic_users
                ],
                batch_size=batch_size,
                on_conflict="ON CONFLICT (id) DO NOTHING",
            )

        # ── ORDERS ───────────────────────────────────────────────────────────
        _write_block(
            f,
            label=f"ORDERS ({len(orders):,} rows)",
            table=tables['orders'],
            cols=("id, order_id, user_id, order_code, shop_id, customer_name, customer_email, "
                  "subtotal, shipping_fee, discount_total, total_amount, "
                  "payment_method, payment_status, status, order_status, created_at, updated_at"),
            rows=[
                (f"{o['id']}, {o['id']}, '{_esc(o['user_id'])}', '{o['order_code']}', "
                 f"{o['shop_id']}, '{_esc(o['customer_name'])}', '{_esc(o['customer_email'])}', "
                 f"{o['subtotal']:.2f}, {o['shipping_fee']:.2f}, {o['discount_total']:.2f}, "
                 f"{o['total_amount']:.2f}, '{o['payment_method']}', "
                 f"'{o['payment_status']}', 'DELIVERED', '{o['order_status']}', "
                 f"'{_fmt(o['created_at'])}', '{_fmt(o['updated_at'])}'")
                for o in orders
            ],
            batch_size=batch_size,
        )
        # Reset sequence
        f.write(f"SELECT setval(pg_get_serial_sequence('{tables['orders']}', 'id'), "
                f"(SELECT MAX(id) FROM {tables['orders']}));\n\n")

        # ── ORDER ITEMS ──────────────────────────────────────────────────────
        _write_block(
            f,
            label=f"ORDER ITEMS ({len(order_items):,} rows)",
            table=tables['order_items'],
            cols=("id, order_id, product_id, variant_id, product_name_snapshot, "
                  "color_snapshot, size_snapshot, unit_price, quantity, total_price, reviewed"),
            rows=[
                (f"{oi['id']}, {oi['order_id']}, {oi['product_id']}, "
                 f"{oi['variant_id']}, '{_esc(oi['product_name_snapshot'])}', "
                 f"'{_esc(oi['color_snapshot'])}', '{_esc(oi['size_snapshot'])}', "
                 f"{oi['unit_price']:.2f}, {oi['quantity']}, {oi['total_price']:.2f}, FALSE")
                for oi in order_items
            ],
            batch_size=batch_size,
        )
        f.write(f"SELECT setval(pg_get_serial_sequence('{tables['order_items']}', 'id'), "
                f"(SELECT MAX(id) FROM {tables['order_items']}));\n\n")

        # ── BEHAVIOR EVENTS ──────────────────────────────────────────────────
        _write_block(
            f,
            label=f"BEHAVIOR EVENTS ({len(events):,} rows)",
            table=tables['events'],
            cols=("user_id, product_id, event_type, session_id, "
                  "quantity, price_at_event, source, device_type, created_at"),
            rows=[
                (f"'{e['user_id']}', {e['product_id']}, '{e['event_type']}', "
                 f"'{e['session_id']}', {e['quantity']}, {e['price_at_event']:.2f}, "
                 f"'{e['source']}', '{e['device_type']}', '{_fmt(e['created_at'])}'")
                for e in events
            ],
            batch_size=batch_size,
        )

        # ── PRODUCT REVIEWS ──────────────────────────────────────────────────
        _write_block(
            f,
            label=f"PRODUCT REVIEWS ({len(reviews):,} rows)",
            table=tables['reviews'],
            cols=("id, product_id, user_id, order_item_id, rating, content, "
                  "customer_name_snapshot, purchased_size, purchased_color, "
                  "status, is_verified_purchase, verified_purchase, created_at, updated_at"),
            rows=[
                (f"{r['id']}, {r['product_id']}, '{_esc(r['user_id'])}', {r['order_item_id']}, "
                 f"{r['rating']}, '{_esc(r['content'])}', "
                 f"'{_esc(r['customer_name_snapshot'])}', "
                 f"'{_esc(r['purchased_size'])}', '{_esc(r['purchased_color'])}', "
                 f"'{r['status']}', TRUE, TRUE, '{_fmt(r['created_at'])}', '{_fmt(r['created_at'])}'")
                for r in reviews
            ],
            batch_size=batch_size,
        )
        f.write(f"SELECT setval(pg_get_serial_sequence('{tables['reviews']}', 'id'), "
                f"(SELECT MAX(id) FROM {tables['reviews']}));\n\n")


def _write_block(f, label: str, table: str, cols: str, rows: List[str], batch_size: int, on_conflict: str = ""):
    if not rows:
        return
    f.write(f"-- ─────────────────────  {label}  ─────────────────────\n")
    f.write("BEGIN;\n\n")
    for batch in _batches(rows, batch_size):
        f.write(f"INSERT INTO {table} ({cols}) VALUES\n")
        f.write(",\n".join(f"  ({r})" for r in batch))
        if on_conflict:
            f.write(f"\n{on_conflict};\n\n")
        else:
            f.write(";\n\n")
    f.write("COMMIT;\n\n")


# ─── Statistics ───────────────────────────────────────────────────────────────

def _gini(arr: np.ndarray) -> float:
    s = np.sort(arr)
    n = len(s)
    if n == 0 or s.sum() == 0:
        return 0.0
    return float((2 * (np.arange(1, n + 1) * s).sum()) / (n * s.sum()) - (n + 1) / n)


def print_stats(events, orders, reviews, product_ids, n_users):
    by_type  = Counter(e['event_type'] for e in events)
    by_prod  = Counter(e['product_id'] for e in events)
    view_n   = by_type.get('VIEW', 1)
    cart_n   = by_type.get('ADD_TO_CART', 0)
    buy_n    = by_type.get('PURCHASE', 1)

    counts   = np.array([by_prod.get(pid, 0) for pid in product_ids])
    cold     = int((counts == 0).sum())
    gini     = _gini(counts)
    top10_n  = max(1, len(product_ids) // 10)
    top10_sh = sum(sorted(by_prod.values(), reverse=True)[:top10_n]) / max(sum(by_prod.values()), 1) * 100

    W   = 48
    sep = "─" * (W + 18)
    print(f"\n{'═'*(W+18)}")
    print(f"  ET.TEE SYNTHETIC DATA — STATISTICS REPORT")
    print(sep)
    print(f"  {'Metric':<{W}} {'Value':>12}")
    print(sep)
    print(f"  {'Users simulated':<{W}} {n_users:>12,}")
    print(f"  {'Total behavior events':<{W}} {len(events):>12,}")
    print(f"    {'VIEW':<{W-4}} {view_n:>12,}")
    print(f"    {'ADD_TO_CART':<{W-4}} {cart_n:>12,}")
    print(f"    {'PURCHASE':<{W-4}} {buy_n:>12,}")
    print(f"  {'Fake orders created':<{W}} {len(orders):>12,}")
    print(f"  {'Reviews generated':<{W}} {len(reviews):>12,}")
    print(sep)
    print(f"  {'Avg events / user':<{W}} {len(events)/n_users:>12.1f}")
    print(f"  {'Products in catalog':<{W}} {len(product_ids):>12,}")
    print(f"  {'Cold-start products (0 interactions)':<{W}} {cold:>12,}")
    print(f"  {'Top 10% products → share of events':<{W}} {top10_sh:>11.1f}%")
    print(f"  {'Gini (product popularity)':<{W}} {gini:>12.4f}")
    print(sep)
    print(f"  {'VIEW → ADD_TO_CART':<{W}} {cart_n/view_n*100:>11.1f}%")
    print(f"  {'ADD_TO_CART → PURCHASE':<{W}} {buy_n/max(cart_n,1)*100:>11.1f}%")
    print(f"  {'PURCHASE → REVIEW rate':<{W}} {len(reviews)/max(buy_n,1)*100:>11.1f}%")
    print(f"{'═'*(W+18)}\n")

    checks = [
        (0.20 <= cart_n/view_n         <= 0.40, f"VIEW→CART    {cart_n/view_n:.1%}  (target 25–30%)"),
        (0.30 <= buy_n/max(cart_n,1)   <= 0.50, f"CART→PURCHASE {buy_n/max(cart_n,1):.1%}  (target 35–40%)"),
        (0.30 <= len(reviews)/max(buy_n,1)<=0.50,f"Review rate  {len(reviews)/max(buy_n,1):.1%}  (target ~40%)"),
        (0.50 <= gini <= 0.85,                  f"Gini {gini:.4f}  (target 0.55–0.75)"),
        (cold/len(product_ids) <= 0.20,         f"Cold-start {cold/len(product_ids):.1%}  (<20%)"),
    ]
    all_ok = True
    for ok, msg in checks:
        if not ok:
            all_ok = False
        print(f"  {'✓' if ok else '⚠'}  {msg}")
    print()
    print("  All health checks passed ✓" if all_ok else
          "  ⚠ Some checks outside target — consider --n-users or --mean-views")
    print()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    g_rng    = random.Random(args.seed)
    g_np_rng = np.random.default_rng(args.seed)

    end_dt   = (datetime.strptime(args.end_date,   '%Y-%m-%d')
                if args.end_date   else datetime.now().replace(hour=23, minute=59, second=59))
    start_dt = (datetime.strptime(args.start_date, '%Y-%m-%d')
                if args.start_date else end_dt - timedelta(days=120))
    print(f"Window : {start_dt.date()}  →  {end_dt.date()}")

    print(f"Loading products from {args.products!r}...")
    product_ids, product_map = load_products(args.products)
    print(f"  → {len(product_ids)} products.")

    user_ids, synthetic_users = load_user_ids(args.users_file, args.n_users, g_rng)
    assert len(user_ids) == args.n_users

    style_pool = list({t for p in product_map.values() for t in p['style_tags']}) or _FALLBACK_STYLES
    zipf_w     = build_popularity_weights(product_ids, args.zipf_s, g_rng)

    print(f"Generating events for {args.n_users} users...")
    all_events:  List[dict] = []
    all_orders:  List[dict] = []
    all_oi:      List[dict] = []
    all_reviews: List[dict] = []

    order_counter = [0]  # mutable so gen_user can increment
    oi_counter    = [0]
    rev_counter   = [0]

    for i, uid in enumerate(user_ids):
        if i % 200 == 0 and i > 0:
            print(f"  [{i:>4}/{args.n_users}]  events {len(all_events):,}  "
                  f"orders {len(all_orders):,}  reviews {len(all_reviews):,}")

        u_rng  = random.Random(args.seed * 31337 + i)
        u_np   = np.random.default_rng(args.seed * 31337 + i)
        persona = make_persona(style_pool, u_rng)

        evs, ords, ois, revs = gen_user(
            user_id=uid, persona=persona,
            product_ids=product_ids, product_map=product_map,
            zipf_w=zipf_w, start=start_dt, end=end_dt,
            mean_views=args.mean_views,
            order_counter=order_counter, oi_counter=oi_counter, rev_counter=rev_counter,
            shop_id=args.shop_id,
            rng=u_rng, np_rng=u_np,
        )
        all_events.extend(evs)
        all_orders.extend(ords)
        all_oi.extend(ois)
        all_reviews.extend(revs)

    print(f"  → {len(all_events):,} events | {len(all_orders):,} orders | {len(all_reviews):,} reviews")

    # Sort by timestamp
    all_events.sort(key=lambda e: e['created_at'])
    all_orders.sort(key=lambda o: o['created_at'])
    all_oi.sort(key=lambda o: o['id'])
    all_reviews.sort(key=lambda r: r['created_at'])

    tables = {
        'events':      args.events_table,
        'orders':      args.orders_table,
        'order_items': args.order_items_table,
        'reviews':     args.reviews_table,
    }

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    print(f"Writing SQL to {args.output!r}...")
    write_sql(
        path=args.output,
        events=all_events, orders=all_orders, order_items=all_oi, reviews=all_reviews,
        tables=tables, batch_size=args.batch_size,
        create_ddl=args.create_ddl, n_users=args.n_users,
        synthetic_users=synthetic_users,
    )

    print_stats(all_events, all_orders, all_reviews, product_ids, args.n_users)


if __name__ == '__main__':
    main()
