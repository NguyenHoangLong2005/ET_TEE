-- Marketing module: banners, vouchers, campaigns
-- Run on PostgreSQL: psql -h localhost -U postgres -d fashion_db -f V20260913000000__marketing_module.sql

-- ============================================================
-- BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    image_url VARCHAR(1000) NOT NULL,
    link_url VARCHAR(1000),
    position VARCHAR(50) NOT NULL DEFAULT 'HERO',   -- HERO | MIDDLE | POPUP
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- VOUCHERS
-- ============================================================
CREATE TABLE IF NOT EXISTS vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    type VARCHAR(20) NOT NULL DEFAULT 'PERCENT',   -- PERCENT | FIXED_AMOUNT
    discount_value DECIMAL(12,2) NOT NULL,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    max_discount_amount DECIMAL(12,2),
    max_uses INT,
    used_count INT DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    banner_ids BIGINT[],
    voucher_ids BIGINT[],
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CAMPAIGN ANALYTICS (simple view/click counters)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL,   -- VIEW | CLICK | CONVERSION
    product_id BIGINT REFERENCES products(id),
    banner_id BIGINT REFERENCES banners(id),
    voucher_id BIGINT REFERENCES vouchers(id),
    guest_token VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_event ON campaign_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
