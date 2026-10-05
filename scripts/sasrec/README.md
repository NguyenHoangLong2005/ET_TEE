# Sprint 2 — SASRec cho "Dành riêng cho bạn" (trang chủ)

Mô hình tuần tự (Self-Attention Sequential Recommendation, Kang & McAuley 2018) dự đoán sản phẩm
tiếp theo từ chuỗi xem / thêm giỏ / mua gần nhất của khách. Vector sản phẩm khởi tạo từ CLIP của
Sprint 1 (`product_embeddings`).

## Luồng dữ liệu

```
web  ── VIEW ──────────────▶ POST /api/events ─┐
web  ── thêm giỏ / đặt hàng ▶ Cart/OrderController ┴─▶ user_behavior_events
                                                         │
scripts/sasrec/train.py  ◀── chuỗi theo user ────────────┤   (offline, CPU vài phút)
   └─▶ backend/src/main/resources/models/sasrec/{sasrec.onnx, items.json}
                                                         │
GET /api/recommendations/for-you ── 200 event gần nhất ──┘
   ForYouService ─▶ SasrecModel (ONNX Runtime, Java) ─▶ top-K sản phẩm ACTIVE, bỏ món vừa xem
                └─▶ không có model: trung bình CLIP 5 món gần nhất ─▶ pgvector (HNSW)
```

Danh mục ~3k sản phẩm nên mô hình chấm điểm **toàn bộ** catalog trực tiếp (vài ms), không cần ANN;
pgvector chỉ dùng cho nhánh fallback.

## Chạy

```bash
pip install torch numpy psycopg2-binary python-dotenv onnx onnxruntime onnxscript
python scripts/sasrec/train.py          # baseline + SASRec (3 seed), ghi results.md, xuất ONNX
python scripts/sasrec/sweep.py          # dò siêu tham số trên tập VALID
```

Không cần Colab: ~800 user × ~40 token train trên CPU trong vài phút.
Sau khi train lại, khởi động lại backend để nạp model mới; `SasrecModelParityTest` kiểm tra Java
xếp hạng giống hệt PyTorch.

## Những điểm cần nói rõ khi báo cáo

- **Hành vi là dữ liệu mô phỏng** (`scripts/generate_synthetic_data.py`): phiên có chủ đề, phối đồ
  áo → quần → phụ kiện, so sánh cùng loại, đổi ý định giữa phiên. Kết quả chứng minh pipeline và mô
  hình học được cấu trúc chuỗi, **không** phải hiệu quả trên khách thật.
- Item được chọn trong mô phỏng theo thuộc tính catalog, không theo CLIP, để mô hình CLIP-init không
  được chấm trên dữ liệu sinh ra từ chính CLIP.
- Đánh giá xếp hạng trên toàn catalog, không lấy mẫu âm (metric lấy mẫu làm phồng kết quả).
- Kết quả và so sánh baseline: [results.md](results.md).

## Giới hạn

- Sản phẩm thêm sau lần train không có trong từ điển model: không được gợi ý tới khi train lại
  (vẫn xuất hiện ở các khối khác). Sự kiện trên sản phẩm lạ bị bỏ qua khi dựng chuỗi.
- Một token cho mỗi sản phẩm liên tiếp, không phân biệt VIEW / ADD_TO_CART / PURCHASE.
