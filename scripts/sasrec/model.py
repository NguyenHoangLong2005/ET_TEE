"""SASRec (Kang & McAuley, ICDM 2018) - self-attention nhan qua chuoi san pham, du doan mon tiep theo.

Bien the CLIP-init: vector item = W * clip(512) + e_id, voi clip co dinh (Sprint 1), W hoc duoc,
e_id khoi tao 0. Mon it tuong tac van co bieu dien tot tu anh/mo ta thay vi vector ngau nhien.
"""
import math
from typing import Optional

import numpy as np
import torch
import torch.nn as nn


class SASRec(nn.Module):
    def __init__(self, n_items: int, maxlen: int = 50, dim: int = 64, blocks: int = 2, heads: int = 1,
                 dropout: float = 0.2, clip: Optional[np.ndarray] = None):
        super().__init__()
        self.n_items, self.maxlen, self.dim = n_items, maxlen, dim
        self.id_emb = nn.Embedding(n_items + 1, dim, padding_idx=0)
        if clip is not None:
            self.register_buffer('clip', torch.as_tensor(clip, dtype=torch.float32))
            self.clip_proj = nn.Linear(clip.shape[1], dim, bias=False)
            nn.init.zeros_(self.id_emb.weight)        # bat dau hoan toan tu noi dung, ID chi bu phan du
        else:
            self.clip = None
            self.clip_proj = None
            nn.init.normal_(self.id_emb.weight, std=dim ** -0.5)
        self.pos_emb = nn.Embedding(maxlen, dim)
        self.drop = nn.Dropout(dropout)
        layer = nn.TransformerEncoderLayer(dim, heads, dim_feedforward=dim, dropout=dropout,
                                           activation='relu', batch_first=True, norm_first=True)
        self.encoder = nn.TransformerEncoder(layer, blocks, enable_nested_tensor=False)
        self.final_norm = nn.LayerNorm(dim)
        self.register_buffer('causal', torch.triu(torch.ones(maxlen, maxlen, dtype=torch.bool), 1))

    def item_matrix(self) -> torch.Tensor:
        """[N+1, dim] - dung cho ca dau vao lan dau ra (chia se trong so nhu SASRec goc)."""
        e = self.id_emb.weight
        if self.clip_proj is not None:
            e = e + self.clip_proj(self.clip)
        return e

    def encode(self, seq: torch.Tensor, items: Optional[torch.Tensor] = None) -> torch.Tensor:
        """seq [B, L] (pad = 0 ben trai) -> hidden [B, L, dim]."""
        items = self.item_matrix() if items is None else items
        x = items[seq] * math.sqrt(self.dim)
        pos = torch.arange(seq.shape[1], device=seq.device)
        x = self.drop(x + self.pos_emb(pos)[None])
        mask = (seq != 0).unsqueeze(-1).to(x.dtype)
        x = x * mask                                    # vi tri pad = vector 0 (timeline mask cua SASRec)
        x = self.encoder(x, mask=self.causal[:seq.shape[1], :seq.shape[1]])
        return self.final_norm(x) * mask

    def forward(self, seq: torch.Tensor) -> torch.Tensor:
        """Diem cho mon tiep theo sau token cuoi: [B, N+1]."""
        items = self.item_matrix()
        h = self.encode(seq, items)[:, -1, :]
        return h @ items.T


def pad_left(seqs, maxlen: int) -> np.ndarray:
    out = np.zeros((len(seqs), maxlen), dtype=np.int64)
    for r, s in enumerate(seqs):
        s = s[-maxlen:]
        if s:
            out[r, maxlen - len(s):] = s
    return out
