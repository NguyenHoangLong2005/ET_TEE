# Sprint 2 - Ket qua danh gia offline

Sinh luc 2026-10-04 18:18 boi `scripts/sasrec/train.py` (32.9 phut, CPU).

- Du lieu: 800 user, 2872 san pham ACTIVE co vector CLIP, 32,678 token (VIEW / ADD_TO_CART / PURCHASE, gop su kien lien tiep cung mon).
- **Su kien la du lieu mo phong** (`scripts/generate_synthetic_data.py`), khong phai hanh vi khach that.
- Giao thuc: leave-one-out theo user (token cuoi = test, ke cuoi = valid), xep hang tren TOAN BO catalog (khong lay mau am), diem bang nhau tinh bi quan.
- SASRec: maxlen 50, dim 128, 2 block, 1 head, dropout 0.4, cross-entropy toan catalog, early stopping theo NDCG@10 valid; trung binh ± do lech chuan qua 3 seed.

## Tat ca user (796)

| Mo hinh | HR@10 | NDCG@10 | MRR |
|---|---:|---:|---:|
| Popularity | 0.0930 | 0.0537 | 0.0511 |
| Markov chain (item -> next item) | 0.1520 | 0.0891 | 0.0796 |
| CLIP mean of last 5 (content, no training) | 0.0791 | 0.0469 | 0.0430 |
| SASRec (random init) | 0.1763 ± 0.0082 | 0.0849 ± 0.0022 | 0.0695 ± 0.0006 |
| SASRec (CLIP-init) | 0.1742 ± 0.0012 | 0.0897 ± 0.0014 | 0.0777 ± 0.0017 |

## Phien cuoi co doi y dinh (178)

| Mo hinh | HR@10 | NDCG@10 | MRR |
|---|---:|---:|---:|
| Popularity | 0.0787 | 0.0481 | 0.0469 |
| Markov chain (item -> next item) | 0.1180 | 0.0668 | 0.0606 |
| CLIP mean of last 5 (content, no training) | 0.0730 | 0.0431 | 0.0375 |
| SASRec (random init) | 0.1124 ± 0.0159 | 0.0581 ± 0.0065 | 0.0539 ± 0.0032 |
| SASRec (CLIP-init) | 0.1217 ± 0.0053 | 0.0561 ± 0.0024 | 0.0491 ± 0.0020 |

## Lich su ngan (<= 10 token)

| Mo hinh | HR@10 | NDCG@10 | MRR |
|---|---:|---:|---:|
| Popularity | 0.0154 | 0.0154 | 0.0293 |
| Markov chain (item -> next item) | 0.1231 | 0.0676 | 0.0619 |
| CLIP mean of last 5 (content, no training) | 0.1385 | 0.0781 | 0.0634 |
| SASRec (random init) | 0.2256 ± 0.0145 | 0.1000 ± 0.0054 | 0.0710 ± 0.0023 |
| SASRec (CLIP-init) | 0.1949 ± 0.0145 | 0.1000 ± 0.0038 | 0.0857 ± 0.0049 |
