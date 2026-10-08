-- Content-based "San pham tuong tu" (Sprint 1): moi san pham co 1 vector CLIP 512 chieu
-- (0.7 * anh + 0.3 * text, da chuan hoa L2). Vector do scripts/embeddings/build_product_embeddings.py
-- tinh offline va ghi vao day; backend chi doc de truy van ANN.
-- Khong map bang nay thanh JPA entity: test chay tren H2 (ddl-auto create-drop) khong co kieu vector.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS product_embeddings (
    product_id    BIGINT       NOT NULL,
    embedding     vector(512)  NOT NULL,
    -- 'fused' = anh + text, 'text' = fallback khi san pham khong co anh / anh loi
    source        VARCHAR(10)  NOT NULL,
    model_version VARCHAR(150) NOT NULL,
    -- sha256 cua dau vao (text + url anh + model + alpha): script bo qua san pham khong doi
    input_hash    VARCHAR(64)  NOT NULL,
    updated_at    TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT product_embeddings_pkey PRIMARY KEY (product_id),
    CONSTRAINT product_embeddings_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT product_embeddings_source_chk CHECK (source IN ('fused', 'text'))
);

-- Vector da chuan hoa L2 nen cosine (<=>) tuong duong tich vo huong.
CREATE INDEX IF NOT EXISTS idx_product_embeddings_hnsw
    ON product_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
