#!/usr/bin/env python3
"""
ET.TEE Fashion Recommendation System — Synthetic Sequential Behavior Generator
==============================================================================
Simulates browsing SESSIONS (not independent clicks) so a sequential recommender
(SASRec, Sprint 2) has a real order to learn. The previous version drew every view
independently from a fixed persona and scattered timestamps over 4 months, so
"the next click" carried no information beyond the persona - see the sequential
signal report printed at the end (mutual information between consecutive product
types: ~0 for that data).

Generative story
----------------
user    persona: target group (+ maybe kids), price centre/sensitivity, theme taste,
        device, activity level (number of sessions, gap between sessions).
session one theme (công sở, casual, thể thao, mùa hè, trời lạnh, mặc nhà, đồ trẻ em)
        weighted by persona taste x season of the session date, and one mode:
          outfit  - complementary hops along a type graph (áo -> quần -> phụ kiện)
          compare - several items of the SAME type around the same price / model
          explore - types drawn from the theme
        Mid-session the shopper may switch theme (intent shift), e.g. from office
        wear to beach wear; the new theme drives the following clicks.
        Some sessions start by returning to an item left in the cart last time.
time    sessions are >= 30 min apart (the storefront session idle cut-off, see
        web/src/lib/services/behaviorTracking.ts) and timestamps strictly increase
        inside a session: view gaps ~ log-normal (median 40 s), cart 10-90 s after
        its view, checkout a few minutes after the last click.
funnel  ADD_TO_CART depends on price fit and mode; a session with a cart may end in
        one order holding several of the carted items; ~40 % of bought items get a
        review once delivered.

Item choice uses catalog attributes only (type, target group, price, tags, model
code) and a Zipf popularity prior - NOT the CLIP embeddings, so a CLIP-initialised
model is not graded on data generated from CLIP itself.

Output
------
One SQL file, applied in a single transaction, that REPLACES earlier synthetic data:
  - orders            order_code 'SYN-%'           (+ their order_items / reviews)
  - user_behavior_events  session_id 'syn-%'        (real sessions are plain UUIDs)
then recomputes products.average_rating / total_reviews / sold_count the same way
V20260929000000__datafix_indexes_and_backfill.sql does. Ids come from the table
sequences (never fixed offsets: real orders already received ids above the old
synthetic range after its setval()).

Events written by the first version of this script have no marker; remove them
once with --purge-legacy-events-through-id (they are ids 1..34598 in the current DB).

A sidecar <output>.sessions.jsonl records each session's ground truth (theme, mode,
intent-shift position) for segmenting the offline evaluation.

Usage:
    python scripts/generate_synthetic_data.py \\
      --products scripts/products.jsonl \\
      --users-file scripts/user_ids.txt \\
      --n-users 800 --output scripts/synthetic_data.sql

Dependencies: pip install faker numpy
"""

import argparse
import csv
import json
import math
import random
import re
import sys
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass, field
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
except ImportError:
    print("ERROR: faker not installed. Run: pip install numpy faker", file=sys.stderr)
    sys.exit(1)

# ─── Markers (how a later run finds and replaces this data) ──────────────────
ORDER_CODE_PREFIX = 'SYN-'
SESSION_PREFIX = 'syn-'          # 'syn-' + 32 hex = 36 chars = session_id column width

# ─── Catalog vocabulary ──────────────────────────────────────────────────────
TYPES = ['tshirt', 'shirt', 'polo', 'pants', 'shorts', 'skirt', 'dress',
         'outerwear', 'accessories', 'homewear']

# Outfit mode: P(next type | current type). "áo -> quần -> phụ kiện / áo khoác".
COMPLEMENT: Dict[str, Dict[str, float]] = {
    'tshirt':      {'pants': .35, 'shorts': .30, 'skirt': .15, 'outerwear': .10, 'accessories': .10},
    'shirt':       {'pants': .50, 'skirt': .15, 'outerwear': .15, 'accessories': .15, 'shorts': .05},
    'polo':        {'pants': .40, 'shorts': .30, 'accessories': .15, 'outerwear': .15},
    'pants':       {'tshirt': .25, 'shirt': .25, 'polo': .15, 'outerwear': .15, 'accessories': .20},
    'shorts':      {'tshirt': .45, 'polo': .25, 'accessories': .30},
    'skirt':       {'shirt': .35, 'tshirt': .35, 'accessories': .20, 'outerwear': .10},
    'dress':       {'accessories': .55, 'outerwear': .35, 'shirt': .10},
    'outerwear':   {'pants': .35, 'tshirt': .30, 'shirt': .15, 'accessories': .20},
    'accessories': {'tshirt': .30, 'pants': .20, 'shirt': .20, 'accessories': .30},
    'homewear':    {'homewear': .70, 'tshirt': .20, 'shorts': .10},
}


@dataclass(frozen=True)
class Theme:
    name: str
    start: Dict[str, float]        # type of the first click
    types: Tuple[str, ...]         # types this intent browses (others heavily damped)
    tags: Dict[str, float]         # recommendationTags boost
    target_group: Optional[str] = None   # overrides the persona's group (kids)


