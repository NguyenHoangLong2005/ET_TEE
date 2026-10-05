# Tạo product embedding trên Google Colab GPU

Notebook: `scripts/embeddings/colab_product_embeddings.ipynb`
Bản .py dự phòng (cùng nội dung): `scripts/embeddings/colab_product_embeddings.py`

> Đây là **embedding generation** (inference): dùng model có sẵn để tạo vector, không cập nhật trọng số.
> Không có training/fine-tuning nào ở bước này.

Colab chỉ tạo embedding. Backend Spring Boot, Supabase/pgvector, API `/api/products/{slug}/similar` giữ nguyên.

## Model

| | Image encoder | Text encoder |
|---|---|---|
| Hugging Face | [`sentence-transformers/clip-ViT-B-32`](https://huggingface.co/sentence-transformers/clip-ViT-B-32) | [`sentence-transformers/clip-ViT-B-32-multilingual-v1`](https://huggingface.co/sentence-transformers/clip-ViT-B-32-multilingual-v1) |
| Revision (pin trong notebook) | `327ab6726d33c0e22f920c83f2ff9e4bd38ca37f` | `58edf8cada9e398793dca955574a48cbb7f18be2` |
| Kiến trúc | OpenAI CLIP ViT-B/32 (`openai/clip-vit-base-patch32`), ảnh 224×224, patch 32 | DistilBERT multilingual (6 layer) → mean pooling 768 → Dense 768→512 (không bias), max 128 token |
| Output | 512 | 512 |
| Tiếng Việt | – | Có: `vi` nằm trong danh sách ngôn ngữ dùng để align (model card) |
| License | Model card không ghi license. Upstream OpenAI CLIP phát hành theo MIT (repo github.com/openai/CLIP). **Tự kiểm tra lại nếu dùng thương mại.** | Apache-2.0 (model card) |

**Vì sao cộng được `0.7·image + 0.3·text`:** model card của text model ghi rõ nó được tạo bằng
*Multilingual Knowledge Distillation* với **teacher là chính `clip-ViT-B-32`**, để "map text (50+ languages) and
images to a common dense vector space", và "the image encoder from CLIP is unchanged". Nghĩa là vector text tiếng
Việt nằm trong **cùng không gian** với vector ảnh của đúng image encoder này. Hai vector cùng 512 chiều và cùng hệ
toạ độ nên tổ hợp tuyến tính có nghĩa.

Lưu ý thực tế (không chặn pipeline nhưng nên biết):

- **Chỉ đúng khi dùng đúng cặp model này.** Đổi image encoder (vd ViT-L/14, SigLIP) hoặc text model khác thì
  hai không gian không còn khớp và phép cộng mất nghĩa. Notebook pin cả hai revision.
- CLIP có *modality gap*: vector ảnh và vector text của cùng sản phẩm không trùng nhau (cos thường chỉ ~0.2–0.35).
  Vì mọi sản phẩm đều được fuse theo cùng công thức, so sánh sản phẩm–sản phẩm vẫn nhất quán. Tỉ lệ 0.7/0.3 là
  heuristic của spec, chưa được hiệu chỉnh trên dữ liệu thật.
- Text model được distill trên câu song ngữ tổng quát, không chuyên thời trang: chất lượng với thuật ngữ thời trang
  tiếng Việt cần nhìn kết quả ở cell 16 để đánh giá.
- Cell 13 có một kiểm tra thực nghiệm: vector ảnh của mỗi sản phẩm phải gần text của chính nó hơn text của sản
  phẩm khác (chênh ≥ 0.02). Nếu FAIL, notebook **không upload**.

**Thư viện:** `sentence-transformers>=3.0`, `torch` (có sẵn trên Colab), `psycopg2-binary`, `pyarrow`, `pandas`,
`numpy`, `Pillow`, `requests`. Cell 2 chỉ cài phần còn thiếu.

**GPU/VRAM:** tổng trọng số < 1 GB (fp32). T4 16 GB (Colab miễn phí) là thừa. Tối thiểu khoảng 4 GB. Batch size tự
chọn theo VRAM (≥14 GB → 256, ≥7 → 128, ≥3.5 → 64, CPU → 32). Gặp CUDA OOM thì tự giảm một nửa. Thời gian full
catalog chủ yếu là thời gian tải ảnh từ CDN, phần GPU chỉ vài phút.

## 1. Mở notebook trên Colab

1. Vào https://colab.research.google.com → **File → Upload notebook** → chọn
   `scripts/embeddings/colab_product_embeddings.ipynb` (hoặc tab *Upload*, kéo thả file).
2. Notebook chạy độc lập: không import file nào khác trong repo.

## 2. Bật GPU

**Runtime → Change runtime type → Hardware accelerator: T4 GPU → Save.** Cell 1 in ra `nvidia-smi`. Cell 6 in tên GPU
và VRAM; nếu thấy `! Không có CUDA` thì GPU chưa bật (notebook vẫn chạy được trên CPU nhưng chậm).

## 3. Secrets

Thanh bên trái → biểu tượng **chìa khoá (Secrets)** → *Add new secret*, bật **Notebook access** cho từng secret.

| Secret | Bắt buộc | Giá trị |
|---|---|---|
| `DB_URL` | có (hoặc `DATABASE_URL`) | copy nguyên `DB_URL` trong file `.env` của backend: `jdbc:postgresql://aws-...pooler.supabase.com:6543/postgres?...` (dạng `postgresql://...` cũng được) |
| `DB_USERNAME` | có (nếu URL không chứa user) | như `.env` (`postgres.<project-ref>`) |
| `DB_PASSWORD` | có (nếu URL không chứa password) | như `.env` |
| `DATABASE_URL` | thay cho 3 secret trên | `postgresql://USER:PASSWORD@HOST:PORT/postgres` |
| `HF_TOKEN` | không | token Hugging Face (read). Model public, token chỉ giúp tải nhanh và ít bị giới hạn |

- Dùng host **pooler** (`*.pooler.supabase.com`) như trong `.env`. Host trực tiếp `db.<ref>.supabase.co` thường chỉ có
  IPv6, Colab không kết nối được.
- Notebook không in secret: lỗi kết nối chỉ in dòng đầu của thông báo lỗi (không chứa password).
- Không dán secret vào cell code.

## 4. Chạy TEST MODE (20 sản phẩm, Giai đoạn A)

0. (Một lần, ở máy local) đóng gói 668 ảnh có đường dẫn tương đối `/images/...` mà Colab không thấy:
   ```bash
   python scripts/embeddings/package_local_images.py
   ```
   Upload `scripts/embeddings/colab_upload/local_images.zip` (~27 MB) vào Google Drive, thư mục
   `MyDrive/fashion-embeddings/`. Nếu bỏ qua bước này, các sản phẩm đó dùng fallback text-only. Lần chạy sau
   khi có zip, chúng được tự động thử lại (`RETRY_FAILED_IMAGES = True`).
1. Giữ cell **3. Cấu hình** mặc định: `RUN_MODE = "test"`.
2. **Runtime → Run all.** Cell 3 hỏi quyền Google Drive: đồng ý (checkpoint lưu trên Drive).
3. Cell đầu tiên cần chạy là cell 1. "Run all" chạy tuần tự từ trên xuống, không cần chạy riêng cell nào.

## 5. Kiểm tra kết quả ở đâu

| Cell | Xem gì |
|---|---|
| 4 | `Kết nối DB OK`, phiên bản pgvector, schema `public.product_embeddings` khớp, HNSW index |
| 5 | Số sản phẩm, phân bố `target_group`, **8 ví dụ text thực tế đưa vào model** |
| 6 | GPU, `Image embedding dim: 512`, `Text embedding dim: 512`, số text bị cắt ở 128 token |
| 7–10 | Demo 4 sản phẩm: trạng thái tải ảnh, shape, norm trước/sau L2, cos(final, image/text) |
| 12 | Tiến độ theo chunk, tên file checkpoint |
| 13 | **PASS/FAIL** các kiểm tra 1–8, fallback text-only, kiểm tra cùng vector space → `VALIDATION_PASSED` |
| 15 | Số dòng upsert |
| 16 | `SELECT COUNT(*)`, không duplicate, `vector_dims`/`vector_norm` trong DB, vector đọc lại khớp parquet, top-10 similar của 5 SP ngẫu nhiên (đọc tên để đánh giá "gu"), kiểm tra 9–13, `EXPLAIN ANALYZE` → `POST_UPLOAD_PASSED` |
| cuối | Tổng kết + file `reports/run-*.json` |

Chỉ chuyển giai đoạn khi `VALIDATION_PASSED = True`, `POST_UPLOAD_PASSED = True` **và** đọc kết quả similar ở
cell 16 thấy hợp lý.

## 6. Resume sau khi Colab disconnect

Không cần làm gì đặc biệt: mở lại notebook, **Run all** với cùng cấu hình.

- Mỗi `CHUNK_SIZE` (256) sản phẩm được ghi thành `checkpoints/<model>/part-*.parquet` trên Drive (ghi file tạm rồi
  rename, nên không có file dở dang). Mất kết nối giữa chừng chỉ mất tối đa 1 chunk.
- Lần chạy sau bỏ qua sản phẩm đã có **trong DB** hoặc **trong checkpoint** với cùng `input_hash`
  (sha256 của model + revision + trọng số + text đầu vào + URL ảnh). Cell 12 in
  `đã có trong DB X, có trong checkpoint Y, cần chạy model Z`.
- Sản phẩm bị sửa (tên, màu, ảnh...) → hash đổi → tự tính lại.
- Đổi `IMAGE_WEIGHT/TEXT_WEIGHT` → fuse lại từ vector ảnh/text đã lưu trong checkpoint, **không chạy lại model**.
- Ảnh đã tải được cache ở `image_cache/` trên Drive.
- Upload là UPSERT theo `product_id`, chạy lại không tạo duplicate. Dòng giống hệt (cùng `input_hash`) không bị ghi lại.

## 7. Chạy 100 / 500 / toàn bộ

Chỉ sửa **cell 3. Cấu hình**, dòng `RUN_MODE`, rồi Run all:

| Giai đoạn | `RUN_MODE` |
|---|---|
| A | `"test"` (20) |
| B | `"100"` |
| C | `"500"` |
| D | `"full"` (toàn bộ catalog) |

Catalog sắp theo thứ tự giả ngẫu nhiên cố định (`md5(id)`): 20 SP của A nằm trong 100 SP của B, v.v. Phần đã làm
được bỏ qua. `LIMIT = <số>` ghi đè số lượng nếu cần. `UPLOAD_TO_DB = False` để chỉ tạo + kiểm tra + export.

## 8. Kiểm tra database sau khi chạy

Cell 16 làm tự động. Kiểm tra tay (Supabase SQL editor hoặc máy local):

```sql
SELECT COUNT(*) FROM public.product_embeddings;
SELECT source, COUNT(*) FROM public.product_embeddings GROUP BY source;
SELECT COUNT(*) - COUNT(DISTINCT product_id) AS duplicates FROM public.product_embeddings;
```

```bash
python scripts/embeddings/sanity_check.py
python scripts/embeddings/sanity_check.py --slug <slug>
```

API (khi backend local đang chạy): `GET http://localhost:8081/api/products/<slug>/similar?limit=10`.

## 9. File output (Google Drive `MyDrive/fashion-embeddings/`)

| Đường dẫn | Nội dung |
|---|---|
| `local_images.zip` | (bạn upload) ảnh `/images/...` |
| `image_cache/` | ảnh CDN đã tải |
| `checkpoints/<model>/part-*.parquet` | checkpoint theo chunk (có cả vector ảnh và vector text riêng) |
| `product_embeddings.parquet` | export đã kiểm tra: `product_id, embedding, source, image_embedding, text_embedding, model_name, model_version, image_model(_revision), text_model(_revision), image_weight, text_weight, input_hash, modal_hash, text_input, image_url, image_status, source_updated_at, created_at` |
| `reports/run-<mode>-<time>.json` | thống kê + kết quả từng kiểm tra |

Upload DB thất bại → chạy lại notebook: checkpoint/parquet còn nguyên, cell 12 báo `cần chạy model 0`, chỉ upload lại.

## 10. Xử lý lỗi

| Lỗi | Cách xử lý |
|---|---|
| **CUDA Out Of Memory** | Tự giảm batch một nửa (in `! CUDA OOM ... giảm batch xuống N`). Nếu vẫn lỗi: đặt `BATCH_SIZE = 32` ở cell 3, hoặc *Runtime → Restart session* rồi Run all (resume từ checkpoint). |
| **Hugging Face tải chậm/lỗi** | Thêm secret `HF_TOKEN`. Chạy lại cell 6 (đã tải xong phần nào thì giữ trong cache của runtime). Lỗi `revision not found`: không đổi revision trong cell 3. |
| **Ảnh CDN lỗi** | Không dừng pipeline: SP đó dùng text-only, cell 13/tổng kết thống kê theo loại (`http_404`, `timeout`, `connection_error`, `decode_error`, `not_image`, `too_large`, `relative_unavailable`). Có retry 3 lần (backoff) cho 429/5xx/timeout. Chạy lại notebook sẽ tự thử lại các SP text-only có URL ảnh. |
| **`relative_unavailable` nhiều** | Chưa upload `local_images.zip` đúng chỗ (`MyDrive/fashion-embeddings/local_images.zip`). |
| **Kết nối DB lỗi** | Kiểm tra secret (tên đúng, đã bật Notebook access), dùng host pooler (IPv4). `password authentication failed` → sai user/password (user pooler dạng `postgres.<project-ref>`). Timeout → thử lại sau; upload có tự kết nối lại 3 lần. |
| **`Không có bảng public.product_embeddings`** | Migration Flyway `V20261006000000__product_embeddings_pgvector.sql` chưa chạy: khởi động backend một lần. Notebook không tự tạo schema. |
| **`VALIDATION_PASSED = False`** | Không upload. Xem dòng `[FAIL]` ở cell 13. |

## Database được bảo vệ thế nào

- Mọi truy vấn đọc chạy trong `SET TRANSACTION READ ONLY` rồi rollback: Postgres từ chối mọi lệnh ghi trong đó.
- Lệnh ghi duy nhất là một câu `INSERT INTO public.product_embeddings ... ON CONFLICT (product_id) DO UPDATE`,
  được kiểm tra bằng `_assert_safe_write` (chỉ bảng này, một câu lệnh, không DELETE/DROP/TRUNCATE/ALTER, không `ettee.`).
- Toàn bộ SQL dùng tham số (`%s` / `%(name)s`, `execute_values`). Không nối chuỗi giá trị vào SQL.
- Không tạo/sửa schema. Kiểm tra cột và kiểu `vector(512)` trước khi chạy.
- Chỉ upload khi `VALIDATION_PASSED`, và chỉ các dòng qua kiểm tra từng dòng (512 chiều, hữu hạn, norm ≈ 1).
