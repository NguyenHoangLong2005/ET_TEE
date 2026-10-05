# Sprint 4 - Outfit Compatibility: ket qua offline

Sinh luc 2026-10-04 19:18 boi `scripts/outfit/train_outfit.py`.

- 2753 san pham ACTIVE co vector CLIP va thuoc vi tri phoi duoc (ao / quan / dam / ao khoac / phu kien).
- Train: 992 cap cung don + 16410 cap xem lien tiep cung phien, truoc 2026-08-21. Valid (chon so epoch = 15): don tu 2026-08-21. Test: don tu 2026-09-10.
- Fill-in-the-blank: biet mon a, xep hang mon b that trong TOAN BO ung vien cung vi tri va nhom khach.
- Do phu: so mon khac nhau dung dau mot vi tri khi xem lan luot tung san pham (cao = bo phoi doi theo san pham).
- **Hanh vi va don hang la du lieu mo phong** (`scripts/generate_synthetic_data.py`).

| Mo hinh | HR@10 | MRR | AUC | Do phu top-1 |
|---|---:|---:|---:|---:|
| Ngau nhien (ky vong) | 0.0346 | nan | 0.5000 | - |
| Ban chay trong vi tri | 0.2067 | 0.1302 | 0.7176 | 4 |
| CLIP giong nhau (cosine) | 0.0300 | 0.0199 | 0.4520 | 1272 |
| CSN tren CLIP (Sprint 4) | 0.2033 | 0.1082 | 0.7340 | 485 |