THEMES: Dict[str, Theme] = {t.name: t for t in [
    Theme('work',   {'shirt': .5, 'polo': .2, 'pants': .3},
          ('shirt', 'polo', 'pants', 'skirt', 'dress', 'outerwear', 'accessories'), {'công sở': 3.0}),
    Theme('casual', {'tshirt': .6, 'shorts': .2, 'pants': .2},
          ('tshirt', 'pants', 'shorts', 'skirt', 'dress', 'outerwear', 'accessories'), {'basic': 2.0, 'cotton': 1.5}),
    Theme('sport',  {'tshirt': .5, 'shorts': .3, 'polo': .2},
          ('tshirt', 'shorts', 'polo', 'pants', 'outerwear', 'accessories'), {'thể thao': 4.0}),
    Theme('summer', {'shorts': .35, 'tshirt': .30, 'dress': .20, 'skirt': .15},
          ('shorts', 'tshirt', 'dress', 'skirt', 'polo', 'accessories'), {'thoáng mát': 3.0}),
    Theme('cold',   {'outerwear': .8, 'pants': .2},
          ('outerwear', 'pants', 'shirt', 'tshirt', 'accessories'), {}),
    Theme('home',   {'homewear': .8, 'tshirt': .1, 'shorts': .1},
          ('homewear', 'tshirt', 'shorts', 'pants'), {'mặc nhà': 4.0}),
    Theme('kids',   {'tshirt': .5, 'shorts': .25, 'pants': .15, 'skirt': .10},
          ('tshirt', 'shorts', 'pants', 'skirt', 'dress', 'outerwear', 'homewear', 'polo'), {}, 'kids'),
]}
ADULT_THEMES = ['work', 'casual', 'sport', 'summer', 'cold', 'home']

MODES = ['outfit', 'compare', 'explore']
MODE_W = [0.45, 0.40, 0.15]

_DEVICES = ['mobile', 'desktop', 'tablet']
_DEVICE_W = [0.62, 0.30, 0.08]
_ENTRY_SOURCES = ['browse', 'search', 'campaign', 'direct']
_ENTRY_SOURCE_W = [0.45, 0.30, 0.10, 0.15]

_PAY_METHODS = ['COD', 'COD', 'COD', 'BANK_TRANSFER', 'MOMO']
_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'S', 'M', 'L']
_COLORS = ['Đen', 'Trắng', 'Xanh navy', 'Xám', 'Đỏ', 'Be', 'Nâu', 'Xanh lá']
_RATING_W = [0.03, 0.05, 0.10, 0.30, 0.52]

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

_MODEL_CODE = re.compile(r'(?:Mẫu|Mã)\s+([A-Za-z0-9]+)', re.IGNORECASE)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description='ET.TEE synthetic sequential behavior generator',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument('--products', required=True,
                   help='products.jsonl (from extract_products.py) or CSV')
    p.add_argument('--users-file', default=None,
                   help='user_ids.txt - one real UUID per line; synthetic UUIDs fill the rest')
    p.add_argument('--n-users', type=int, default=800)
    p.add_argument('--mean-sessions', type=float, default=7.0,
                   help='Mean sessions per user (log-normal, heavy tail)')
    p.add_argument('--mean-session-len', type=float, default=6.0,
                   help='Mean product views per session')
    p.add_argument('--intent-shift-rate', type=float, default=0.07,
                   help='Per-click probability of switching theme mid-session')
    p.add_argument('--start-date', default=None, help='YYYY-MM-DD (default: 120 days before end)')
    p.add_argument('--end-date', default=None, help='YYYY-MM-DD (default: now - 1h)')
    p.add_argument('--output', default='synthetic_data.sql')
    p.add_argument('--shop-id', type=int, default=1, help='shop_id stamped on synthetic orders')
    p.add_argument('--batch-size', type=int, default=500)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--zipf-s', type=float, default=1.1,
                   help='Zipf exponent of the popularity prior')
    p.add_argument('--purge-legacy-events-through-id', type=int, default=None,
                   help='Also delete unmarked events with id <= N (rows from the first, '
                        'non-sequential version of this script)')
    return p.parse_args()


# ─── Catalog ──────────────────────────────────────────────────────────────────

@dataclass
class Catalog:
    ids: np.ndarray                 # product ids
    names: List[str]
    group: List[str]                # men / women / kids / unisex
    ptype: List[str]
    price: np.ndarray               # effective price (sale price when present)
    log_price: np.ndarray
    tags: List[frozenset]
    model: List[Optional[str]]
    pop: np.ndarray                 # Zipf popularity prior, sums to 1
    pools: Dict[Tuple[str, str], np.ndarray] = field(default_factory=dict)  # (group, type) -> row idx

    def pool(self, group: str, ptype: str) -> np.ndarray:
        own = self.pools.get((group, ptype), np.empty(0, dtype=int))
        if group == 'unisex':
            return own
        return np.concatenate([own, self.pools.get(('unisex', ptype), np.empty(0, dtype=int))])

    def available(self, group: str, ptype: str) -> bool:
        return self.pool(group, ptype).size > 0


def _coerce(row: dict, *keys: str, default='') -> str:
    for k in keys:
        v = row.get(k)
        if v is not None and v != '':
            return str(v)
    return default


def _to_float(v: str) -> float:
    try:
        return float(str(v).replace(',', '').replace('₫', '').replace('đ', '').strip())
    except ValueError:
        return 0.0


