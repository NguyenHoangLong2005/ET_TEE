"""Doc su kien hanh vi + vector CLIP tu DB, dung chuoi theo user va chia leave-one-out.

Quy tac dung chuoi (PHAI giong backend/.../SasrecRecommender.java khi phuc vu):
  - lay VIEW, ADD_TO_CART, PURCHASE cua user theo created_at (roi id) tang dan
  - bo su kien co san pham ngoai tu dien (khong ACTIVE / chua co embedding)
  - gop cac su kien lien tiep cung san pham thanh 1 token (VIEW -> ADD_TO_CART cung mon)
"""
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'embeddings'))
from common import connect  # noqa: E402

EVENT_TYPES = ('VIEW', 'ADD_TO_CART', 'PURCHASE')


@dataclass
class Dataset:
    product_ids: np.ndarray          # index i (1..N) -> product id; index 0 = padding
    clip: np.ndarray                 # [N+1, 512], row 0 = zeros
    user_ids: List[str]
    sequences: List[List[int]]       # item indices, chronological
    last_session: List[Optional[str]]  # session id of each user's final token (test target)

    @property
    def n_items(self) -> int:
        return len(self.product_ids) - 1


def _parse_vector(text: str) -> np.ndarray:
    return np.array(json.loads(text), dtype=np.float32)


def build_sequence(rows, index_of: Dict[int, int]):
    """rows: [(product_id, session_id)] da sap theo thoi gian -> (tokens, session cua token cuoi)."""
    seq, last_session = [], None
    for product_id, session_id in rows:
        idx = index_of.get(product_id)
        if idx is None:
            continue
        if seq and seq[-1] == idx:
            last_session = session_id
            continue
        seq.append(idx)
        last_session = session_id
    return seq, last_session


def load_dataset() -> Dataset:
    conn = connect()
    cur = conn.cursor()
    cur.execute("""
        SELECT pe.product_id, pe.embedding::text
        FROM product_embeddings pe JOIN products p ON p.id = pe.product_id
        WHERE p.status = 'ACTIVE'
        ORDER BY pe.product_id
    """)
    rows = cur.fetchall()
    product_ids = np.array([0] + [r[0] for r in rows], dtype=np.int64)
    clip = np.zeros((len(rows) + 1, 512), dtype=np.float32)
    for i, (_, vec) in enumerate(rows, start=1):
        clip[i] = _parse_vector(vec)
    index_of = {int(pid): i for i, pid in enumerate(product_ids) if i > 0}

    cur.execute("""
        SELECT user_id, product_id, session_id
        FROM user_behavior_events
        WHERE event_type IN %s
        ORDER BY user_id, created_at, id
    """, (EVENT_TYPES,))
    by_user: Dict[str, list] = {}
    for user_id, product_id, session_id in cur.fetchall():
        by_user.setdefault(user_id, []).append((product_id, session_id))
    conn.close()

    user_ids, sequences, last_sessions = [], [], []
    for user_id, events in by_user.items():
        seq, last_session = build_sequence(events, index_of)
        if seq:
            user_ids.append(user_id)
            sequences.append(seq)
            last_sessions.append(last_session)
    return Dataset(product_ids, clip, user_ids, sequences, last_sessions)


@dataclass
class Split:
    train: List[List[int]]     # duoc dung de hoc (moi user, tru 2 token cuoi neu du dai)
    valid_input: List[List[int]]
    valid_target: List[int]
    test_input: List[List[int]]
    test_target: List[int]
    test_user: List[int]       # vi tri user trong Dataset, de phan nhom ket qua


def leave_one_out(ds: Dataset, min_len: int = 3) -> Split:
    """Chuan danh gia SASRec: token cuoi = test, ke cuoi = valid, phan con lai = train."""
    s = Split([], [], [], [], [], [])
    for u, seq in enumerate(ds.sequences):
        if len(seq) < min_len:
            s.train.append(seq)
            continue
        s.train.append(seq[:-2])
        s.valid_input.append(seq[:-2])
        s.valid_target.append(seq[-2])
        s.test_input.append(seq[:-1])
        s.test_target.append(seq[-1])
        s.test_user.append(u)
    return s


def load_session_truth(path: Path) -> Dict[str, dict]:
    """Ground truth cua generator (scripts/synthetic_data.sessions.jsonl), neu co."""
    if not path.exists():
        return {}
    with open(path, encoding='utf-8') as f:
        return {t['session_id']: t for t in map(json.loads, f)}
