"""Baseline de so sanh voi SASRec, cung giao dien: score(inputs) -> [B, N+1] (cot 0 = padding)."""
from collections import Counter, defaultdict
from typing import List

import numpy as np


class Popularity:
    """Ban chay / xem nhieu nhat - khong ca nhan hoa."""
    name = 'Popularity'

    def __init__(self, n_items: int, history: List[List[int]]):
        counts = np.zeros(n_items + 1, dtype=np.float32)
        for seq in history:
            for i in seq:
                counts[i] += 1
        self.counts = counts

    def score(self, inputs: List[List[int]]) -> np.ndarray:
        return np.tile(self.counts, (len(inputs), 1))


class MarkovChain:
    """Bac 1: P(mon tiep | mon vua xem) dem tu cac cap lien tiep; thieu du lieu thi lui ve popularity."""
    name = 'Markov chain (item -> next item)'

    def __init__(self, n_items: int, history: List[List[int]]):
        self.n = n_items
        self.next = defaultdict(Counter)
        for seq in history:
            for a, b in zip(seq, seq[1:]):
                self.next[a][b] += 1
        self.pop = Popularity(n_items, history).counts
        self.pop = self.pop / max(self.pop.sum(), 1.0)

    def score(self, inputs: List[List[int]]) -> np.ndarray:
        out = np.tile(self.pop * 1e-3, (len(inputs), 1))
        for r, seq in enumerate(inputs):
            row = self.next.get(seq[-1]) if seq else None
            if row:
                total = sum(row.values())
                for j, c in row.items():
                    out[r, j] += c / total
        return out


class ClipRecent:
    """Khong can train: trung binh vector CLIP cua k mon KHAC NHAU gan nhat, xep hang theo cosine.
    Giong het fallback phuc vu khi chua co model (ProductRepository.findNearestToMeanEmbedding)."""

    def __init__(self, clip: np.ndarray, k: int = 5):
        self.clip = clip
        self.k = k
        self.name = f'CLIP mean of last {k} (content, no training)'

    def score(self, inputs: List[List[int]]) -> np.ndarray:
        q = np.zeros((len(inputs), self.clip.shape[1]), dtype=np.float32)
        for r, seq in enumerate(inputs):
            recent = list(dict.fromkeys(reversed(seq)))[:self.k]
            q[r] = self.clip[recent].mean(0)
        q /= np.linalg.norm(q, axis=1, keepdims=True) + 1e-8
        return q @ self.clip.T


def rank_metrics(scores: np.ndarray, targets: List[int], k: int = 10):
    """Full ranking tren toan bo catalog (khong lay mau am). Tra ve (hr@k, ndcg@k, mrr) theo tung mau."""
    scores = scores.copy()
    scores[:, 0] = -np.inf
    t = np.asarray(targets)
    target_score = scores[np.arange(len(t)), t]
    # rank 1 = tot nhat; hoa diem thi tinh bi quan: moi mon bang diem deu dung truoc (>= tinh ca chinh no)
    rank = (scores >= target_score[:, None]).sum(1)
    hit = (rank <= k).astype(np.float64)
    ndcg = np.where(rank <= k, 1.0 / np.log2(rank + 1), 0.0)
    mrr = 1.0 / rank
    return hit, ndcg, mrr