def load_catalog(path: str, zipf_s: float, rng: random.Random) -> Catalog:
    if path.endswith('.jsonl') or path.endswith('.json'):
        with open(path, encoding='utf-8') as f:
            rows = [json.loads(ln) for ln in f if ln.strip()]
    else:
        with open(path, encoding='utf-8') as f:
            rows = list(csv.DictReader(f))

    ids, names, group, ptype, price, tags, model = [], [], [], [], [], [], []
    for row in rows:
        try:
            pid = int(float(_coerce(row, 'id', 'productId', 'product_id')))
        except (ValueError, TypeError):
            continue
        if _coerce(row, 'status', default='ACTIVE').upper() not in ('ACTIVE', 'PUBLISHED'):
            continue
        t = _coerce(row, 'productType', 'product_type', default='').lower()
        if t not in TYPES:
            continue
        g = _coerce(row, 'targetGroup', 'target_group', default='unisex').lower()
        if g not in ('men', 'women', 'kids'):
            g = 'unisex'          # 'accessories', 'family', blank
        base = _to_float(_coerce(row, 'price', default='0'))
        sale = _to_float(_coerce(row, 'salePrice', 'sale_price', default='0'))
        eff = sale if 0 < sale < base else base
        if eff <= 0:
            continue
        name = _coerce(row, 'name', 'productName', default='Sản phẩm')
        raw_tags = _coerce(row, 'recommendationTags', 'recommendation_tags', default='')
        m = _MODEL_CODE.search(name)

        ids.append(pid)
        names.append(name)
        group.append(g)
        ptype.append(t)
        price.append(eff)
        tags.append(frozenset(x.strip().lower() for x in raw_tags.split(',') if x.strip()))
        model.append(m.group(1).upper() if m else None)

    if not ids:
        print("ERROR: no usable products (need id, productType, price).", file=sys.stderr)
        sys.exit(1)

    n = len(ids)
    order = list(range(n))
    rng.shuffle(order)
    ranks = np.empty(n)
    ranks[order] = np.arange(1, n + 1)
    pop = 1.0 / ranks ** zipf_s
    pop /= pop.sum()

    price_arr = np.array(price)
    cat = Catalog(np.array(ids), names, group, ptype, price_arr, np.log(price_arr),
                  tags, model, pop)
    by_key: Dict[Tuple[str, str], List[int]] = defaultdict(list)
    for i in range(n):
        by_key[(group[i], ptype[i])].append(i)
    cat.pools = {k: np.array(v) for k, v in by_key.items()}
    return cat


def load_user_ids(path: Optional[str], n_users: int, rng: random.Random, fk: Faker
                  ) -> Tuple[List[str], List[dict]]:
    """n_users ids: real ones first, synthetic accounts fill the rest."""
    real_ids: List[str] = []
    if path and Path(path).exists():
        with open(path, encoding='utf-8') as f:
            real_ids = [ln.strip() for ln in f if ln.strip()]
        print(f"  Loaded {len(real_ids)} real user UUIDs from {path}")
    if len(real_ids) >= n_users:
        return rng.sample(real_ids, n_users), []

    synthetic_ids, synthetic_users = [], []
    for _ in range(n_users - len(real_ids)):
        uid = str(uuid.UUID(int=rng.getrandbits(128)))
        synthetic_ids.append(uid)
        synthetic_users.append({
            'id': uid,
            'email': f"syn_{uid.replace('-', '')[:10]}@synthetic.ettee.vn",
            'full_name': fk.name(),
            'created_at': datetime(2026, 1, 1),
        })
    print(f"  Generated {len(synthetic_users)} synthetic users to reach {n_users}")
    return real_ids + synthetic_ids, synthetic_users


# ─── Persona & season ─────────────────────────────────────────────────────────

@dataclass
class Persona:
    group: str                  # men / women
    has_kids: bool
    price_centre: float         # log price
    price_sigma: float          # tolerance around the centre
    theme_pref: Dict[str, float]
    device: str
    n_sessions: int
    mean_gap_days: float


def make_persona(cat: Catalog, args, rng: random.Random, np_rng: np.random.Generator) -> Persona:
    group = rng.choices(['women', 'men'], weights=[0.55, 0.45])[0]
    has_kids = rng.random() < 0.30
    # price centre somewhere between the 15th and 85th catalogue percentile
    centre = float(np.quantile(cat.log_price, rng.uniform(0.15, 0.85)))
    taste = np_rng.dirichlet([0.6] * len(ADULT_THEMES))
    pref = {t: float(w) for t, w in zip(ADULT_THEMES, taste)}
    if has_kids:
        pref = {t: w * 0.7 for t, w in pref.items()}
        pref['kids'] = 0.3
    n_sessions = max(1, min(int(round(np_rng.lognormal(math.log(args.mean_sessions), 0.7))), 60))
    return Persona(
        group=group, has_kids=has_kids,
        price_centre=centre, price_sigma=rng.uniform(0.25, 0.55),
        theme_pref=pref,
        device=rng.choices(_DEVICES, weights=_DEVICE_W)[0],
        n_sessions=n_sessions,
        mean_gap_days=rng.uniform(2.0, 14.0),
    )


def season_factor(theme: str, when: datetime) -> float:
    """Summer wear fades and cold-weather wear rises through autumn (Vietnam, northern season)."""
    doy = when.timetuple().tm_yday
    if theme == 'summer':
        return 1.6 if 152 <= doy <= 243 else 0.5          # Jun-Aug
    if theme == 'cold':
        if doy >= 305 or doy <= 59:                        # Nov-Feb
            return 2.5
        return 0.25 + 1.5 * max(0.0, (doy - 244) / 61)     # ramps up through Sep-Oct
    return 1.0


def pick_theme(p: Persona, when: datetime, rng: random.Random, exclude: Optional[str] = None) -> str:
    names = [t for t in p.theme_pref if t != exclude]
    if rng.random() < 0.15:                                # off-taste browsing
        return rng.choice(names)
    weights = [p.theme_pref[t] * season_factor(t, when) + 1e-6 for t in names]
    return rng.choices(names, weights=weights)[0]


# ─── Item choice ──────────────────────────────────────────────────────────────

