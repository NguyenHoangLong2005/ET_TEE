-- CSKH Voucher Quota System
-- Enables customer service to issue compensation vouchers with quota limits

-- Voucher Quota per Shop/Month (per staff)
CREATE TABLE IF NOT EXISTS cskh_voucher_quotas (
    id BIGSERIAL PRIMARY KEY,
    staff_id VARCHAR(255) NOT NULL,
    shop_id BIGINT,
    period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    quota_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    used_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, period)
);

-- Voucher Grants History
CREATE TABLE IF NOT EXISTS cskh_voucher_grant (
    id BIGSERIAL PRIMARY KEY,
    voucher_id BIGINT,
    ticket_id UUID,
    customer_id VARCHAR(255),
    staff_id VARCHAR(255) NOT NULL,
    staff_name VARCHAR(255),
    shop_id BIGINT,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Order Lookup Audit Log (for CSKH restricted order lookup)
CREATE TABLE IF NOT EXISTS order_lookup_audit_log (
    id BIGSERIAL PRIMARY KEY,
    staff_id VARCHAR(255) NOT NULL,
    staff_name VARCHAR(255),
    shop_id BIGINT,
    search_type VARCHAR(20) NOT NULL, -- PHONE, ORDER_CODE
    search_query VARCHAR(255) NOT NULL,
    order_id BIGINT,
    order_code VARCHAR(50),
    lookup_result VARCHAR(20) NOT NULL, -- FOUND, NOT_FOUND, ACCESS_DENIED
    looked_up_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cskh_quota_shop_period ON cskh_voucher_quota(shop_id, period);
CREATE INDEX IF NOT EXISTS idx_cskh_grant_ticket ON cskh_voucher_grant(ticket_id);
CREATE INDEX IF NOT EXISTS idx_cskh_grant_customer ON cskh_voucher_grant(customer_id);
CREATE INDEX IF NOT EXISTS idx_cskh_grant_staff ON cskh_voucher_grant(staff_id);
CREATE INDEX IF NOT EXISTS idx_order_lookup_staff ON order_lookup_audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_order_lookup_order ON order_lookup_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lookup_at ON order_lookup_audit_log(looked_up_at);
