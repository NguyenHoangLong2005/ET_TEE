-- Index for active status + target_group filtering (most common catalog query)
CREATE INDEX IF NOT EXISTS idx_products_status_tg ON products(status, target_group);

-- Index for target_group + gender filtering (kids boys/girls queries)
CREATE INDEX IF NOT EXISTS idx_products_tg_gender ON products(target_group, gender);

-- Index for product_type filtering
CREATE INDEX IF NOT EXISTS idx_products_prod_type ON products(product_type);

-- Index for category_id FK lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Index for product variants product_id FK lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

-- Index for product images product_id FK lookups
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- Indexes for status-based filtering & sorting (price, sale_price, is_new, is_best_seller)
CREATE INDEX IF NOT EXISTS idx_products_status_price ON products(status, price);
CREATE INDEX IF NOT EXISTS idx_products_status_saleprice ON products(status, sale_price);
CREATE INDEX IF NOT EXISTS idx_products_status_isnew ON products(status, is_new);
CREATE INDEX IF NOT EXISTS idx_products_status_isbest ON products(status, is_best_seller);
