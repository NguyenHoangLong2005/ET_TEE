# Sprint 5 - Tim kiem: ket qua tren bo cau hoi viet tay

"Dung" = dung loai san pham + nhom khach (+ tu khoa neu cau hoi yeu cau). Bo cau hoi tu xay, nho - chi de so sanh cac cach, khong phai benchmark chuan.

2026-10-07: ban cu tra ve cung vai san pham "hub" (tat, ao so mi tron) cho moi cau ("vay di tiec" -> tat nam). Sua: tru vector trung binh cua cac cau chung (can giua) truoc khi tim vector, trong so tu khoa x2 trong RRF, roi dua san pham dung loai/nhom khach duoc nhac trong cau len truoc. Bo 20 cau kiem chung viet SAU khi thay loi; cac tu nhan dien loai/nhom duoc viet sau khi xem ca hai bo, nen so lieu van lac quan hon thuc te.

## 30 cau goc

| Cach tim | P@10 | nDCG@10 | Cau khong ra ket qua |
|---|---:|---:|---:|
| Tu khoa (hien tai) | 0.203 | 0.233 | 14/30 |
| Vector tron anh+text (Sprint 1) | 0.240 | 0.249 | 0/30 |
| Vector van ban (Sprint 5) | 0.207 | 0.223 | 0/30 |
| RRF: tu khoa + van ban + tron (da thu, bi loai) | 0.270 | 0.271 | 0/30 |
| RRF: tu khoa + tron (ban cu, truoc 2026-10-07) | 0.350 | 0.379 | 0/30 |
| RRF tu khoa x2 + tron da can giua | 0.443 | 0.468 | 0/30 |
| ... + uu tien dung loai/nhom (BAN PHUC VU) | 0.760 | 0.794 | 0/30 |

## 20 cau kiem chung

| Cach tim | P@10 | nDCG@10 | Cau khong ra ket qua |
|---|---:|---:|---:|
| Tu khoa (hien tai) | 0.330 | 0.342 | 6/20 |
| Vector tron anh+text (Sprint 1) | 0.195 | 0.183 | 0/20 |
| Vector van ban (Sprint 5) | 0.160 | 0.169 | 0/20 |
| RRF: tu khoa + van ban + tron (da thu, bi loai) | 0.240 | 0.247 | 0/20 |
| RRF: tu khoa + tron (ban cu, truoc 2026-10-07) | 0.320 | 0.351 | 0/20 |
| RRF tu khoa x2 + tron da can giua | 0.505 | 0.515 | 0/20 |
| ... + uu tien dung loai/nhom (BAN PHUC VU) | 0.730 | 0.747 | 0/20 |