def choose_type(weights: Dict[str, float], theme: Theme, group: str, cat: Catalog,
                rng: random.Random) -> Optional[str]:
    cand = {t: w * (1.0 if t in theme.types else 0.05)
            for t, w in weights.items() if cat.available(group, t)}
    cand = {t: w for t, w in cand.items() if w > 0}
    if not cand:
        cand = {t: 1.0 for t in theme.types if cat.available(group, t)}
    if not cand:
        return None
    return rng.choices(list(cand), weights=list(cand.values()))[0]


def choose_item(cat: Catalog, group: str, ptype: str, theme: Theme, persona: Persona,
                seen: set, anchor: Optional[int], np_rng: np.random.Generator) -> Optional[int]:
    pool = cat.pool(group, ptype)
    if pool.size == 0:
        return None
    w = cat.pop[pool] ** 0.7
    # price fit with the persona
    d = cat.log_price[pool] - persona.price_centre
    w = w * np.exp(-d * d / (2 * persona.price_sigma ** 2))
    # theme tags
    if theme.tags:
        boost = np.array([1.0 + sum(b for tag, b in theme.tags.items() if tag in cat.tags[i]) for i in pool])
        w = w * boost
    # compare mode: stay close to the anchor (price, same model line, shared tags)
    if anchor is not None:
        da = cat.log_price[pool] - cat.log_price[anchor]
        w = w * np.exp(-da * da / (2 * 0.15 ** 2))
        if cat.model[anchor]:
            w = w * np.where([cat.model[i] == cat.model[anchor] for i in pool], 3.0, 1.0)
        shared = np.array([len(cat.tags[i] & cat.tags[anchor]) for i in pool])
        w = w * (1.3 ** shared)
    # already seen in this session: rarely clicked again by this path (revisits handled apart)
    if seen:
        w = w * np.where(np.isin(pool, list(seen)), 0.05, 1.0)
    total = w.sum()
    if not np.isfinite(total) or total <= 0:
        return int(np_rng.choice(pool))
    return int(np_rng.choice(pool, p=w / total))


def price_fit(cat: Catalog, i: int, p: Persona) -> float:
    d = cat.log_price[i] - p.price_centre
    return math.exp(-d * d / (2 * p.price_sigma ** 2))


# ─── Simulation ───────────────────────────────────────────────────────────────

@dataclass
class Counters:
    order: int = 0


def _rand_uuid(rng: random.Random) -> uuid.UUID:
    return uuid.UUID(int=rng.getrandbits(128), version=4)


def simulate_user(uid: str, persona: Persona, cat: Catalog, args, start: datetime, end: datetime,
                  counters: Counters, rng: random.Random, np_rng: np.random.Generator, fk: Faker
                  ) -> Tuple[List[dict], List[dict], List[dict], List[dict], List[dict]]:
    events, orders, items, reviews, truths = [], [], [], [], []
    customer_name = fk.name()
    customer_email = fk.email()

    span = (end - start).total_seconds()
    t = start + timedelta(seconds=rng.uniform(0, 0.7) * span)
    prev_end: Optional[datetime] = None
    open_cart: Dict[int, int] = {}          # row idx -> qty, carried over when not bought

    for s_no in range(persona.n_sessions):
        if s_no > 0:
            gap_days = np_rng.exponential(persona.mean_gap_days)
            t = t + timedelta(days=gap_days, minutes=30 + rng.uniform(0, 120))
        # pull the session start into shopping hours
        hour = rng.choices([rng.randint(19, 22), rng.randint(11, 13), rng.randint(8, 23)],
                           weights=[0.45, 0.20, 0.35])[0]
        t = t.replace(hour=hour, minute=rng.randint(0, 59), second=rng.randint(0, 59), microsecond=0)
        if prev_end is not None and t < prev_end + timedelta(minutes=30):
            t += timedelta(days=1)          # moving to shopping hours must not overlap the last session
        if t >= end:
            break

        theme_name = pick_theme(persona, t, rng)
        mode = rng.choices(MODES, weights=MODE_W)[0]
        sess_id = SESSION_PREFIX + _rand_uuid(rng).hex
        length = min(1 + int(np_rng.geometric(1.0 / max(args.mean_session_len - 1, 1.0))), 25)
        truth = {'session_id': sess_id, 'user_id': uid, 'mode': mode,
                 'themes': [theme_name], 'shift_at': [], 'returning_cart': False}

        seq: List[int] = []                  # row idx per VIEW, in order
        seen: set = set()
        cart: Dict[int, int] = {}
        clock = t
        cur_type: Optional[str] = None
        anchor: Optional[int] = None
        source = rng.choices(_ENTRY_SOURCES, weights=_ENTRY_SOURCE_W)[0]

        def emit(kind: str, i: int, qty: int, src: Optional[str]):
            events.append({
                'user_id': uid, 'product_id': int(cat.ids[i]), 'event_type': kind,
                'session_id': sess_id, 'quantity': qty, 'price_at_event': float(cat.price[i]),
                'source': src, 'device_type': persona.device, 'created_at': clock,
            })

        # returning to an abandoned cart: first click is one of those items
        if open_cart and rng.random() < 0.4:
            i = rng.choice(list(open_cart))
            truth['returning_cart'] = True
            seq.append(i); seen.add(i)
            emit('VIEW', i, 1, 'direct')
            cart[i] = open_cart[i]
            cur_type, anchor = cat.ptype[i], i
            clock += timedelta(seconds=rng.randint(10, 60))
            emit('ADD_TO_CART', i, cart[i], 'direct')
        open_cart = {}

        for step in range(length):
            theme = THEMES[theme_name]
            group = theme.target_group or persona.group
            # intent shift (needs some history to shift away from)
            if len(seq) >= 2 and rng.random() < args.intent_shift_rate:
                theme_name = pick_theme(persona, clock, rng, exclude=theme_name)
                theme = THEMES[theme_name]
                group = theme.target_group or persona.group
                truth['themes'].append(theme_name)
                truth['shift_at'].append(len(seq))
                cur_type, anchor = None, None

            if seq:
                clock += timedelta(seconds=float(np.clip(np_rng.lognormal(math.log(40), 0.8), 5, 900)))

            # revisit a recent item (back button / second look)
            if len(seq) >= 2 and rng.random() < 0.08:
                i = rng.choice(seq[-3:])
                seq.append(i)
                emit('VIEW', i, 1, 'browse')
                continue

            if cur_type is None:
                nxt = choose_type(theme.start, theme, group, cat, rng)
                anchor = None
            elif mode == 'compare' and rng.random() < 0.8:
                nxt = cur_type                  # same type, near the anchor
            elif mode == 'outfit':
                nxt = choose_type(COMPLEMENT[cur_type], theme, group, cat, rng)
                anchor = None
            else:
                nxt = choose_type({**{x: 0.3 for x in theme.types}, **theme.start}, theme, group, cat, rng)
                anchor = None
            if nxt is None:
                break
            i = choose_item(cat, group, nxt, theme, persona, seen,
                            anchor if mode == 'compare' else None, np_rng)
            if i is None:
                break
            src = source if not seq else ('recommendation' if mode == 'outfit' and rng.random() < 0.4
                                          else rng.choice(['browse', 'search']))
            seq.append(i); seen.add(i)
            emit('VIEW', i, 1, src)
            cur_type = nxt
            if mode == 'compare' and anchor is None:
                anchor = i

            # add to cart
            if i not in cart:
                p_cart = 0.05 + 0.10 * price_fit(cat, i, persona)
                if mode == 'compare':
                    p_cart += min(0.04 * step, 0.20)    # decides after comparing a few
                elif mode == 'outfit':
                    p_cart += 0.06
                if rng.random() < p_cart:
                    clock += timedelta(seconds=rng.randint(10, 90))
                    qty = rng.choices([1, 2, 3], weights=[0.80, 0.16, 0.04])[0]
                    cart[i] = qty
                    emit('ADD_TO_CART', i, qty, src)

        # checkout at the end of the session
        bought: List[int] = []
        if cart:
            p_buy = 0.65 if truth['returning_cart'] else 0.45
            if rng.random() < p_buy:
                bought = [i for i in cart if rng.random() < 0.85] or [next(iter(cart))]
                clock += timedelta(seconds=rng.randint(60, 480))
                for k, i in enumerate(bought):
                    if k:
                        clock += timedelta(seconds=1)   # one order, rows written one after another
                    emit('PURCHASE', i, cart[i], None)
                orders_, items_, reviews_ = make_order(uid, customer_name, customer_email, bought, cart,
                                                       clock, end, cat, args, counters, rng)
                orders.extend(orders_); items.extend(items_); reviews.extend(reviews_)
            open_cart = {i: q for i, q in cart.items() if i not in bought}

        truth['views'] = len(seq)
        truth['bought'] = [int(cat.ids[i]) for i in bought]
        truths.append(truth)
        t = prev_end = clock

    return events, orders, items, reviews, truths


