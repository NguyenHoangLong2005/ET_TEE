# Sprint 5 — Tìm kiếm bằng lời mô tả và bằng ảnh (`/search`)

## Kiến trúc

```
web /search ──▶ GET  /api/search?q=...        ─┐
           └──▶ POST /api/search/image (ảnh)  ─┤ SemanticSearchService (backend)
                                                │   ├─ từ khóa: mọi từ có trong tên / mô tả / slug / loại
                                                │   ├─ EmbedderClient ──▶ services/embedder (FastAPI, CPU)
                                                │   │                     câu / ảnh → vector CLIP 512 chiều
                                                │   └─ pgvector HNSW trên product_embeddings (Sprint 1)
                                                └─ trộn từ khóa + vector bằng Reciprocal Rank Fusion
```

- Bộ mã hóa truy vấn dùng **đúng model và revision của Sprint 1** (ảnh `clip-ViT-B-32@327ab672`,
  văn bản `clip-ViT-B-32-multilingual-v1@58edf8ca`), chạy offline từ cache Hugging Face. Khác revision
  thì vector truy vấn sẽ nằm sai không gian.
- Tìm bằng ảnh: vector ảnh tải lên so với vector trộn của sản phẩm (70% là ảnh).
- Bộ mã hóa tắt → tìm kiếm tự quay về **chỉ từ khóa** (`strategy: KEYWORD`) và không gọi lại trong
  30 giây. Tìm bằng ảnh trả 503. Ảnh: JPG/PNG/WEBP, tối đa 5 MB, 20 lượt/phút mỗi IP.

## Chạy

```bash
pip install -r services/embedder/requirements.txt
python services/embedder/app.py                    # http://127.0.0.1:8090 (backend: app.search.embedder-url)
python scripts/search/eval_search.py               # đánh giá (cần embedder đang chạy)
```

Đo trên CPU máy này: mã hóa câu ~25 ms, mã hóa ảnh ~150 ms, sau khi giới hạn `torch.set_num_threads(4)`.
Không giới hạn thì torch trên Windows tạo quá nhiều luồng: một câu mất ~3 s, một ảnh ~10 s. Không cần Colab.

## Đánh giá — [results.md](results.md)

30 câu hỏi tự nhiên viết tay, cố ý không lặp lại nguyên tên trong catalog, cộng 20 câu kiểm chứng viết
ngày 2026-10-07. "Đúng" = đúng loại sản phẩm và nhóm khách (thêm từ khóa nếu câu hỏi yêu cầu, ví dụ "jean").

| Cách tìm | P@10 (30 câu) | P@10 (20 câu kiểm chứng) | Câu không ra kết quả |
|---|---:|---:|---:|
| Từ khóa (cách cũ) | 0.203 | 0.330 | **14/30**, 6/20 |
| Chỉ vector trộn | 0.240 | 0.195 | 0 |
| RRF: từ khóa + văn bản + vector trộn | 0.270 | 0.240 | 0 |
| RRF: từ khóa + vector trộn (bản phục vụ cũ) | 0.350 | 0.320 | 0 |
| RRF từ khóa ×2 + vector trộn **đã căn giữa** | 0.443 | 0.505 | 0 |
| **… + ưu tiên đúng loại / nhóm khách (bản phục vụ từ 2026-10-07)** | **0.760** | **0.730** | 0 |

### Sửa 2026-10-07: vài sản phẩm "hub" chiếm đầu mọi kết quả

Vector văn bản CLIP của câu hỏi nằm gần một nhóm nhỏ sản phẩm (tất nam cổ trung, quần soóc jean nữ,
chân váy nỉ…) bất kể câu hỏi là gì, và RRF cho hạng 1 của danh sách vector điểm ngang hạng 1 của từ khóa,
nên chúng chen lên đầu. `SemanticSearchService` giờ:

1. trừ vector trung bình của 30 cụm từ mua sắm chung (`CENTER_PHRASES`) khỏi vector câu hỏi rồi xếp theo
   tích vô hướng — bỏ hướng "câu nào cũng giống" (cách giảm hubness quen thuộc). Thử thêm CSLS (phạt từng
   sản phẩm theo độ "hub") thì kém hơn, không dùng;
2. cho danh sách từ khóa trọng số ×2 trong RRF;
3. đưa sản phẩm đúng loại / nhóm khách được nhắc trong câu ("váy", "áo khoác", "nữ", "bé"…) lên trước,
   giữ nguyên thứ tự bên trong mỗi phần.

Bộ 20 câu kiểm chứng được viết **sau** khi thấy lỗi nhưng **trước** khi chọn cách sửa; còn danh sách từ
nhận diện loại/nhóm thì viết sau khi đã xem cả hai bộ, nên con số 0.73–0.76 vẫn lạc quan hơn thực tế.
Tìm bằng ảnh không đổi (ảnh → ảnh vốn đã đúng).

Lưu ý khi thử bằng `curl` trong Git Bash trên Windows: câu tiếng Việt truyền qua dòng lệnh có thể bị sai
mã hóa trước khi tới backend và cho kết quả vô nghĩa. Thử bằng trình duyệt hoặc `eval_search.py`.

### Đọc kết quả cho trung thực

- Lợi ích rõ nhất: cách cũ **không trả về gì** với gần một nửa câu hỏi tự nhiên; bản mới luôn có kết quả
  và độ chính xác tăng từ 0.20 lên 0.35.
- Mình đã giả định vector **văn bản riêng** (`product_text_embeddings`, `build_text_embeddings.py`) sẽ
  tốt hơn vì so văn bản với văn bản. Đo thì ngược lại: thêm nó vào RRF làm kết quả **giảm**
  (0.350 → 0.270), nên backend không dùng. Bảng và script được giữ lại để tái lập thí nghiệm; migration
  `V20261009000000` đã áp dụng nên không xóa được.
- Bộ 30 câu hỏi do mình tự soạn, nhỏ, nhãn đúng/sai theo thuộc tính. Đủ để chọn giữa các cách, không đủ
  để khẳng định chất lượng với khách thật. Một số câu vẫn kém (ví dụ "dép đi trong nhà",
  "quần tây đi làm cho nam": catalog gọi là "quần âu").
