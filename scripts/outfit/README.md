# Sprint 4 — Outfit Compatibility "Phối trọn bộ" (trang chi tiết sản phẩm)

Hoàn thiện một bộ đồ quanh sản phẩm đang xem: áo → quần + áo khoác + phụ kiện, đầm → áo khoác +
phụ kiện, ... Mỗi món phải hợp với sản phẩm đang xem **và** hợp với các món đã chọn.

## Mô hình

Conditional Similarity Network (Veit et al., 2017; hướng *type-aware embedding* của Vasileva et al.,
2018 trên Polyvore), dựng trên vector CLIP 512 chiều của Sprint 1 (cố định):

```
g(x)          = normalize(MLP(clip(x)))                 512 → 256 → 128
compat(a, b)  = Σ_k mask[vị_trí(a), vị_trí(b)][k] · g(a)[k] · g(b)[k]  +  bias(b)
```

- Mỗi **cặp vị trí** (áo–quần, quần–phụ kiện, ...) có một mặt nạ riêng trên 128 chiều. "Hợp nhau"
  khác "giống nhau": áo và quần hợp nhau dù ảnh không giống nhau.
- `bias(b)`: mức độ món b được chọn làm món đi kèm nói chung (thành phần phổ biến của BPR).
- Học bằng BPR. Cặp dương: 2 món khác vị trí cùng một đơn hàng, và 2 lần xem liên tiếp cùng phiên
  khác vị trí. Cặp âm: thay món thứ hai bằng món ngẫu nhiên **cùng vị trí, cùng nhóm khách**.
- Ghép bộ khi phục vụ (`OutfitService`): lần lượt từng vị trí trong mẫu, điểm =
  `compat(sản phẩm đang xem, ứng viên) + 0.5 × trung bình compat(món đã chọn, ứng viên)`.
  Mỗi vị trí kèm 2 phương án thay thế. Sản phẩm model chưa biết thì giữ cách cũ (theo luật).

## Chạy

```bash
python scripts/outfit/train_outfit.py     # chọn số epoch theo valid, đo trên test, học lại toàn bộ, xuất model
```

Xuất ra `backend/src/main/resources/models/outfit/{outfit.bin, outfit.json}` (~1.4 MB) và fixture
cho `OutfitModelParityTest` (Java phải tính điểm giống numpy). CPU, vài phút, không cần Colab.

## Đánh giá — xem [results.md](results.md)

Chia theo thời gian: đơn cũ để train, nhóm đơn kế tiếp làm **valid** (chọn số epoch), nhóm đơn mới
nhất làm **test**. Fill-in-the-blank: biết món a của một đơn, xếp hạng món b thật trong **toàn bộ**
ứng viên cùng vị trí / nhóm khách (đúng tập ứng viên lúc phục vụ).

| | HR@10 | MRR | AUC | Độ phủ top-1 |
|---|---:|---:|---:|---:|
| Ngẫu nhiên | 0.035 | – | 0.500 | – |
| Bán chạy trong vị trí | 0.207 | 0.130 | 0.718 | 4 |
| CLIP giống nhau | 0.030 | 0.020 | 0.452 | 1272 |
| **CSN trên CLIP** | **0.203** | 0.108 | **0.734** | **485** |

### Đọc kết quả cho trung thực

- CLIP "giống nhau" còn **kém hơn ngẫu nhiên** (AUC 0.45): món giống nhau không phải món phối được
  với nhau. Đây là lý do cần một mô hình tương thích riêng thay vì dùng lại "Sản phẩm tương tự".
- Về độ chính xác, CSN **ngang** baseline "bán chạy" (HR@10 0.203 so với 0.207; AUC tốt hơn, MRR
  thấp hơn). Dữ liệu mô phỏng chọn món đi kèm chủ yếu theo độ phổ biến và thuộc tính, nên phổ biến
  là baseline rất mạnh.
- Khác biệt thật nằm ở **độ phủ**: baseline "bán chạy" dùng đúng 4 món cho mọi trang sản phẩm (ai
  cũng thấy một bộ), còn CSN dùng 485 món khác nhau, bộ phối đổi theo từng sản phẩm.
- **Đơn hàng và hành vi là dữ liệu mô phỏng.** Kết quả chứng minh pipeline và cách đánh giá; muốn
  khẳng định chất lượng phối đồ cần dữ liệu outfit thật (ví dụ Polyvore) hoặc đánh giá của người dùng.