def make_order(uid, customer_name, customer_email, bought, cart, when, end, cat, args, counters, rng):
    counters.order += 1
    code = f"{ORDER_CODE_PREFIX}{counters.order:08d}"
    delivered = min(when + timedelta(days=rng.randint(2, 7)), end)
    subtotal = sum(float(cat.price[i]) * cart[i] for i in bought)
    ship_fee = 0.0 if subtotal >= 499_000 else rng.choice([20000.0, 30000.0, 40000.0])
    order = {
        'order_code': code, 'user_id': uid, 'shop_id': args.shop_id,
        'customer_name': customer_name, 'customer_email': customer_email,
        'subtotal': subtotal, 'shipping_fee': ship_fee, 'total_amount': subtotal + ship_fee,
        'payment_method': rng.choice(_PAY_METHODS), 'created_at': when, 'updated_at': delivered,
    }
    items, reviews = [], []
    for i in bought:
        size, color = rng.choice(_SIZES), rng.choice(_COLORS)
        items.append({
            'order_code': code, 'product_id': int(cat.ids[i]), 'name': cat.names[i][:255],
            'color': color, 'size': size, 'unit_price': float(cat.price[i]), 'quantity': cart[i],
        })
        rev_at = delivered + timedelta(days=rng.randint(1, 14), hours=rng.randint(0, 23))
        if rng.random() < 0.40 and rev_at < end:
            rating = rng.choices([1, 2, 3, 4, 5], weights=_RATING_W)[0]
            reviews.append({
                'order_code': code, 'product_id': int(cat.ids[i]), 'user_id': uid, 'rating': rating,
                'content': rng.choice(_REVIEW_CONTENT[rating]), 'customer_name': customer_name,
                'size': size, 'color': color, 'created_at': rev_at,
            })
    return [order], items, reviews


# ─── SQL output ───────────────────────────────────────────────────────────────

def _esc(s) -> str:
    return str(s).replace("'", "''")


def _ts(dt: datetime) -> str:
    return dt.strftime('%Y-%m-%d %H:%M:%S')


