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

30 câu hỏi tự nhiên viết tay, cố ý không lặp lại nguyên tên trong catalog. "Đúng" = đúng loại sản phẩm
và nhóm khách (thêm từ khóa nếu câu hỏi yêu cầu, ví dụ "jean").

| Cách tìm | P@10 | nDCG@10 | Câu không ra kết quả |
|---|---:|---:|---:|
| Từ khóa (cách cũ) | 0.203 | 0.233 | **14/30** |
| Chỉ vector trộn | 0.240 | 0.249 | 0/30 |
| Chỉ vector văn bản riêng | 0.207 | 0.223 | 0/30 |
| **RRF: từ khóa + vector trộn (bản phục vụ)** | **0.350** | **0.379** | 0/30 |
| RRF: từ khóa + văn bản + vector trộn | 0.270 | 0.271 | 0/30 |

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
