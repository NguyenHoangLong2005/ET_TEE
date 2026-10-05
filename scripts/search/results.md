# Sprint 5 - Tim kiem: ket qua tren bo cau hoi viet tay

30 cau hoi tu nhien (danh sach trong `eval_search.py`), "dung" = dung loai san pham + nhom khach (+ tu khoa neu cau hoi yeu cau). Bo cau hoi tu xay, nho - chi de so sanh cac cach.

| Cach tim | P@10 | nDCG@10 | Cau khong ra ket qua |
|---|---:|---:|---:|
| Tu khoa (hien tai) | 0.203 | 0.233 | 14/30 |
| Vector tron anh+text (Sprint 1) | 0.240 | 0.249 | 0/30 |
| Vector van ban (Sprint 5) | 0.207 | 0.223 | 0/30 |
| RRF: tu khoa + tron (BAN PHUC VU) | 0.350 | 0.379 | 0/30 |
| RRF: tu khoa + van ban + tron (da thu, bi loai) | 0.270 | 0.271 | 0/30 |