def _batches(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def write_sql(path: str, events, orders, items, reviews, synthetic_users, args) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        w = f.write
        w("-- ET.TEE synthetic sequential behavior data (scripts/generate_synthetic_data.py)\n")
        w(f"-- Generated {datetime.now():%Y-%m-%d %H:%M:%S}, seed {args.seed}\n")
        w(f"-- events {len(events):,} | orders {len(orders):,} | order items {len(items):,} "
          f"| reviews {len(reviews):,}\n")
        w("-- Replaces earlier synthetic rows (markers: order_code 'SYN-%', session_id 'syn-%').\n\n")
        w("BEGIN;\n\n")

        w("-- 1. remove the previous synthetic data set\n")
        syn_orders = f"(SELECT id FROM orders WHERE order_code LIKE '{ORDER_CODE_PREFIX}%')"
        w(f"DELETE FROM product_reviews WHERE order_item_id IN "
          f"(SELECT id FROM order_items WHERE order_id IN {syn_orders});\n")
        w(f"DELETE FROM order_status_history WHERE order_id IN {syn_orders};\n")
        w(f"DELETE FROM order_items WHERE order_id IN {syn_orders};\n")
        w(f"DELETE FROM orders WHERE order_code LIKE '{ORDER_CODE_PREFIX}%';\n")
        w(f"DELETE FROM user_behavior_events WHERE session_id LIKE '{SESSION_PREFIX}%';\n")
        if args.purge_legacy_events_through_id is not None:
            w(f"-- unmarked rows of the first (non-sequential) generator\n")
            w(f"DELETE FROM user_behavior_events WHERE id <= {int(args.purge_legacy_events_through_id)} "
              f"AND (session_id IS NULL OR session_id NOT LIKE '{SESSION_PREFIX}%');\n")
        w("\n")

        if synthetic_users:
            w("-- 2. synthetic accounts\n")
            for batch in _batches(synthetic_users, args.batch_size):
                w("INSERT INTO users (id, email, email_verified, full_name, password_hash, status, role, "
                  "created_at, updated_at) VALUES\n")
                w(",\n".join(
                    f"  ('{u['id']}', '{_esc(u['email'])}', TRUE, '{_esc(u['full_name'])}', "
                    f"'$2a$10$e8w6Q0Mh0v8h8mN7TqYvge.QhJzJ0Z5i6uV0N1sK4P.l4i7QvG.6e', 'ACTIVE', 'USER', "
                    f"'{_ts(u['created_at'])}', '{_ts(u['created_at'])}')" for u in batch))
                w("\nON CONFLICT (id) DO NOTHING;\n\n")

        w("-- 3. orders (ids from the sequence; order_id mirrors id like the app does)\n")
        for batch in _batches(orders, args.batch_size):
            w("INSERT INTO orders (id, order_id, user_id, order_code, shop_id, customer_name, customer_email,\n"
              "  subtotal, shipping_fee, discount_total, total_amount, payment_method, payment_status,\n"
              "  status, order_status, sold_counted, created_at, updated_at)\n"
              "SELECT n.id, n.id, n.user_id, n.order_code, n.shop_id, n.customer_name, n.customer_email,\n"
              "  n.subtotal, n.shipping_fee, 0, n.total_amount, n.payment_method, 'PAID',\n"
              "  'DELIVERED', 'DELIVERED', TRUE, n.created_at::timestamp, n.updated_at::timestamp\n"
              "-- nextval() in the select list runs once per row (an uncorrelated LATERAL runs once in total)\n"
              "FROM (SELECT nextval(pg_get_serial_sequence('orders', 'id')) AS id, v.* FROM (VALUES\n")
            w(",\n".join(
                f"  ('{o['user_id']}', '{o['order_code']}', {o['shop_id']}, '{_esc(o['customer_name'])}', "
                f"'{_esc(o['customer_email'])}', {o['subtotal']:.2f}, {o['shipping_fee']:.2f}, "
                f"{o['total_amount']:.2f}, '{o['payment_method']}', '{_ts(o['created_at'])}', "
                f"'{_ts(o['updated_at'])}')" for o in batch))
            w("\n) AS v(user_id, order_code, shop_id, customer_name, customer_email, subtotal, shipping_fee,\n"
              "       total_amount, payment_method, created_at, updated_at)\n"
              ") n;\n\n")

        w("-- 4. order items, linked through order_code\n")
        for batch in _batches(items, args.batch_size):
            w("INSERT INTO order_items (order_id, product_id, variant_id, product_name_snapshot, color_snapshot,\n"
              "  size_snapshot, unit_price, quantity, total_price, reviewed)\n"
              "SELECT o.id, v.product_id, 0, v.name, v.color, v.size, v.unit_price, v.quantity,\n"
              "  v.unit_price * v.quantity, FALSE\n"
              "FROM (VALUES\n")
            w(",\n".join(
                f"  ('{it['order_code']}', {it['product_id']}, '{_esc(it['name'])}', '{_esc(it['color'])}', "
                f"'{it['size']}', {it['unit_price']:.2f}::double precision, {it['quantity']})" for it in batch))
            w("\n) AS v(order_code, product_id, name, color, size, unit_price, quantity)\n"
              "JOIN orders o ON o.order_code = v.order_code;\n\n")

        w("-- 5. behavior events (ids from the table default)\n")
        for batch in _batches(events, args.batch_size):
            w("INSERT INTO user_behavior_events (user_id, product_id, event_type, session_id, quantity,\n"
              "  price_at_event, source, device_type, created_at) VALUES\n")
            w(",\n".join(
                f"  ('{e['user_id']}', {e['product_id']}, '{e['event_type']}', '{e['session_id']}', "
                f"{e['quantity']}, {e['price_at_event']:.2f}, "
                f"{'NULL' if e['source'] is None else repr(e['source'])}, '{e['device_type']}', "
                f"'{e['created_at']:%Y-%m-%d %H:%M:%S.%f}')" for e in batch))
            w(";\n\n")

        w("-- 6. reviews, linked to their order item\n")
        for batch in _batches(reviews, args.batch_size):
            w("INSERT INTO product_reviews (product_id, user_id, order_item_id, rating, content,\n"
              "  customer_name_snapshot, purchased_size, purchased_color, status, is_verified_purchase,\n"
              "  verified_purchase, created_at, updated_at)\n"
              "SELECT v.product_id, v.user_id, oi.id, v.rating, v.content, v.customer_name, v.size, v.color,\n"
              "  'APPROVED', TRUE, TRUE, v.created_at::timestamp, v.created_at::timestamp\n"
              "FROM (VALUES\n")
            w(",\n".join(
                f"  ('{r['order_code']}', {r['product_id']}, '{r['user_id']}', {r['rating']}, "
                f"'{_esc(r['content'])}', '{_esc(r['customer_name'])}', '{r['size']}', "
                f"'{_esc(r['color'])}', '{_ts(r['created_at'])}')" for r in batch))
            w("\n) AS v(order_code, product_id, user_id, rating, content, customer_name, size, color, created_at)\n"
              "JOIN orders o ON o.order_code = v.order_code\n"
              "JOIN order_items oi ON oi.order_id = o.id AND oi.product_id = v.product_id;\n\n")
        w(f"UPDATE order_items SET reviewed = TRUE WHERE id IN (SELECT order_item_id FROM product_reviews) "
          f"AND order_id IN {syn_orders};\n\n")

        w("-- 7. product aggregates (same formulas as V20260929000000__datafix_indexes_and_backfill.sql)\n")
        w("UPDATE products p SET total_reviews = COALESCE(agg.cnt, 0), average_rating = COALESCE(agg.avg_rating, 0.0)\n"
          "FROM products p2 LEFT JOIN (\n"
          "  SELECT product_id, COUNT(*) AS cnt, AVG(rating)::double precision AS avg_rating\n"
          "  FROM product_reviews WHERE status = 'APPROVED' GROUP BY product_id\n"
          ") agg ON agg.product_id = p2.id\n"
          "WHERE p.id = p2.id;\n")
        w("UPDATE products p SET sold_count = COALESCE(agg.total_qty, 0)\n"
          "FROM products p2 LEFT JOIN (\n"
          "  SELECT oi.product_id, SUM(oi.quantity) AS total_qty FROM order_items oi\n"
          "  JOIN orders o ON o.id = oi.order_id WHERE o.status = 'DELIVERED' GROUP BY oi.product_id\n"
          ") agg ON agg.product_id = p2.id\n"
          "WHERE p.id = p2.id;\n\n")
        w("COMMIT;\n")


# ─── Statistics ───────────────────────────────────────────────────────────────

def _gini(arr: np.ndarray) -> float:
    s = np.sort(arr)
    n = len(s)
    if n == 0 or s.sum() == 0:
        return 0.0
    return float((2 * (np.arange(1, n + 1) * s).sum()) / (n * s.sum()) - (n + 1) / n)


def type_transition_mi(sequences: List[List[str]]) -> Tuple[float, float]:
    """Mutual information (bits) between consecutive product types, and H(type) for scale."""
    pairs = Counter()
    for seq in sequences:
        for a, b in zip(seq, seq[1:]):
            pairs[(a, b)] += 1
    total = sum(pairs.values())
    if not total:
        return 0.0, 0.0
    left, right = Counter(), Counter()
    for (a, b), c in pairs.items():
        left[a] += c
        right[b] += c
    mi = sum(c / total * math.log2((c / total) / ((left[a] / total) * (right[b] / total)))
             for (a, b), c in pairs.items())
    h = -sum(c / total * math.log2(c / total) for c in right.values())
    return mi, h


def order_signal(sequences: List[List[str]], seed: int = 7, reps: int = 5) -> Tuple[float, float]:
    """MI of the real click order vs. the same sessions with their clicks shuffled.

    Persona / session-level preferences (a woman browsing skirts) already make consecutive types
    correlated even when the order inside a session is random; shuffling keeps that part and removes
    only what the ORDER carries. The gap is what a sequential model can learn beyond a bag of items.
    """
    mi, _ = type_transition_mi(sequences)
    rng = random.Random(seed)
    shuffled_mi = []
    for _ in range(reps):
        shuf = []
        for seq in sequences:
            s = list(seq)
            rng.shuffle(s)
            shuf.append(s)
        shuffled_mi.append(type_transition_mi(shuf)[0])
    return mi, float(np.mean(shuffled_mi))


def sequences_by_session(events: List[dict], ptype_of: Dict[int, str]) -> List[List[str]]:
    by_sess: Dict[str, List[Tuple[datetime, str]]] = defaultdict(list)
    for e in events:
        if e['event_type'] == 'VIEW':
            by_sess[e['session_id']].append((e['created_at'], ptype_of[e['product_id']]))
    return [[t for _, t in sorted(v)] for v in by_sess.values()]


def print_stats(events, orders, reviews, truths, cat: Catalog, n_users: int, end: datetime) -> bool:
    by_type = Counter(e['event_type'] for e in events)
    views, carts, buys = by_type['VIEW'], by_type['ADD_TO_CART'], by_type['PURCHASE']
    by_prod = Counter(e['product_id'] for e in events)
    counts = np.array([by_prod.get(int(p), 0) for p in cat.ids])
    cold = int((counts == 0).sum())
    gini = _gini(counts)

    ptype_of = {int(p): cat.ptype[i] for i, p in enumerate(cat.ids)}
    seqs = sequences_by_session(events, ptype_of)
    mi, h = type_transition_mi(seqs)
    _, mi_shuffled = order_signal(seqs)
    lens = [len(s) for s in seqs]
    shifted = sum(1 for t in truths if t['shift_at'])
    returning = sum(1 for t in truths if t['returning_cart'])

    # invariants: strictly increasing inside a session, sessions >= 30 min apart, nothing in the future
    by_sess = defaultdict(list)
    for e in events:
        by_sess[e['session_id']].append(e['created_at'])
    monotonic = all(all(a < b for a, b in zip(v, v[1:])) for v in by_sess.values())
    spans = defaultdict(list)
    for e in events:
        spans[e['user_id']].append((e['session_id'], e['created_at']))
    gaps_ok = True
    for rows in spans.values():
        bounds = defaultdict(lambda: [None, None])
        for sid, ts in rows:
            b = bounds[sid]
            b[0] = ts if b[0] is None or ts < b[0] else b[0]
            b[1] = ts if b[1] is None or ts > b[1] else b[1]
        ordered = sorted(bounds.values())
        if any(nxt[0] - cur[1] < timedelta(minutes=30) for cur, nxt in zip(ordered, ordered[1:])):
            gaps_ok = False
            break
    future = sum(1 for e in events if e['created_at'] >= end)

    sep = '─' * 66
    print(f"\n{'═' * 66}\n  ET.TEE SYNTHETIC SEQUENTIAL DATA — REPORT\n{sep}")
    rows = [
        ('Users', f"{n_users:,}"),
        ('Sessions', f"{len(truths):,}"),
        ('Events', f"{len(events):,}"),
        ('  VIEW / ADD_TO_CART / PURCHASE', f"{views:,} / {carts:,} / {buys:,}"),
        ('Orders / reviews', f"{len(orders):,} / {len(reviews):,}"),
        ('Views per session: mean / median / max',
         f"{np.mean(lens):.1f} / {int(np.median(lens))} / {max(lens)}"),
        ('Sessions with an intent shift', f"{shifted / len(truths):.1%}"),
        ('Sessions returning to an abandoned cart', f"{returning / len(truths):.1%}"),
        ('Products never touched (cold start)', f"{cold:,} ({cold / len(cat.ids):.1%})"),
        ('Gini of product popularity', f"{gini:.3f}"),
        ('VIEW -> ADD_TO_CART', f"{carts / max(views, 1):.1%}"),
        ('ADD_TO_CART -> PURCHASE', f"{buys / max(carts, 1):.1%}"),
        ('MI(type_t ; type_t+1) / H(type)', f"{mi:.3f} / {h:.3f} bits ({mi / h:.1%})" if h else '-'),
        ('  same sessions, clicks shuffled', f"{mi_shuffled:.3f} bits"),
        ('  order signal (real - shuffled)', f"{mi - mi_shuffled:.3f} bits"),
    ]
    for k, v in rows:
        print(f"  {k:<44} {v:>20}")
    print(sep)
    checks = [
        (monotonic, 'timestamps strictly increase inside every session'),
        (gaps_ok, 'sessions of a user are >= 30 min apart'),
        (future == 0, 'no timestamp in the future'),
        (0.10 <= carts / max(views, 1) <= 0.30, 'VIEW->CART within 10-30%'),
        (0.30 <= buys / max(carts, 1) <= 0.70, 'CART->PURCHASE within 30-70%'),
        (cold / len(cat.ids) <= 0.25, 'cold-start products <= 25%'),
        (mi - mi_shuffled >= 0.10, 'click ORDER carries signal (MI real - shuffled >= 0.10 bits)'),
    ]
    for ok, msg in checks:
        print(f"  {'✓' if ok else '✗'}  {msg}")
    print()
    return all(ok for ok, _ in checks[:3])


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    rng = random.Random(args.seed)
    Faker.seed(args.seed)
    fk = Faker('vi_VN')

    end = (datetime.strptime(args.end_date, '%Y-%m-%d') if args.end_date
           else datetime.now().replace(microsecond=0) - timedelta(hours=1))
    start = (datetime.strptime(args.start_date, '%Y-%m-%d') if args.start_date
             else end - timedelta(days=120))
    print(f"Window : {start:%Y-%m-%d %H:%M} -> {end:%Y-%m-%d %H:%M}")

    cat = load_catalog(args.products, args.zipf_s, rng)
    print(f"  {len(cat.ids)} products, {len(cat.pools)} (group, type) pools")
    user_ids, synthetic_users = load_user_ids(args.users_file, args.n_users, rng, fk)

    events, orders, items, reviews, truths = [], [], [], [], []
    counters = Counters()
    for n, uid in enumerate(user_ids):
        u_rng = random.Random(args.seed * 31337 + n)
        u_np = np.random.default_rng(args.seed * 31337 + n)
        persona = make_persona(cat, args, u_rng, u_np)
        ev, od, it, rv, tr = simulate_user(uid, persona, cat, args, start, end, counters, u_rng, u_np, fk)
        events += ev; orders += od; items += it; reviews += rv; truths += tr
    events.sort(key=lambda e: e['created_at'])

    ok = print_stats(events, orders, reviews, truths, cat, len(user_ids), end)
    if not ok:
        print("ERROR: invariant violated, no SQL written.", file=sys.stderr)
        sys.exit(2)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_sql(str(out), events, orders, items, reviews, synthetic_users, args)
    truth_path = out.with_suffix('.sessions.jsonl')
    with open(truth_path, 'w', encoding='utf-8') as f:
        for t in truths:
            f.write(json.dumps(t, ensure_ascii=False) + '\n')
    print(f"Wrote {out} and {truth_path}")


if __name__ == '__main__':
    main()
