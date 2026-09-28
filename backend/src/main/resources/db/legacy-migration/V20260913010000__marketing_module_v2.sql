-- =============================================================
-- Marketing module v2: extended schema for ET.TEE Marketing Staff
-- Extends existing banners / vouchers / campaigns / campaign_analytics
-- Adds product_placements, voucher_redemptions, orders.voucher_code
-- =============================================================

-- Banners: add priority + status + updated_by
ALTER TABLE banners
    ADD COLUMN IF NOT EXISTS priority      INT          DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status        VARCHAR(20)  DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS updated_by    VARCHAR(255);

-- Vouchers: add target_group + status + updated_by + budget + free_shipping flag
ALTER TABLE vouchers
    ADD COLUMN IF NOT EXISTS target_group   VARCHAR(30)  DEFAULT 'ALL',
    ADD COLUMN IF NOT EXISTS status         VARCHAR(20)  DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS updated_by     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS free_shipping  BOOLEAN      DEFAULT FALSE;

-- Campaigns: add code (unique), goal, status, budget, updated_by
ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS code        VARCHAR(50),
    ADD COLUMN IF NOT EXISTS goal        VARCHAR(30)  DEFAULT 'SALES',
    ADD COLUMN IF NOT EXISTS status      VARCHAR(20)  DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS budget      NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_campaigns_code') THEN
        ALTER TABLE campaigns ADD CONSTRAINT uq_campaigns_code UNIQUE (code);
    END IF;
END$$;

-- Campaign analytics: add richer tracking (session, user, order, revenue)
ALTER TABLE campaign_analytics
    ADD COLUMN IF NOT EXISTS session_id  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS user_id     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS order_id    BIGINT,
    ADD COLUMN IF NOT EXISTS revenue     NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_analytics_session ON campaign_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user    ON campaign_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_banner  ON campaign_analytics(banner_id);
CREATE INDEX IF NOT EXISTS idx_analytics_voucher ON campaign_analytics(voucher_id);

-- Orders: voucher_code + discount breakdown
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS voucher_code    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS voucher_id      BIGINT;

-- Product placements (NEW table) -------------------------------------------
CREATE TABLE IF NOT EXISTS product_placements (
    id              BIGSERIAL PRIMARY KEY,
    placement_key   VARCHAR(60)  NOT NULL,    -- HOME_NEW | HOME_BEST_SELLER | HOME_RECOMMENDED | CATEGORY_FEATURED
    product_id      BIGINT       NOT NULL,
    position        INT          NOT NULL DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    start_date      TIMESTAMP,
    end_date        TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_placements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_placements_key     ON product_placements(placement_key, status, position);
CREATE INDEX IF NOT EXISTS idx_placements_product ON product_placements(product_id);

-- Voucher redemptions (track per-user usage to enforce perUserLimit)
CREATE TABLE IF NOT EXISTS voucher_redemptions (
    id              BIGSERIAL PRIMARY KEY,
    voucher_id      BIGINT       NOT NULL,
    user_id         VARCHAR(255) NOT NULL,
    order_code      VARCHAR(50),
    order_total     NUMERIC(14,2) DEFAULT 0,
    discount_amount NUMERIC(14,2) DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_redemptions_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user_voucher ON voucher_redemptions(user_id, voucher_id);
