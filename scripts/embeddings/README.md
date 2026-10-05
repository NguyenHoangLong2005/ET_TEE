# Product embeddings — "Sản phẩm tương tự" (content-based, Sprint 1)

Mỗi sản phẩm → 1 vector 512 chiều trong không gian CLIP, lưu ở `public.product_embeddings`
(pgvector, HNSW cosine). Backend `GET /api/products/{slug}/similar?limit=10` lấy các lân cận gần nhất.

```
e_final = L2( 0.7 · L2(v_image) + 0.3 · L2(v_text) )      # không có ảnh / ảnh lỗi → e_final = L2(v_text)
```

| Nhánh | Model | Ghi chú |
|---|---|---|
| Ảnh | `sentence-transformers/clip-ViT-B-32` (= `openai/clip-vit-base-patch32`) | ảnh chính: `is_primary` rồi `sort_order` nhỏ nhất |
| Text | `sentence-transformers/clip-ViT-B-32-multilingual-v1` | đọc tiếng Việt, được distill vào cùng không gian với encoder ảnh ở trên |

Text chỉ ghép từ trường có thật trong DB (tên, danh mục/loại, chất liệu, style, tối đa 3 màu variant, đối tượng,
tags, thương hiệu, mô tả); trường rỗng bị bỏ qua. Chi tiết: cell 5 của notebook.

## Tạo embedding: Google Colab GPU

Embedding được tạo trên Colab, **không** chạy model trên máy local. Xem [COLAB_README.md](COLAB_README.md).

| File | Vai trò |
|---|---|
| `colab_product_embeddings.ipynb` | notebook chạy trên Colab (sinh từ file .py) |
| `colab_product_embeddings.py` | nguồn của notebook / bản .py dự phòng |
| `build_notebook.py` | sinh lại .ipynb sau khi sửa .py: `python scripts/embeddings/build_notebook.py` |
| `package_local_images.py` | zip ảnh `/images/...` (chỉ có ở `web/public`) để upload lên Drive cho Colab |
| `sanity_check.py` | kiểm tra lân cận + `EXPLAIN ANALYZE` từ máy local (chỉ đọc) |
| `common.py` | kết nối DB từ `.env` cho các script local |

## Backend

- Schema: `V20261006000000__product_embeddings_pgvector.sql`. Bảng này **không** có JPA entity
  (test chạy trên H2 không có kiểu `vector`); truy vấn là native query
  `ProductRepository.findSimilarIdsByEmbedding`.
- Truy vấn: bật `hnsw.iterative_scan = relaxed_order` (chỉ trong transaction đó), KNN qua HNSW kèm lọc
  `id <> :id`, `status = 'ACTIVE'`, cùng `target_group`. Index quét tiếp tới khi đủ `limit` kết quả, rồi sắp
  lại theo khoảng cách. Đo trên DB thật (2.875 SP): 0/300 SP thiếu kết quả, p95 khoảng 2.5 ms.
- Fallback: sản phẩm chưa có embedding (thêm sau lần chạy notebook cuối) hoặc nhóm quá ít sản phẩm
  → bù bằng luật cũ cùng `product_type` **và cùng `target_group`**.
- Sản phẩm mới tạo trong admin chỉ có vector sau khi chạy lại notebook (chỉ tính phần mới/thay đổi).
