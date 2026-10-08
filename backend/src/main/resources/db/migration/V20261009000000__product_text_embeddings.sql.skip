-- Sprint 5 (tim kiem theo y nghia): vector CHI TU VAN BAN cua san pham (clip-ViT-B-32-multilingual-v1,
-- cung text dau vao voi Sprint 1). Cau tim kiem la van ban: so van ban voi van ban cho do tuong dong ro hon
-- nhieu so voi vector tron (0.7 anh + 0.3 text) cua product_embeddings. Tinh boi
-- scripts/search/build_text_embeddings.py (CPU), backend chi doc.
CREATE TABLE IF NOT EXISTS product_text_embeddings (
    product_id    BIGINT       NOT NULL,
    embedding     vector(512)  NOT NULL,
    model_version VARCHAR(150) NOT NULL,
    input_hash    VARCHAR(64)  NOT NULL,
    updated_at    TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT product_text_embeddings_pkey PRIMARY KEY (product_id),
    CONSTRAINT product_text_embeddings_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_text_embeddings_hnsw
    ON product_text_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
