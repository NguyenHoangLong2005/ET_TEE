-- ET.TEE SHOP / SCHEMA V2 / PostgreSQL 16+ + pgvector 0.8+
-- Web + Flutter + Spring Boot; một cửa hàng, một kho có nhiều vị trí.
-- FRESH INSTALL: chạy trên database mới, hoặc database chưa có schema ettee.
-- Không DROP dữ liệu cũ. Đây không phải migration trực tiếp của database V1 đang vận hành.
-- Các số tiền dùng VND; giá/ưu đãi snapshot khi đặt; trạng thái thu tiền tách khỏi giao hàng.
-- Gửi email: trigger ghi hàng đợi trong cùng transaction, worker Spring Boot gửi sau COMMIT.
-- Tín hiệu mở/click không chứng minh đã đọc; acknowledged là khách chủ động xác nhận đã xem.
-- Xem README_VI.md, tests/ và email-service/ trong bộ mã đi kèm.
BEGIN;


CREATE EXTENSION IF NOT EXISTS pgcrypto;   
CREATE EXTENSION IF NOT EXISTS vector;     
CREATE EXTENSION IF NOT EXISTS pg_trgm;    

CREATE SCHEMA ettee;
SET search_path TO ettee, public;

CREATE TYPE account_status AS ENUM ('active', 'locked', 'pending_verification');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'unisex', 'other');

CREATE TYPE product_status AS ENUM ('draft', 'active', 'hidden', 'discontinued');

CREATE TYPE event_type AS ENUM (
    'impression', 'view', 'click', 'favorite', 'unfavorite', 'add_to_cart',
    'remove_from_cart', 'purchase', 'search', 'filter'
);

CREATE TYPE recommendation_placement AS ENUM (
    'home_for_you', 'similar_product', 'outfit_match', 'cart_addon',
    'search_rerank', 'new_user_quiz', 'new_product_coldstart'
);

CREATE TYPE model_type AS ENUM (
    'image_embedding', 'text_embedding', 'collaborative_filtering',
    'session_based', 'ranking', 'hybrid'
);

CREATE TYPE order_status AS ENUM (
    'draft', 'pending_payment', 'pending_confirmation', 'confirmed', 'picking',
    'packed', 'handed_to_carrier', 'shipping', 'delivered',
    'cancelled', 'return_requested', 'returned', 'refunded'
);

CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'partial_refunded', 'refunded', 'failed');
CREATE TYPE payment_method AS ENUM ('cod', 'bank_transfer', 'momo', 'vnpay', 'zalopay', 'card');

CREATE TYPE shipment_status AS ENUM (
    'pending', 'handed_over', 'in_transit', 'delivered', 'exception', 'returned'
);

CREATE TYPE movement_type AS ENUM (
    'inbound', 'outbound', 'adjustment', 'reserved', 'released', 'return_in'
);

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping');
CREATE TYPE promotion_status AS ENUM ('draft', 'pending_approval', 'active', 'expired', 'rejected');

CREATE TYPE review_status AS ENUM ('published', 'hidden', 'flagged');

CREATE TYPE ticket_channel AS ENUM ('chat', 'email', 'phone');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'escalated', 'resolved', 'closed');
CREATE TYPE sender_type AS ENUM ('customer', 'staff', 'system');

CREATE TYPE return_status AS ENUM ('requested', 'approved', 'rejected', 'item_received', 'exchange_sent', 'completed', 'refunded', 'cancelled');

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) UNIQUE NOT NULL,   

    name            VARCHAR(100) NOT NULL,
    description     TEXT
);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(100) UNIQUE NOT NULL,  
    description     TEXT
);

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    password_hash   VARCHAR(255),                  
    full_name       VARCHAR(150),
    avatar_url      TEXT,
    status          account_status NOT NULL DEFAULT 'pending_verification',
    is_staff        BOOLEAN NOT NULL DEFAULT FALSE,
    locked_reason   TEXT,
    locked_by       UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMPTZ,
    CONSTRAINT chk_user_identity CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE user_roles (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by     UUID REFERENCES users(id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE staff_profile (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_code   VARCHAR(30) UNIQUE NOT NULL,
    department      VARCHAR(100),
    hired_at        DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE customer_profile (
user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 date_of_birth DATE, gender gender_type,
 weight_kg NUMERIC(5,2) CHECK (weight_kg > 0),
 height_cm NUMERIC(5,2) CHECK (height_cm > 0),
 chest_cm NUMERIC(5,2) CHECK (chest_cm > 0),
 waist_cm NUMERIC(5,2) CHECK (waist_cm > 0),
 hip_cm NUMERIC(5,2) CHECK (hip_cm > 0),
 shoulder_cm NUMERIC(5,2) CHECK (shoulder_cm > 0),
 preferred_size VARCHAR(20), style_preference JSONB,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Khách mua tồn tại độc lập với tài khoản đăng nhập; không tự ghép khách bằng email chưa xác minh.
CREATE TABLE customers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID UNIQUE REFERENCES users(id),
 full_name VARCHAR(150) NOT NULL,
 email VARCHAR(255), phone VARCHAR(20) NOT NULL,
 email_verified_at TIMESTAMPTZ, phone_verified_at TIMESTAMPTZ,
 order_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 email_tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (length(trim(phone)) > 0),
 CHECK (email IS NULL OR email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
);
CREATE INDEX idx_customers_email ON customers(lower(email));

CREATE TABLE addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  
    recipient_name  VARCHAR(150) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    province        VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    ward            VARCHAR(100) NOT NULL,
    street_address  VARCHAR(255) NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_user_email_ci ON users(lower(trim(email))) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_default_address ON addresses(user_id) WHERE is_default AND user_id IS NOT NULL;

CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       UUID REFERENCES categories(id),
    name            VARCHAR(150) NOT NULL,
    slug            VARCHAR(150) UNIQUE NOT NULL,
    description     TEXT,
    image_url       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         UUID NOT NULL REFERENCES categories(id),
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) UNIQUE NOT NULL,
    description         TEXT,
    brand               VARCHAR(100),
    gender_target       gender_type,
    base_price          NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    status              product_status NOT NULL DEFAULT 'draft',
    is_repeat_purchase  BOOLEAN NOT NULL DEFAULT FALSE, 
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE TABLE attributes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 code VARCHAR(50) UNIQUE NOT NULL, name VARCHAR(100) NOT NULL,
 data_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (data_type IN ('text','number','boolean')),
 is_variant_defining BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE attribute_values (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 attribute_id UUID NOT NULL REFERENCES attributes(id),
 value VARCHAR(150) NOT NULL, extra_data JSONB, sort_order INT NOT NULL DEFAULT 0,
 UNIQUE(attribute_id,value), UNIQUE(id,attribute_id)
);

CREATE TABLE product_attribute_values (
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_value_id  UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, attribute_value_id)
);

CREATE TABLE product_variants (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id UUID NOT NULL REFERENCES products(id), sku VARCHAR(60) UNIQUE NOT NULL,
 price NUMERIC(12,2) NOT NULL CHECK(price >= 0),
 compare_at_price NUMERIC(12,2) CHECK(compare_at_price >= 0),
 weight_grams INT CHECK(weight_grams > 0), barcode VARCHAR(60),
 is_active BOOLEAN NOT NULL DEFAULT FALSE,
 attribute_signature TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,product_id), UNIQUE(product_id,attribute_signature) DEFERRABLE INITIALLY DEFERRED,
 CHECK (NOT is_active OR attribute_signature IS NOT NULL)
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

CREATE TABLE variant_attribute_values (
variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
 attribute_id UUID NOT NULL REFERENCES attributes(id),
 attribute_value_id UUID NOT NULL,
 PRIMARY KEY(variant_id,attribute_id),
 FOREIGN KEY(attribute_value_id,attribute_id) REFERENCES attribute_values(id,attribute_id)
);

CREATE TABLE product_images (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id UUID NOT NULL REFERENCES products(id), variant_id UUID,
 url TEXT NOT NULL, alt_text VARCHAR(255), is_primary BOOLEAN NOT NULL DEFAULT FALSE,
 sort_order INT NOT NULL DEFAULT 0,
 FOREIGN KEY(variant_id,product_id) REFERENCES product_variants(id,product_id)
);

CREATE UNIQUE INDEX uq_product_cover ON product_images(product_id) WHERE is_primary AND variant_id IS NULL;
CREATE UNIQUE INDEX uq_variant_cover ON product_images(variant_id) WHERE is_primary AND variant_id IS NOT NULL;
CREATE INDEX idx_images_product_sort ON product_images(product_id,sort_order);
CREATE TABLE stock_locations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(40) UNIQUE NOT NULL,
 name TEXT NOT NULL, is_sellable BOOLEAN NOT NULL DEFAULT TRUE, is_active BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO stock_locations(code,name) VALUES ('MAIN','Kho chính - khu bán được');

CREATE TABLE inventory (
variant_id UUID NOT NULL REFERENCES product_variants(id),
 location_id UUID NOT NULL REFERENCES stock_locations(id),
 quantity_on_hand INT NOT NULL DEFAULT 0 CHECK(quantity_on_hand >= 0),
 quantity_reserved INT NOT NULL DEFAULT 0 CHECK(quantity_reserved >= 0),
 reorder_level INT NOT NULL DEFAULT 0 CHECK(reorder_level >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(variant_id,location_id), CHECK(quantity_reserved <= quantity_on_hand)
);

CREATE TABLE stock_movements (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 variant_id UUID NOT NULL REFERENCES product_variants(id), location_id UUID NOT NULL REFERENCES stock_locations(id),
 movement_type movement_type NOT NULL,
 on_hand_delta INT NOT NULL DEFAULT 0, reserved_delta INT NOT NULL DEFAULT 0,
 reference_type VARCHAR(50) NOT NULL, reference_id UUID NOT NULL,
 idempotency_key TEXT UNIQUE NOT NULL,
 created_by UUID REFERENCES users(id), note TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(on_hand_delta <> 0 OR reserved_delta <> 0)
);
CREATE INDEX idx_stock_movements_variant ON stock_movements(variant_id);

CREATE TABLE stock_adjustment_requests (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 variant_id UUID NOT NULL REFERENCES product_variants(id), location_id UUID NOT NULL REFERENCES stock_locations(id),
 requested_by UUID NOT NULL REFERENCES users(id), quantity_diff INT NOT NULL CHECK(quantity_diff <> 0),
 reason TEXT NOT NULL, status approval_status NOT NULL DEFAULT 'pending',
 approved_by UUID REFERENCES users(id), approved_at TIMESTAMPTZ,
 applied_movement_id UUID UNIQUE REFERENCES stock_movements(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
 CHECK(approved_by IS NULL OR approved_by <> requested_by)
);

CREATE TABLE stock_holds (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 variant_id UUID NOT NULL REFERENCES product_variants(id), location_id UUID NOT NULL REFERENCES stock_locations(id),
 quantity INT NOT NULL CHECK(quantity > 0), order_id UUID NOT NULL, order_item_id UUID NOT NULL,
 requested_by UUID REFERENCES users(id),
 source VARCHAR(20) NOT NULL DEFAULT 'checkout' CHECK(source IN ('checkout','staff','exchange')),
 status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','released','fulfilled')),
 idempotency_key TEXT UNIQUE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ,
 released_reason TEXT, resolved_at TIMESTAMPTZ,
 FOREIGN KEY(variant_id,location_id) REFERENCES inventory(variant_id,location_id),
 CHECK(expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE sessions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id), anonymous_id UUID NOT NULL DEFAULT gen_random_uuid(),
 session_token_hash TEXT UNIQUE NOT NULL,
 platform VARCHAR(10) NOT NULL CHECK(platform IN ('web','app')),
 device_info JSONB, started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '30 days',
 CHECK(ended_at IS NULL OR ended_at >= started_at), CHECK(expires_at > started_at)
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE carts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id), session_id UUID REFERENCES sessions(id),
 status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','converted','abandoned','merged')),
 merged_into UUID REFERENCES carts(id), version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((user_id IS NOT NULL)::INT+(session_id IS NOT NULL)::INT = 1),
 CHECK(merged_into IS NULL OR merged_into <> id), CHECK((status='merged')=(merged_into IS NOT NULL))
);

CREATE TABLE cart_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id         UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES product_variants(id),
    quantity        INT NOT NULL CHECK (quantity > 0),
    price_at_add    NUMERIC(12,2) NOT NULL CHECK(price_at_add >= 0),
    added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (cart_id, variant_id)
);

CREATE UNIQUE INDEX uq_active_user_cart ON carts(user_id) WHERE status='active' AND user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_active_session_cart ON carts(session_id) WHERE status='active' AND session_id IS NOT NULL;

CREATE TABLE orders (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_code VARCHAR(30) UNIQUE NOT NULL,
 customer_id UUID NOT NULL REFERENCES customers(id), origin_session_id UUID REFERENCES sessions(id),
 source_platform VARCHAR(10) NOT NULL CHECK(source_platform IN ('web','app','staff')),
 checkout_key UUID UNIQUE NOT NULL,
 customer_name VARCHAR(150) NOT NULL, customer_phone VARCHAR(20) NOT NULL,
 customer_email VARCHAR(255), email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 shipping_address JSONB NOT NULL CHECK(jsonb_typeof(shipping_address)='object'),
 status order_status NOT NULL DEFAULT 'draft',
 payment_method payment_method NOT NULL DEFAULT 'cod',
 payment_status payment_status NOT NULL DEFAULT 'unpaid',
 currency CHAR(3) NOT NULL DEFAULT 'VND' CHECK(currency='VND'),
 subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(subtotal>=0),
 discount_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(discount_total>=0 AND discount_total<=subtotal),
 shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(shipping_fee>=0),
 shipping_discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(shipping_discount>=0 AND shipping_discount<=shipping_fee),
 total NUMERIC(12,2) GENERATED ALWAYS AS (subtotal-discount_total+shipping_fee-shipping_discount) STORED,
 version BIGINT NOT NULL DEFAULT 0, placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 submitted_at TIMESTAMPTZ, confirmed_by UUID REFERENCES users(id), confirmed_at TIMESTAMPTZ,
 cancelled_reason TEXT, cancelled_by UUID REFERENCES users(id), cancelled_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(length(trim(customer_phone))>0),
 CHECK(customer_email IS NULL OR customer_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 UNIQUE(id,customer_id)
);
CREATE INDEX idx_orders_customer_time ON orders(customer_id,placed_at DESC);
CREATE INDEX idx_orders_status ON orders(status);

ALTER TABLE stock_holds ADD CONSTRAINT fk_stock_holds_order FOREIGN KEY (order_id) REFERENCES orders(id);

CREATE TABLE order_items (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID NOT NULL REFERENCES orders(id), variant_id UUID NOT NULL REFERENCES product_variants(id),
 product_name_snapshot VARCHAR(255) NOT NULL, sku_snapshot VARCHAR(60) NOT NULL,
 variant_snapshot JSONB NOT NULL CHECK(jsonb_typeof(variant_snapshot)='object'),
 unit_price NUMERIC(12,2) NOT NULL CHECK(unit_price>=0), quantity INT NOT NULL CHECK(quantity>0),
 discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0 AND discount_amount<=unit_price*quantity),
 subtotal NUMERIC(12,2) GENERATED ALWAYS AS(unit_price*quantity) STORED,
 line_total NUMERIC(12,2) GENERATED ALWAYS AS(unit_price*quantity-discount_amount) STORED,
 UNIQUE(order_id,variant_id), UNIQUE(id,order_id), UNIQUE(id,order_id,variant_id)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);

CREATE TABLE order_status_history (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID NOT NULL REFERENCES orders(id), from_status order_status,
 status order_status NOT NULL, order_version BIGINT NOT NULL,
 changed_by UUID REFERENCES users(id), note TEXT,
 changed_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(order_id,order_version)
);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

CREATE TABLE payments (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID NOT NULL REFERENCES orders(id), method payment_method NOT NULL,
 provider VARCHAR(50) NOT NULL, provider_account VARCHAR(100) NOT NULL DEFAULT 'default',
 amount NUMERIC(12,2) NOT NULL CHECK(amount>0), currency CHAR(3) NOT NULL DEFAULT 'VND' CHECK(currency='VND'),
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed','cancelled')),
 idempotency_key TEXT UNIQUE NOT NULL, transaction_ref VARCHAR(150),
 paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_account,transaction_ref), UNIQUE(id,order_id),
 CHECK(status<>'success' OR (paid_at IS NOT NULL AND transaction_ref IS NOT NULL))
);

CREATE TABLE shipments (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID NOT NULL REFERENCES orders(id), carrier VARCHAR(100) NOT NULL,
 tracking_code VARCHAR(100), status shipment_status NOT NULL DEFAULT 'pending',
 assigned_to UUID REFERENCES users(id), packed_by UUID REFERENCES users(id), packed_at TIMESTAMPTZ,
 handed_over_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
 cod_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(cod_amount>=0),
 delivery_proof_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), version BIGINT NOT NULL DEFAULT 0,
 UNIQUE(carrier,tracking_code), UNIQUE(id,order_id)
);

CREATE TABLE shipment_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id     UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    event_type      VARCHAR(50) NOT NULL,           
    note            TEXT,
    recorded_by     UUID REFERENCES users(id),
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE return_requests (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID NOT NULL REFERENCES orders(id), requested_by UUID REFERENCES users(id),
 request_type VARCHAR(20) NOT NULL CHECK(request_type IN ('return_refund','exchange')),
 reason TEXT NOT NULL, status return_status NOT NULL DEFAULT 'requested',
 handled_by UUID REFERENCES users(id), replacement_order_id UUID REFERENCES orders(id),
 idempotency_key UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(), version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ,
 UNIQUE(id,order_id), CHECK(replacement_order_id IS NULL OR replacement_order_id <> order_id),
 CHECK(request_type='exchange' OR replacement_order_id IS NULL)
);

CREATE TABLE return_items (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 return_request_id UUID NOT NULL, order_id UUID NOT NULL,
 order_item_id UUID NOT NULL, quantity INT NOT NULL CHECK(quantity>0),
 replacement_variant_id UUID REFERENCES product_variants(id),
 condition_note TEXT, disposition VARCHAR(20) CHECK(disposition IN ('restock','damaged','quarantine')),
 restocked_at TIMESTAMPTZ,
 FOREIGN KEY(return_request_id,order_id) REFERENCES return_requests(id,order_id),
 FOREIGN KEY(order_item_id,order_id) REFERENCES order_items(id,order_id),
 UNIQUE(return_request_id,order_item_id)
);

CREATE TABLE refunds (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 return_request_id UUID, order_id UUID NOT NULL REFERENCES orders(id), payment_id UUID NOT NULL,
 amount NUMERIC(12,2) NOT NULL CHECK(amount>0), method payment_method NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed','cancelled')),
 idempotency_key TEXT UNIQUE NOT NULL, provider_ref VARCHAR(150),
 processed_by UUID REFERENCES users(id), processed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(payment_id,order_id) REFERENCES payments(id,order_id),
 FOREIGN KEY(return_request_id,order_id) REFERENCES return_requests(id,order_id),
 UNIQUE(payment_id,provider_ref), CHECK(status<>'success' OR processed_at IS NOT NULL)
);

CREATE TABLE promotions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(50) UNIQUE NOT NULL,
 name VARCHAR(150) NOT NULL, description TEXT, discount_type discount_type NOT NULL,
 discount_value NUMERIC(12,2) NOT NULL CHECK(discount_value>=0),
 max_discount_amount NUMERIC(12,2) CHECK(max_discount_amount>0),
 min_order_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(min_order_value>=0),
 usage_limit INT CHECK(usage_limit>0), usage_limit_per_customer INT NOT NULL DEFAULT 1 CHECK(usage_limit_per_customer>0),
 eligibility_scope VARCHAR(20) NOT NULL DEFAULT 'all' CHECK(eligibility_scope IN ('all','products','categories','variants')),
 customer_scope VARCHAR(20) NOT NULL DEFAULT 'all' CHECK(customer_scope IN ('all','selected','first_purchase')),
 stackable BOOLEAN NOT NULL DEFAULT FALSE, start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL,
 status promotion_status NOT NULL DEFAULT 'draft', created_by UUID REFERENCES users(id),
 approved_by UUID REFERENCES users(id), approved_at TIMESTAMPTZ,
 CHECK(end_at>start_at), CHECK(discount_type<>'percentage' OR discount_value<=100),
 CHECK(status<>'active' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE voucher_redemptions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 promotion_id UUID NOT NULL REFERENCES promotions(id), order_id UUID NOT NULL REFERENCES orders(id),
 customer_id UUID NOT NULL REFERENCES customers(id),
 quota_identity_hash TEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','consumed','released')),
 discount_amount NUMERIC(12,2) NOT NULL CHECK(discount_amount>=0),
 idempotency_key UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
 redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(promotion_id,order_id),
 FOREIGN KEY(order_id,customer_id) REFERENCES orders(id,customer_id)
);

CREATE TABLE banners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(150) NOT NULL,
    image_url       TEXT NOT NULL,
    link_url        TEXT,
    position        VARCHAR(50),                    
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    start_at        TIMESTAMPTZ,
    end_at          TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id)
);

CREATE TABLE campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    channel         VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    start_at        TIMESTAMPTZ,
    end_at          TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id)
);

CREATE TABLE ab_tests (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(150) NOT NULL,
 campaign_id UUID REFERENCES campaigns(id),
 status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','running','paused','completed')),
 assignment_unit VARCHAR(20) NOT NULL DEFAULT 'subject' CHECK(assignment_unit IN ('subject','session')),
 salt TEXT NOT NULL, start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL,
 CHECK(end_at>start_at)
);

CREATE TABLE ab_test_results (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 ab_test_id UUID NOT NULL REFERENCES ab_tests(id), variant_id UUID NOT NULL,
 bucket_start TIMESTAMPTZ NOT NULL, bucket_end TIMESTAMPTZ NOT NULL,
 impressions BIGINT NOT NULL DEFAULT 0 CHECK(impressions>=0),
 clicks BIGINT NOT NULL DEFAULT 0 CHECK(clicks>=0), conversions BIGINT NOT NULL DEFAULT 0 CHECK(conversions>=0),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(bucket_end>bucket_start),
 UNIQUE(ab_test_id,variant_id,bucket_start,bucket_end)
);

CREATE TABLE product_display_placements (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id UUID NOT NULL REFERENCES products(id), page VARCHAR(30) NOT NULL,
 context_key TEXT NOT NULL DEFAULT 'global', position INT NOT NULL CHECK(position>0),
 priority INT NOT NULL DEFAULT 0, start_at TIMESTAMPTZ, end_at TIMESTAMPTZ,
 created_by UUID REFERENCES users(id), CHECK(end_at IS NULL OR start_at IS NULL OR end_at>start_at)
);

CREATE TABLE reviews (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_item_id UUID NOT NULL UNIQUE REFERENCES order_items(id),
 customer_id UUID NOT NULL REFERENCES customers(id), authorization_id UUID NOT NULL UNIQUE,
 rating SMALLINT NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT, images JSONB,
 status review_status NOT NULL DEFAULT 'published', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);

CREATE TABLE favorites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id)
);

CREATE TABLE support_tickets (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id UUID REFERENCES customers(id), session_id UUID REFERENCES sessions(id), order_id UUID REFERENCES orders(id),
 channel ticket_channel NOT NULL DEFAULT 'chat', subject VARCHAR(255),
 status ticket_status NOT NULL DEFAULT 'open', priority SMALLINT NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
 assigned_to UUID REFERENCES users(id), escalated_to UUID REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ,
 CHECK(customer_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TABLE ticket_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type     sender_type NOT NULL,
    sender_id       UUID REFERENCES users(id),
    message         TEXT NOT NULL,
    attachment_url  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_codes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id UUID NOT NULL REFERENCES support_tickets(id), promotion_id UUID NOT NULL UNIQUE REFERENCES promotions(id),
 customer_id UUID NOT NULL REFERENCES customers(id),
 value NUMERIC(12,2) NOT NULL CHECK(value>0), issued_by UUID NOT NULL REFERENCES users(id),
 approval_status approval_status NOT NULL DEFAULT 'pending', approved_by UUID REFERENCES users(id),
 issued_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
 CHECK(expires_at>issued_at), CHECK(approval_status<>'approved' OR approved_by IS NOT NULL)
);

CREATE TABLE interaction_events (
id BIGSERIAL PRIMARY KEY, client_event_id UUID UNIQUE NOT NULL,
 session_id UUID REFERENCES sessions(id), user_id UUID REFERENCES users(id),
 product_id UUID REFERENCES products(id), variant_id UUID,
 event_type event_type NOT NULL, event_metadata JSONB NOT NULL DEFAULT '{}',
 source_platform VARCHAR(10) NOT NULL CHECK(source_platform IN ('web','app','server')),
 sequence_no BIGINT CHECK(sequence_no>=0), order_item_id UUID REFERENCES order_items(id),
 recommendation_item_id UUID, experiment_assignment_id UUID,
 occurred_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(variant_id,product_id) REFERENCES product_variants(id,product_id),
 CHECK(user_id IS NOT NULL OR session_id IS NOT NULL),
 CHECK(variant_id IS NULL OR product_id IS NOT NULL),
 CHECK(event_type IN ('search','filter') OR product_id IS NOT NULL),
 CHECK(event_type<>'purchase' OR (order_item_id IS NOT NULL AND source_platform='server')),
 UNIQUE(session_id,sequence_no)
);
CREATE INDEX idx_interaction_user_time ON interaction_events(user_id, occurred_at);

CREATE INDEX idx_interaction_product ON interaction_events(product_id);

CREATE INDEX idx_interaction_session_seq ON interaction_events(session_id, occurred_at, id);

CREATE TABLE product_embeddings (
product_id UUID NOT NULL REFERENCES products(id),
 model_version_id UUID NOT NULL, modality VARCHAR(20) NOT NULL CHECK(modality IN ('image','text','combined','behavior')),
 embedding vector NOT NULL, input_hash TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(product_id,model_version_id,modality)
);



CREATE TABLE user_embeddings (
user_id UUID NOT NULL REFERENCES users(id), model_version_id UUID NOT NULL,
 embedding vector NOT NULL, history_cutoff TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,model_version_id)
);

CREATE TABLE product_compatibility (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id_a UUID NOT NULL REFERENCES products(id), product_id_b UUID NOT NULL REFERENCES products(id),
 compatibility_score DOUBLE PRECISION NOT NULL CHECK(compatibility_score BETWEEN 0 AND 1),
 model_version_id UUID NOT NULL, source VARCHAR(20) NOT NULL CHECK(source IN ('curated','rule','model')),
 relation_type VARCHAR(30) NOT NULL DEFAULT 'complements',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(product_id_a<product_id_b),
 UNIQUE(product_id_a,product_id_b,model_version_id,relation_type)
);
CREATE INDEX idx_compat_a ON product_compatibility(product_id_a, compatibility_score DESC);

CREATE TABLE style_quiz_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question        TEXT NOT NULL,
    options         JSONB NOT NULL,                  
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE style_quiz_responses (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id), session_id UUID REFERENCES sessions(id),
 question_id UUID NOT NULL REFERENCES style_quiz_questions(id), selected_option VARCHAR(50) NOT NULL,
 answered_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TABLE model_versions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 model_name VARCHAR(100) NOT NULL, version_tag VARCHAR(50) NOT NULL, model_type model_type NOT NULL,
 embedding_dim INT CHECK(embedding_dim BETWEEN 1 AND 2000), embedding_space TEXT,
 artifact_uri TEXT NOT NULL, artifact_sha256 TEXT NOT NULL CHECK(length(artifact_sha256)=64),
 training_run_id UUID, metrics JSONB NOT NULL DEFAULT '{}', config JSONB NOT NULL DEFAULT '{}',
 trained_at TIMESTAMPTZ NOT NULL, created_by UUID REFERENCES users(id),
 UNIQUE(model_name,version_tag)
);

CREATE TABLE feature_flags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key                 VARCHAR(100) UNIQUE NOT NULL,
    description         TEXT,
    is_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_percentage  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(rollout_percentage BETWEEN 0 AND 100),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by          UUID REFERENCES users(id)
);

CREATE TABLE recommendation_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_key UUID UNIQUE NOT NULL,
 session_id UUID REFERENCES sessions(id), user_id UUID REFERENCES users(id),
 placement recommendation_placement NOT NULL, source_product_id UUID REFERENCES products(id),
 model_version_id UUID REFERENCES model_versions(id), experiment_assignment_id UUID,
 context_snapshot JSONB NOT NULL DEFAULT '{}', filter_policy_version TEXT NOT NULL,
 latency_ms NUMERIC(12,3) CHECK(latency_ms>=0), requested_k INT NOT NULL CHECK(requested_k>0),
 fallback_reason TEXT, generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TABLE recommendation_log_items (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 recommendation_log_id UUID NOT NULL REFERENCES recommendation_logs(id), product_id UUID NOT NULL REFERENCES products(id),
 eligible_variant_id UUID, rank INT NOT NULL CHECK(rank>0), score DOUBLE PRECISION,
 FOREIGN KEY(eligible_variant_id,product_id) REFERENCES product_variants(id,product_id),
 UNIQUE(recommendation_log_id,rank), UNIQUE(recommendation_log_id,product_id), UNIQUE(id,product_id)
);
CREATE INDEX idx_reco_log_items_log ON recommendation_log_items(recommendation_log_id);

CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,           
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE error_logs (
    id              BIGSERIAL PRIMARY KEY,
    service_name    VARCHAR(100) NOT NULL,           
    severity        VARCHAR(20) NOT NULL,            
    message         TEXT NOT NULL,
    stack_trace     TEXT,
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE backup_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type     VARCHAR(30) NOT NULL,            
    file_location   TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE sla_configs (
    status                  order_status PRIMARY KEY,
    max_duration_minutes    INT NOT NULL CHECK(max_duration_minutes>0)
);


-- ===== Quan hệ bổ sung, cấu hình và dữ liệu nghiệp vụ =====
ALTER TABLE roles ADD COLUMN is_staff_role BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE auth_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id),
 refresh_token_hash TEXT UNIQUE NOT NULL, device_label TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
 revoked_at TIMESTAMPTZ, replaced_by UUID REFERENCES auth_sessions(id), CHECK(expires_at>created_at)
);
CREATE TABLE identity_verifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES customers(id),
 purpose TEXT NOT NULL CHECK(purpose IN ('email','phone','guest_order','account_link')),
 token_hash TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 verified_at TIMESTAMPTZ, attempts INT NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(expires_at>created_at)
);
CREATE TABLE order_access_grants (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL, customer_id UUID NOT NULL,
 token_hash TEXT UNIQUE NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('view','review','return')),
 verification_id UUID REFERENCES identity_verifications(id),
 issued_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
 FOREIGN KEY(order_id,customer_id) REFERENCES orders(id,customer_id), CHECK(expires_at>issued_at)
);
CREATE TABLE review_authorizations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_item_id UUID NOT NULL REFERENCES order_items(id),
 customer_id UUID NOT NULL REFERENCES customers(id),
 method TEXT NOT NULL CHECK(method IN ('authenticated','guest_verified')),
 access_grant_id UUID REFERENCES order_access_grants(id),
 verified_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
 CHECK(expires_at>verified_at), CHECK(method<>'guest_verified' OR access_grant_id IS NOT NULL),
 UNIQUE(id,order_item_id,customer_id)
);
ALTER TABLE reviews ADD CONSTRAINT fk_review_authorization
 FOREIGN KEY(authorization_id,order_item_id,customer_id) REFERENCES review_authorizations(id,order_item_id,customer_id);
CREATE VIEW product_reviews AS
 SELECT r.*,v.product_id FROM reviews r JOIN order_items oi ON oi.id=r.order_item_id
 JOIN product_variants v ON v.id=oi.variant_id;

CREATE TABLE category_attributes (
 category_id UUID NOT NULL REFERENCES categories(id), attribute_id UUID NOT NULL REFERENCES attributes(id),
 is_required BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY(category_id,attribute_id)
);
CREATE TABLE size_charts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, version INT NOT NULL CHECK(version>0),
 category_id UUID REFERENCES categories(id), product_id UUID REFERENCES products(id),
 measurement_basis TEXT NOT NULL CHECK(measurement_basis IN ('body','garment')),
 fit_notes TEXT, CHECK(category_id IS NOT NULL OR product_id IS NOT NULL)
);
CREATE TABLE size_chart_ranges (
 chart_id UUID NOT NULL REFERENCES size_charts(id), size_value_id UUID NOT NULL REFERENCES attribute_values(id),
 measurement TEXT NOT NULL CHECK(measurement IN ('height_cm','weight_kg','chest_cm','waist_cm','hip_cm','shoulder_cm')),
 min_value NUMERIC(7,2) NOT NULL CHECK(min_value>0), max_value NUMERIC(7,2) NOT NULL,
 CHECK(max_value>=min_value), PRIMARY KEY(chart_id,size_value_id,measurement)
);
CREATE VIEW inventory_available AS
 SELECT i.variant_id, sum(i.quantity_on_hand)::BIGINT AS quantity_on_hand,
 sum(i.quantity_reserved)::BIGINT AS quantity_reserved,
 sum(i.quantity_on_hand-i.quantity_reserved)::BIGINT AS available_quantity
 FROM inventory i JOIN stock_locations l ON l.id=i.location_id
 WHERE l.is_active AND l.is_sellable GROUP BY i.variant_id;
ALTER TABLE stock_holds ADD CONSTRAINT fk_hold_order_item
 FOREIGN KEY(order_item_id,order_id,variant_id) REFERENCES order_items(id,order_id,variant_id);
CREATE UNIQUE INDEX uq_active_hold_line_location ON stock_holds(order_item_id,location_id) WHERE status='active';
CREATE INDEX idx_holds_order_status ON stock_holds(order_id,status);
CREATE INDEX idx_holds_expiry ON stock_holds(expires_at) WHERE status='active' AND expires_at IS NOT NULL;
CREATE TABLE stock_receipts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), receipt_code TEXT UNIQUE NOT NULL, supplier_name TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted','cancelled')),
 created_by UUID NOT NULL REFERENCES users(id), posted_by UUID REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), posted_at TIMESTAMPTZ,
 CHECK(status<>'posted' OR (posted_at IS NOT NULL AND posted_by IS NOT NULL))
);
CREATE TABLE stock_receipt_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), receipt_id UUID NOT NULL REFERENCES stock_receipts(id),
 variant_id UUID NOT NULL REFERENCES product_variants(id), location_id UUID NOT NULL REFERENCES stock_locations(id),
 quantity INT NOT NULL CHECK(quantity>0), unit_cost NUMERIC(12,2) CHECK(unit_cost>=0),
 movement_id UUID UNIQUE REFERENCES stock_movements(id), UNIQUE(receipt_id,variant_id,location_id)
);
CREATE TABLE stock_counts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), location_id UUID NOT NULL REFERENCES stock_locations(id),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','submitted','approved','closed','cancelled')),
 started_by UUID NOT NULL REFERENCES users(id), approved_by UUID REFERENCES users(id),
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(), closed_at TIMESTAMPTZ
);
CREATE TABLE stock_count_items (
 stock_count_id UUID NOT NULL REFERENCES stock_counts(id), variant_id UUID NOT NULL REFERENCES product_variants(id),
 expected_quantity INT NOT NULL CHECK(expected_quantity>=0), counted_quantity INT CHECK(counted_quantity>=0),
 counted_at TIMESTAMPTZ, adjustment_request_id UUID UNIQUE REFERENCES stock_adjustment_requests(id),
 PRIMARY KEY(stock_count_id,variant_id)
);
CREATE TABLE replenishment_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), variant_id UUID NOT NULL REFERENCES product_variants(id),
 requested_quantity INT NOT NULL CHECK(requested_quantity>0), requested_by UUID NOT NULL REFERENCES users(id),
 reason TEXT, status approval_status NOT NULL DEFAULT 'pending', approved_by UUID REFERENCES users(id),
 receipt_id UUID REFERENCES stock_receipts(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_provider_configs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL, account_code TEXT NOT NULL,
 method payment_method NOT NULL, enabled BOOLEAN NOT NULL DEFAULT FALSE,
 credential_secret_ref TEXT NOT NULL, public_config JSONB NOT NULL DEFAULT '{}',
 updated_by UUID REFERENCES users(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(provider,account_code)
);
CREATE TABLE payment_webhook_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL, account_code TEXT NOT NULL,
 provider_event_id TEXT NOT NULL, payment_id UUID REFERENCES payments(id),
 verified_at TIMESTAMPTZ NOT NULL, payload_hash TEXT NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ, error_message TEXT,
 UNIQUE(provider,account_code,provider_event_id)
);
CREATE TABLE shipping_services (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), carrier_code TEXT NOT NULL, service_code TEXT NOT NULL,
 name TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE, config JSONB NOT NULL DEFAULT '{}',
 credential_secret_ref TEXT, UNIQUE(carrier_code,service_code)
);
CREATE TABLE shipping_zones (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE shipping_zone_regions (
 zone_id UUID NOT NULL REFERENCES shipping_zones(id), region_code TEXT NOT NULL,
 PRIMARY KEY(zone_id,region_code)
);
CREATE TABLE shipping_service_zones (
 service_id UUID NOT NULL REFERENCES shipping_services(id), zone_id UUID NOT NULL REFERENCES shipping_zones(id),
 is_serviceable BOOLEAN NOT NULL DEFAULT TRUE, base_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(base_fee>=0),
 PRIMARY KEY(service_id,zone_id)
);
CREATE TABLE product_shipping_restrictions (
 product_id UUID NOT NULL REFERENCES products(id), zone_id UUID NOT NULL REFERENCES shipping_zones(id),
 reason TEXT NOT NULL, PRIMARY KEY(product_id,zone_id)
);
CREATE TABLE shipment_items (
 shipment_id UUID NOT NULL, order_id UUID NOT NULL, order_item_id UUID NOT NULL,
 quantity INT NOT NULL CHECK(quantity>0),
 FOREIGN KEY(shipment_id,order_id) REFERENCES shipments(id,order_id),
 FOREIGN KEY(order_item_id,order_id) REFERENCES order_items(id,order_id), PRIMARY KEY(shipment_id,order_item_id)
);
CREATE TABLE cod_settlements (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), carrier TEXT NOT NULL, settlement_ref TEXT NOT NULL,
 settled_at TIMESTAMPTZ NOT NULL, reconciled_by UUID REFERENCES users(id), UNIQUE(carrier,settlement_ref)
);
CREATE TABLE cod_settlement_items (
 settlement_id UUID NOT NULL REFERENCES cod_settlements(id), shipment_id UUID NOT NULL UNIQUE REFERENCES shipments(id),
 collected_amount NUMERIC(12,2) NOT NULL CHECK(collected_amount>=0), fee_amount NUMERIC(12,2) NOT NULL CHECK(fee_amount>=0),
 remitted_amount NUMERIC(12,2) NOT NULL CHECK(remitted_amount>=0),
 discrepancy NUMERIC(12,2) GENERATED ALWAYS AS(collected_amount-fee_amount-remitted_amount) STORED,
 note TEXT, PRIMARY KEY(settlement_id,shipment_id)
);
CREATE TABLE order_assignments (
 order_id UUID NOT NULL REFERENCES orders(id), department TEXT NOT NULL CHECK(department IN ('sales','warehouse','shipping','support')),
 assigned_to UUID NOT NULL REFERENCES users(id), assigned_by UUID NOT NULL REFERENCES users(id),
 assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(order_id,department)
);

CREATE TABLE promotion_products (promotion_id UUID NOT NULL REFERENCES promotions(id), product_id UUID NOT NULL REFERENCES products(id), PRIMARY KEY(promotion_id,product_id));
CREATE TABLE promotion_variants (promotion_id UUID NOT NULL REFERENCES promotions(id), variant_id UUID NOT NULL REFERENCES product_variants(id), PRIMARY KEY(promotion_id,variant_id));
CREATE TABLE promotion_categories (promotion_id UUID NOT NULL REFERENCES promotions(id), category_id UUID NOT NULL REFERENCES categories(id), PRIMARY KEY(promotion_id,category_id));
CREATE TABLE promotion_customers (promotion_id UUID NOT NULL REFERENCES promotions(id), customer_id UUID NOT NULL REFERENCES customers(id), PRIMARY KEY(promotion_id,customer_id));
CREATE TABLE order_discounts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id), order_item_id UUID,
 promotion_id UUID REFERENCES promotions(id), redemption_id UUID REFERENCES voucher_redemptions(id),
 amount NUMERIC(12,2) NOT NULL CHECK(amount>=0), discount_scope TEXT NOT NULL CHECK(discount_scope IN ('item','shipping')),
 rule_snapshot JSONB NOT NULL CHECK(jsonb_typeof(rule_snapshot)='object'),
 FOREIGN KEY(order_item_id,order_id) REFERENCES order_items(id,order_id),
 CHECK((discount_scope='item')=(order_item_id IS NOT NULL))
);
CREATE TABLE staff_support_limits (
 user_id UUID PRIMARY KEY REFERENCES users(id), max_per_code NUMERIC(12,2) NOT NULL CHECK(max_per_code>=0),
 max_per_day NUMERIC(12,2) NOT NULL CHECK(max_per_day>=0), updated_by UUID REFERENCES users(id)
);
CREATE TABLE content_pages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL,
 page_type TEXT NOT NULL CHECK(page_type IN ('article','landing')), title TEXT NOT NULL,
 content JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 created_by UUID NOT NULL REFERENCES users(id), published_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE collections (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
 description TEXT, image_url TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE collection_products (
 collection_id UUID NOT NULL REFERENCES collections(id), product_id UUID NOT NULL REFERENCES products(id),
 sort_order INT NOT NULL DEFAULT 0, PRIMARY KEY(collection_id,product_id)
);
ALTER TABLE banners ADD COLUMN campaign_id UUID REFERENCES campaigns(id);
ALTER TABLE campaigns ADD COLUMN landing_page_id UUID REFERENCES content_pages(id);
CREATE TABLE campaign_promotions (
 campaign_id UUID NOT NULL REFERENCES campaigns(id), promotion_id UUID NOT NULL REFERENCES promotions(id), PRIMARY KEY(campaign_id,promotion_id)
);
CREATE TABLE ab_test_variants (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ab_test_id UUID NOT NULL REFERENCES ab_tests(id),
 name TEXT NOT NULL, traffic_percentage NUMERIC(5,2) NOT NULL CHECK(traffic_percentage>0 AND traffic_percentage<=100),
 banner_id UUID REFERENCES banners(id), config JSONB NOT NULL DEFAULT '{}',
 UNIQUE(ab_test_id,name), UNIQUE(id,ab_test_id)
);
CREATE TABLE experiment_assignments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ab_test_id UUID NOT NULL REFERENCES ab_tests(id),
 variant_id UUID NOT NULL, subject_key_hash TEXT NOT NULL,
 assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(variant_id,ab_test_id) REFERENCES ab_test_variants(id,ab_test_id), UNIQUE(ab_test_id,subject_key_hash)
);
CREATE TABLE campaign_events (
 id BIGSERIAL PRIMARY KEY, event_key UUID UNIQUE NOT NULL, campaign_id UUID NOT NULL REFERENCES campaigns(id),
 assignment_id UUID REFERENCES experiment_assignments(id), customer_id UUID REFERENCES customers(id),
 session_id UUID REFERENCES sessions(id), order_id UUID REFERENCES orders(id),
 event_type TEXT NOT NULL CHECK(event_type IN ('impression','click','conversion')),
 occurred_at TIMESTAMPTZ NOT NULL, CHECK(customer_id IS NOT NULL OR session_id IS NOT NULL),
 CHECK(event_type<>'conversion' OR order_id IS NOT NULL)
);
ALTER TABLE ab_test_results ADD CONSTRAINT fk_ab_result_variant FOREIGN KEY(variant_id,ab_test_id) REFERENCES ab_test_variants(id,ab_test_id);
ALTER TABLE interaction_events ADD CONSTRAINT fk_interaction_recommendation FOREIGN KEY(recommendation_item_id,product_id) REFERENCES recommendation_log_items(id,product_id);
ALTER TABLE interaction_events ADD CONSTRAINT fk_interaction_assignment FOREIGN KEY(experiment_assignment_id) REFERENCES experiment_assignments(id);
ALTER TABLE recommendation_logs ADD CONSTRAINT fk_reco_assignment FOREIGN KEY(experiment_assignment_id) REFERENCES experiment_assignments(id);

CREATE TABLE dataset_snapshots (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, version TEXT NOT NULL,
 artifact_uri TEXT NOT NULL, sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 event_start TIMESTAMPTZ NOT NULL, event_end TIMESTAMPTZ NOT NULL,
 row_counts JSONB NOT NULL, preprocessing_config JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(event_end>event_start), UNIQUE(name,version)
);
CREATE TABLE training_runs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), dataset_id UUID NOT NULL REFERENCES dataset_snapshots(id),
 algorithm TEXT NOT NULL, code_revision TEXT NOT NULL, parameters JSONB NOT NULL, random_seed BIGINT NOT NULL,
 split_config JSONB NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ,
 status TEXT NOT NULL CHECK(status IN ('running','success','failed')), logs_uri TEXT,
 CHECK(completed_at IS NULL OR completed_at>=started_at)
);
CREATE TABLE evaluation_runs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), model_version_id UUID NOT NULL REFERENCES model_versions(id),
 dataset_id UUID NOT NULL REFERENCES dataset_snapshots(id), protocol JSONB NOT NULL, random_seed BIGINT NOT NULL,
 cohort TEXT NOT NULL CHECK(cohort IN ('all','warm','cold_user','cold_item','guest_session')),
 k INT NOT NULL CHECK(k>0), metrics JSONB NOT NULL, workload JSONB,
 evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE model_deployments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), model_version_id UUID NOT NULL REFERENCES model_versions(id),
 environment TEXT NOT NULL CHECK(environment IN ('development','staging','production')),
 placement recommendation_placement NOT NULL, slot TEXT NOT NULL DEFAULT 'default',
 experiment_variant_id UUID REFERENCES ab_test_variants(id), is_active BOOLEAN NOT NULL DEFAULT FALSE,
 deployed_by UUID REFERENCES users(id), deployed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_active_model_slot ON model_deployments(environment,placement,slot) WHERE is_active;
CREATE TABLE feature_definitions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, version TEXT NOT NULL,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('product','user','session')),
 definition JSONB NOT NULL, freshness_seconds INT NOT NULL CHECK(freshness_seconds>0), UNIQUE(name,version)
);
CREATE TABLE feature_snapshots (
 definition_id UUID NOT NULL REFERENCES feature_definitions(id), entity_id UUID NOT NULL,
 as_of TIMESTAMPTZ NOT NULL, features JSONB NOT NULL, expires_at TIMESTAMPTZ,
 PRIMARY KEY(definition_id,entity_id,as_of), CHECK(expires_at IS NULL OR expires_at>as_of)
);
CREATE TABLE outfit_sets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source TEXT NOT NULL, external_reference TEXT,
 label TEXT NOT NULL CHECK(label IN ('compatible','incompatible','unlabeled')),
 created_by UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE outfit_items (
 outfit_id UUID NOT NULL REFERENCES outfit_sets(id), product_id UUID NOT NULL REFERENCES products(id),
 slot TEXT NOT NULL, PRIMARY KEY(outfit_id,product_id), UNIQUE(outfit_id,slot)
);
ALTER TABLE model_versions ADD CONSTRAINT fk_model_training_run FOREIGN KEY(training_run_id) REFERENCES training_runs(id);
ALTER TABLE product_embeddings ADD CONSTRAINT fk_product_embedding_model FOREIGN KEY(model_version_id) REFERENCES model_versions(id);
ALTER TABLE user_embeddings ADD CONSTRAINT fk_user_embedding_model FOREIGN KEY(model_version_id) REFERENCES model_versions(id);
ALTER TABLE product_compatibility ADD CONSTRAINT fk_compatibility_model FOREIGN KEY(model_version_id) REFERENCES model_versions(id);
CREATE INDEX idx_compat_b ON product_compatibility(product_id_b,compatibility_score DESC);
CREATE INDEX idx_product_embedding_version ON product_embeddings(model_version_id,modality);
-- Exact retrieval mặc định. Nếu cần ANN, tạo partial HNSW theo model_version_id + modality + dimensions sau khi chọn model.
-- Ví dụ trong README; tuyệt đối không trộn không gian vector khác phiên bản trong cùng phép xếp hạng.

CREATE TABLE order_status_transitions (
 from_status order_status NOT NULL, to_status order_status NOT NULL,
 permission_code VARCHAR(100) NOT NULL REFERENCES permissions(code), customer_allowed BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY(from_status,to_status), CHECK(from_status<>to_status)
);
INSERT INTO roles(code,name,is_staff_role) VALUES
 ('admin','Quản trị hệ thống',true),('shop_owner','Chủ cửa hàng',true),('sales_staff','Nhân viên bán hàng',true),
 ('warehouse_staff','Nhân viên kho',true),('shipper_staff','Nhân viên vận chuyển',true),
 ('cskh_staff','Nhân viên chăm sóc khách hàng',true),('marketing_staff','Nhân viên kinh doanh',true),('customer','Khách hàng',false);
INSERT INTO permissions(code,description) SELECT x,x FROM unnest(ARRAY[
 'account.manage','rbac.manage','config.manage','audit.all','audit.shop','model.manage','feature.manage',
 'product.manage','price.manage','staff.manage','report.view','order.view','order.confirm','order.cancel',
 'order.checkout','order.pick','order.pack','order.handover','order.deliver','inventory.receive','inventory.count',
 'inventory.adjust.request','inventory.adjust.approve','inventory.replenish','promotion.create','promotion.approve',
 'content.manage','campaign.manage','support.handle','support.code.issue','return.handle','refund.process',
 'shipment.manage','cod.reconcile','notification.view','notification.retry'
 ]) x;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='admin';
INSERT INTO role_permissions(role_id,permission_id)
 SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
 WHERE (r.code='shop_owner' AND p.code IN ('audit.shop','product.manage','price.manage','staff.manage','report.view','order.view','order.confirm','order.cancel','inventory.adjust.approve','inventory.replenish','promotion.approve','return.handle','refund.process','notification.view','notification.retry','support.code.issue','cod.reconcile'))
 OR (r.code='sales_staff' AND p.code IN ('order.view','order.confirm','order.cancel','order.checkout'))
 OR (r.code='warehouse_staff' AND p.code IN ('order.view','order.pick','order.pack','order.handover','inventory.receive','inventory.count','inventory.adjust.request','inventory.replenish'))
 OR (r.code='shipper_staff' AND p.code IN ('order.view','order.handover','order.deliver','shipment.manage','cod.reconcile'))
 OR (r.code='cskh_staff' AND p.code IN ('order.view','support.handle','support.code.issue','return.handle','notification.view'))
 OR (r.code='marketing_staff' AND p.code IN ('promotion.create','content.manage','campaign.manage'))
 OR (r.code='customer' AND p.code='order.checkout');
INSERT INTO order_status_transitions VALUES
 ('draft','pending_payment','order.checkout',true),('draft','pending_confirmation','order.checkout',true),
 ('pending_payment','pending_confirmation','order.checkout',false),
 ('pending_payment','cancelled','order.cancel',true),('pending_confirmation','cancelled','order.cancel',true),
 ('pending_confirmation','confirmed','order.confirm',false),('confirmed','cancelled','order.cancel',false),
 ('confirmed','picking','order.pick',false),('picking','packed','order.pack',false),
 ('packed','handed_to_carrier','order.handover',false),('handed_to_carrier','shipping','order.deliver',false),
 ('shipping','delivered','order.deliver',false);
INSERT INTO sla_configs(status,max_duration_minutes) VALUES ('pending_confirmation',120),('confirmed',240),('picking',120),('packed',1440),('shipping',4320);

CREATE INDEX idx_payments_order_status ON payments(order_id,status);
CREATE INDEX idx_refunds_payment_status ON refunds(payment_id,status);
CREATE INDEX idx_refunds_order ON refunds(order_id);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_returns_order ON return_requests(order_id);
CREATE INDEX idx_return_items_line ON return_items(order_item_id);
CREATE INDEX idx_shipment_items_line ON shipment_items(order_item_id);
CREATE INDEX idx_ticket_messages_time ON ticket_messages(ticket_id,created_at);
CREATE INDEX idx_support_assignee_status ON support_tickets(assigned_to,status);
CREATE INDEX idx_redemption_quota ON voucher_redemptions(promotion_id,quota_identity_hash,status);
CREATE INDEX idx_orders_sla ON orders(status,updated_at) WHERE status NOT IN ('delivered','cancelled','draft');
CREATE INDEX idx_event_reco ON interaction_events(recommendation_item_id,event_type) WHERE recommendation_item_id IS NOT NULL;

-- ===== Quy tắc dữ liệu và thao tác nguyên tử =====
CREATE FUNCTION has_permission(p_user UUID,p_permission TEXT) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id=u.id
 JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id
 WHERE u.id=p_user AND u.status='active' AND p.code=p_permission)
$$;
CREATE FUNCTION require_permission(p_user UUID,p_permission TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF NOT has_permission(p_user,p_permission) THEN RAISE EXCEPTION 'permission_denied: %',p_permission USING ERRCODE='42501'; END IF; END $$;
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;
CREATE FUNCTION immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'append_only: %',TG_TABLE_NAME USING ERRCODE='23514'; END $$;
CREATE TRIGGER protect_audit BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TRIGGER protect_order_history BEFORE UPDATE OR DELETE ON order_status_history FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TRIGGER protect_movements BEFORE UPDATE OR DELETE ON stock_movements FOR EACH ROW EXECUTE FUNCTION immutable_history();

CREATE FUNCTION check_category_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.parent_id IS NOT NULL AND EXISTS(WITH RECURSIVE ancestors AS (
 SELECT id,parent_id FROM categories WHERE id=NEW.parent_id
 UNION SELECT c.id,c.parent_id FROM categories c JOIN ancestors a ON c.id=a.parent_id
 ) SELECT 1 FROM ancestors WHERE id=NEW.id) THEN RAISE EXCEPTION 'category_cycle' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER category_cycle BEFORE INSERT OR UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION check_category_cycle();

CREATE FUNCTION variant_signature(p_variant UUID) RETURNS TEXT LANGUAGE sql STABLE AS $$
 SELECT coalesce(string_agg(attribute_id::TEXT||'='||attribute_value_id::TEXT,'|' ORDER BY attribute_id),'')
 FROM variant_attribute_values WHERE variant_id=p_variant
$$;
CREATE FUNCTION validate_variant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cat UUID;
BEGIN
 IF TG_OP='UPDATE' AND NEW.product_id<>OLD.product_id THEN RAISE EXCEPTION 'variant_product_immutable' USING ERRCODE='23514'; END IF;
 NEW.attribute_signature=CASE WHEN NEW.is_active OR EXISTS(SELECT 1 FROM variant_attribute_values WHERE variant_id=NEW.id)
 THEN variant_signature(NEW.id) ELSE NULL END;
 IF NEW.is_active THEN
 SELECT category_id INTO cat FROM products WHERE id=NEW.product_id;
 IF EXISTS(SELECT 1 FROM category_attributes ca JOIN attributes a ON a.id=ca.attribute_id
 WHERE ca.category_id=cat AND ca.is_required AND a.is_variant_defining
 AND NOT EXISTS(SELECT 1 FROM variant_attribute_values v WHERE v.variant_id=NEW.id AND v.attribute_id=ca.attribute_id))
 THEN RAISE EXCEPTION 'missing_required_variant_attribute' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER variant_validate BEFORE INSERT OR UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION validate_variant();
CREATE FUNCTION validate_attribute_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aid UUID; is_def BOOLEAN; vid UUID; cat UUID;
BEGIN
 IF TG_TABLE_NAME='variant_attribute_values' THEN
 vid=CASE WHEN TG_OP='DELETE' THEN OLD.variant_id ELSE NEW.variant_id END;
 PERFORM 1 FROM product_variants WHERE id=vid FOR UPDATE;
 IF EXISTS(SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.variant_id=vid AND o.status<>'draft')
 THEN RAISE EXCEPTION 'sold_variant_attributes_immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND NEW.variant_id<>OLD.variant_id THEN RAISE EXCEPTION 'variant_assignment_owner_immutable'; END IF;
 aid=NEW.attribute_id;
 SELECT p.category_id INTO cat FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=NEW.variant_id;
 ELSE
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 SELECT attribute_id INTO aid FROM attribute_values WHERE id=NEW.attribute_value_id;
 SELECT category_id INTO cat FROM products WHERE id=NEW.product_id;
 END IF;
 SELECT is_variant_defining INTO is_def FROM attributes WHERE id=aid;
 IF (TG_TABLE_NAME='variant_attribute_values')<>is_def THEN RAISE EXCEPTION 'wrong_attribute_level' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM category_attributes WHERE category_id=cat)
 AND NOT EXISTS(SELECT 1 FROM category_attributes WHERE category_id=cat AND attribute_id=aid)
 THEN RAISE EXCEPTION 'attribute_not_allowed_for_category' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER variant_attribute_validate BEFORE INSERT OR UPDATE OR DELETE ON variant_attribute_values FOR EACH ROW EXECUTE FUNCTION validate_attribute_assignment();
CREATE TRIGGER product_attribute_validate BEFORE INSERT OR UPDATE ON product_attribute_values FOR EACH ROW EXECUTE FUNCTION validate_attribute_assignment();
CREATE FUNCTION refresh_variant_signature() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE vid UUID;
BEGIN
 vid=CASE WHEN TG_OP='DELETE' THEN OLD.variant_id ELSE NEW.variant_id END;
 UPDATE product_variants SET attribute_signature=variant_signature(vid) WHERE id=vid;
 RETURN NULL;
END $$;
CREATE TRIGGER variant_attribute_signature AFTER INSERT OR UPDATE OR DELETE ON variant_attribute_values FOR EACH ROW EXECUTE FUNCTION refresh_variant_signature();

CREATE FUNCTION guard_order_items() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid UUID; st order_status;
BEGIN
 oid=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
 SELECT status INTO st FROM orders WHERE id=oid FOR UPDATE;
 IF st<>'draft' THEN RAISE EXCEPTION 'submitted_order_items_immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND (NEW.order_id<>OLD.order_id OR NEW.variant_id<>OLD.variant_id) THEN RAISE EXCEPTION 'order_item_identity_immutable'; END IF;
 NEW.discount_amount=coalesce((SELECT sum(amount) FROM order_discounts WHERE order_item_id=NEW.id),0);
 RETURN NEW;
END $$;
CREATE TRIGGER guard_order_items BEFORE INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION guard_order_items();
CREATE FUNCTION refresh_order_totals() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid UUID;
BEGIN
 oid=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
 UPDATE orders SET subtotal=(SELECT coalesce(sum(subtotal),0) FROM order_items WHERE order_id=oid),
 discount_total=(SELECT coalesce(sum(discount_amount),0) FROM order_items WHERE order_id=oid) WHERE id=oid;
 RETURN NULL;
END $$;
CREATE TRIGGER refresh_order_totals AFTER INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION refresh_order_totals();

CREATE FUNCTION guard_stock_hold() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st order_status; purchased INT; already_held BIGINT; d_on INT=0; d_reserved INT=0; refkey TEXT;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'hold_delete_forbidden' USING ERRCODE='23514'; END IF;
 SELECT status INTO st FROM orders WHERE id=NEW.order_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
 IF NEW.status<>'active' OR st NOT IN ('draft','pending_payment','pending_confirmation','confirmed','picking','packed')
 THEN RAISE EXCEPTION 'invalid_hold_creation' USING ERRCODE='23514'; END IF;
 SELECT quantity INTO purchased FROM order_items WHERE id=NEW.order_item_id AND order_id=NEW.order_id AND variant_id=NEW.variant_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'hold_wrong_order_item' USING ERRCODE='23514'; END IF;
 SELECT coalesce(sum(quantity),0) INTO already_held FROM stock_holds WHERE order_item_id=NEW.order_item_id AND status IN ('active','fulfilled');
 IF already_held+NEW.quantity>purchased THEN RAISE EXCEPTION 'hold_exceeds_order_quantity' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM stock_locations WHERE id=NEW.location_id AND is_active AND is_sellable)
 THEN RAISE EXCEPTION 'location_not_sellable' USING ERRCODE='23514'; END IF;
 d_reserved=NEW.quantity; refkey=NEW.id::TEXT||':reserved';
 ELSE
 IF ROW(NEW.order_id,NEW.order_item_id,NEW.variant_id,NEW.location_id,NEW.quantity,NEW.idempotency_key)
 IS DISTINCT FROM ROW(OLD.order_id,OLD.order_item_id,OLD.variant_id,OLD.location_id,OLD.quantity,OLD.idempotency_key)
 THEN RAISE EXCEPTION 'hold_identity_immutable' USING ERRCODE='23514'; END IF;
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF OLD.status<>'active' OR NEW.status NOT IN ('released','fulfilled') THEN RAISE EXCEPTION 'invalid_hold_transition' USING ERRCODE='23514'; END IF;
 IF NEW.status='fulfilled' AND st<>'handed_to_carrier' THEN RAISE EXCEPTION 'hold_fulfill_requires_handover' USING ERRCODE='23514'; END IF;
 d_reserved=-NEW.quantity; d_on=CASE WHEN NEW.status='fulfilled' THEN -NEW.quantity ELSE 0 END;
 refkey=NEW.id::TEXT||':'||NEW.status; NEW.resolved_at=clock_timestamp();
 END IF;
 UPDATE inventory SET quantity_on_hand=quantity_on_hand+d_on,quantity_reserved=quantity_reserved+d_reserved
 WHERE variant_id=NEW.variant_id AND location_id=NEW.location_id
 AND quantity_on_hand+d_on>=quantity_reserved+d_reserved AND quantity_reserved+d_reserved>=0;
 IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_available_stock' USING ERRCODE='23514'; END IF;
 INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reserved_delta,reference_type,reference_id,idempotency_key,created_by)
 VALUES(NEW.variant_id,NEW.location_id,CASE WHEN TG_OP='INSERT' THEN 'reserved'::movement_type WHEN NEW.status='fulfilled' THEN 'outbound'::movement_type ELSE 'released'::movement_type END,
 d_on,d_reserved,'hold',NEW.id,refkey,NEW.requested_by);
 RETURN NEW;
END $$;
CREATE TRIGGER guard_stock_hold BEFORE INSERT OR UPDATE OR DELETE ON stock_holds FOR EACH ROW EXECUTE FUNCTION guard_stock_hold();

CREATE FUNCTION reserve_order(p_order UUID,p_actor UUID DEFAULT NULL,p_ttl INTERVAL DEFAULT interval '30 minutes') RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE line RECORD; bin RECORD; needed INT; take_qty INT; generation TEXT;
BEGIN
 IF p_ttl<=interval '0 seconds' THEN RAISE EXCEPTION 'invalid_hold_ttl'; END IF;
 PERFORM 1 FROM orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
 FOR line IN SELECT * FROM order_items WHERE order_id=p_order ORDER BY variant_id LOOP
 needed=line.quantity-coalesce((SELECT sum(quantity) FROM stock_holds WHERE order_item_id=line.id AND status IN ('active','fulfilled')),0);
 FOR bin IN SELECT i.* FROM inventory i JOIN stock_locations l ON l.id=i.location_id
 WHERE i.variant_id=line.variant_id AND l.is_active AND l.is_sellable AND i.quantity_on_hand>i.quantity_reserved
 ORDER BY i.location_id FOR UPDATE OF i LOOP
 EXIT WHEN needed<=0;
 take_qty=least(needed,bin.quantity_on_hand-bin.quantity_reserved);
 IF EXISTS(SELECT 1 FROM stock_holds WHERE order_item_id=line.id AND location_id=bin.location_id AND status='active') THEN CONTINUE; END IF;
 generation=gen_random_uuid()::TEXT;
 INSERT INTO stock_holds(variant_id,location_id,quantity,order_id,order_item_id,requested_by,idempotency_key,expires_at)
 VALUES(line.variant_id,bin.location_id,take_qty,p_order,line.id,p_actor,p_order::TEXT||':'||line.id::TEXT||':'||generation,now()+p_ttl);
 needed=needed-take_qty;
 END LOOP;
 IF needed>0 THEN RAISE EXCEPTION 'insufficient_available_stock_for_order' USING ERRCODE='23514'; END IF;
 END LOOP;
END $$;

CREATE FUNCTION guard_order() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE paid NUMERIC; refunded NUMERIC; expected_total NUMERIC;
BEGIN
 IF TG_OP='INSERT' THEN
 IF NEW.status<>'draft' THEN RAISE EXCEPTION 'create_order_as_draft' USING ERRCODE='23514'; END IF;
 NEW.subtotal=0; NEW.discount_total=0; NEW.shipping_discount=0; NEW.payment_status='unpaid'; RETURN NEW;
 END IF;
 IF NEW.id<>OLD.id OR NEW.customer_id<>OLD.customer_id OR NEW.checkout_key<>OLD.checkout_key THEN RAISE EXCEPTION 'order_identity_immutable'; END IF;
 IF OLD.status<>'draft' AND ROW(NEW.customer_name,NEW.customer_phone,NEW.customer_email,NEW.shipping_address,NEW.payment_method,NEW.shipping_fee)
 IS DISTINCT FROM ROW(OLD.customer_name,OLD.customer_phone,OLD.customer_email,OLD.shipping_address,OLD.payment_method,OLD.shipping_fee)
 THEN RAISE EXCEPTION 'submitted_order_snapshot_immutable' USING ERRCODE='23514'; END IF;
 NEW.subtotal=coalesce((SELECT sum(subtotal) FROM order_items WHERE order_id=NEW.id),0);
 NEW.discount_total=coalesce((SELECT sum(discount_amount) FROM order_items WHERE order_id=NEW.id),0);
 NEW.shipping_discount=coalesce((SELECT sum(amount) FROM order_discounts WHERE order_id=NEW.id AND discount_scope='shipping'),0);
 expected_total=NEW.subtotal-NEW.discount_total+NEW.shipping_fee-NEW.shipping_discount;
 SELECT coalesce(sum(amount),0) INTO paid FROM payments WHERE order_id=NEW.id AND status='success';
 SELECT coalesce(sum(amount),0) INTO refunded FROM refunds WHERE order_id=NEW.id AND status='success';
 NEW.payment_status=CASE WHEN refunded>0 AND refunded=paid THEN 'refunded'::payment_status
 WHEN refunded>0 THEN 'partial_refunded'::payment_status WHEN paid>=expected_total AND (expected_total>0 OR NEW.status<>'draft') THEN 'paid'::payment_status ELSE 'unpaid'::payment_status END;
 IF NEW.status<>OLD.status THEN
 IF NOT EXISTS(SELECT 1 FROM order_status_transitions WHERE from_status=OLD.status AND to_status=NEW.status)
 THEN RAISE EXCEPTION 'invalid_order_transition: % -> %',OLD.status,NEW.status USING ERRCODE='23514'; END IF;
 IF OLD.status='draft' THEN
 IF NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=NEW.id) THEN RAISE EXCEPTION 'empty_order' USING ERRCODE='23514'; END IF;
 IF NOT (NEW.shipping_address ?& ARRAY['province','ward','street_address'])
 OR length(trim(coalesce(NEW.shipping_address->>'street_address','')))=0
 THEN RAISE EXCEPTION 'incomplete_shipping_address' USING ERRCODE='23514'; END IF;
 IF NEW.payment_method='cod' AND NEW.status<>'pending_confirmation' THEN RAISE EXCEPTION 'cod_skip_pending_payment' USING ERRCODE='23514'; END IF;
 IF NEW.payment_method<>'cod' AND expected_total>0 AND NEW.status<>'pending_payment' THEN RAISE EXCEPTION 'online_requires_payment' USING ERRCODE='23514'; END IF;
 NEW.submitted_at=clock_timestamp();
 END IF;
 IF NEW.status IN ('pending_confirmation','confirmed') AND NEW.payment_method<>'cod' AND paid-refunded<expected_total
 THEN RAISE EXCEPTION 'payment_not_captured' USING ERRCODE='23514'; END IF;
 IF NEW.status IN ('pending_payment','pending_confirmation','confirmed','picking','packed','handed_to_carrier')
 AND EXISTS(SELECT 1 FROM order_items oi WHERE oi.order_id=NEW.id AND oi.quantity>
 coalesce((SELECT sum(h.quantity) FROM stock_holds h WHERE h.order_item_id=oi.id AND h.status='active'
 AND (h.expires_at IS NULL OR h.expires_at>now())),0))
 THEN RAISE EXCEPTION 'order_not_fully_reserved' USING ERRCODE='23514'; END IF;
 IF NEW.status='handed_to_carrier' AND EXISTS(SELECT 1 FROM order_items oi WHERE oi.order_id=NEW.id AND oi.quantity<>
 coalesce((SELECT sum(si.quantity) FROM shipment_items si WHERE si.order_item_id=oi.id),0))
 THEN RAISE EXCEPTION 'order_not_fully_packed_into_shipments' USING ERRCODE='23514'; END IF;
 IF NEW.status='confirmed' THEN NEW.confirmed_at=clock_timestamp(); END IF;
 IF NEW.status='cancelled' THEN NEW.cancelled_at=clock_timestamp(); END IF;
 END IF;
 NEW.version=OLD.version+1; NEW.updated_at=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER guard_order BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION guard_order();
CREATE FUNCTION after_order_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor UUID;
BEGIN
 IF NEW.status=OLD.status THEN RETURN NULL; END IF;
 actor=nullif(current_setting('ettee.actor_id',true),'')::UUID;
 IF NEW.status='cancelled' THEN
 UPDATE stock_holds SET status='released',released_reason='order_cancelled' WHERE order_id=NEW.id AND status='active';
 UPDATE voucher_redemptions SET status='released' WHERE order_id=NEW.id AND status='reserved';
 ELSIF NEW.status='confirmed' THEN UPDATE stock_holds SET expires_at=NULL WHERE order_id=NEW.id AND status='active';
 ELSIF NEW.status='handed_to_carrier' THEN UPDATE stock_holds SET status='fulfilled' WHERE order_id=NEW.id AND status='active';
 END IF;
 INSERT INTO order_status_history(order_id,from_status,status,order_version,changed_by,note)
 VALUES(NEW.id,OLD.status,NEW.status,NEW.version,actor,nullif(current_setting('ettee.order_note',true),''));
 INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,old_value,new_value)
 VALUES(actor,'order.status_change','order',NEW.id,jsonb_build_object('status',OLD.status),jsonb_build_object('status',NEW.status,'version',NEW.version));
 PERFORM emit_order_event(NEW.id,'order.status_changed',NEW.status::TEXT,'order:'||NEW.id||':'||NEW.version,
 jsonb_build_object('from_status',OLD.status,'to_status',NEW.status));
 RETURN NULL;
END $$;
CREATE TRIGGER after_order_change AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION after_order_change();
CREATE FUNCTION submit_order(p_order UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE o orders%ROWTYPE;
BEGIN
 SELECT * INTO STRICT o FROM orders WHERE id=p_order FOR UPDATE;
 IF o.status<>'draft' THEN RETURN; END IF;
 PERFORM validate_checkout_promotions(p_order);
 PERFORM reserve_order(p_order);
 UPDATE orders SET status=CASE WHEN payment_method='cod' OR total=0 THEN 'pending_confirmation'::order_status ELSE 'pending_payment'::order_status END WHERE id=p_order;
END $$;
CREATE FUNCTION change_order_status(p_order UUID,p_expected_version BIGINT,p_to order_status,p_actor UUID,p_note TEXT DEFAULT NULL) RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE o orders%ROWTYPE; tr order_status_transitions%ROWTYPE; ver BIGINT;
BEGIN
 SELECT * INTO STRICT o FROM orders WHERE id=p_order FOR UPDATE;
 IF o.version<>p_expected_version THEN RAISE EXCEPTION 'order_version_conflict' USING ERRCODE='40001'; END IF;
 SELECT * INTO tr FROM order_status_transitions WHERE from_status=o.status AND to_status=p_to;
 IF NOT FOUND THEN RAISE EXCEPTION 'invalid_order_transition' USING ERRCODE='23514'; END IF;
 IF NOT has_permission(p_actor,tr.permission_code) AND NOT(tr.customer_allowed AND EXISTS(
 SELECT 1 FROM customers c JOIN users u ON u.id=c.user_id WHERE c.id=o.customer_id AND u.id=p_actor AND u.status='active'))
 THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 PERFORM set_config('ettee.actor_id',coalesce(p_actor::TEXT,''),true); PERFORM set_config('ettee.order_note',coalesce(p_note,''),true);
 UPDATE orders SET status=p_to,confirmed_by=CASE WHEN p_to='confirmed' THEN p_actor ELSE confirmed_by END,
 cancelled_by=CASE WHEN p_to='cancelled' THEN p_actor ELSE cancelled_by END,
 cancelled_reason=CASE WHEN p_to='cancelled' THEN p_note ELSE cancelled_reason END WHERE id=p_order RETURNING version INTO ver;
 PERFORM set_config('ettee.actor_id','',true); PERFORM set_config('ettee.order_note','',true);
 RETURN ver;
END $$;
CREATE FUNCTION expire_pending_orders(p_limit INT DEFAULT 100) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE o RECORD; n INT=0;
BEGIN
 FOR o IN SELECT id FROM orders WHERE status IN ('pending_payment','pending_confirmation') AND EXISTS(
 SELECT 1 FROM stock_holds h WHERE h.order_id=orders.id AND h.status='active' AND h.expires_at<=now())
 ORDER BY id FOR UPDATE SKIP LOCKED LIMIT p_limit LOOP
 UPDATE orders SET status='cancelled',cancelled_reason='reservation_expired' WHERE id=o.id; n=n+1;
 END LOOP; RETURN n;
END $$;

CREATE FUNCTION guard_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o orders%ROWTYPE; captured NUMERIC;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'payment_delete_forbidden' USING ERRCODE='23514'; END IF;
 SELECT * INTO STRICT o FROM orders WHERE id=NEW.order_id FOR UPDATE;
 IF o.status='draft' THEN RAISE EXCEPTION 'payment_requires_submitted_order'; END IF;
 IF TG_OP='UPDATE' THEN
 IF ROW(NEW.order_id,NEW.amount,NEW.method,NEW.provider,NEW.provider_account,NEW.idempotency_key)
 IS DISTINCT FROM ROW(OLD.order_id,OLD.amount,OLD.method,OLD.provider,OLD.provider_account,OLD.idempotency_key)
 THEN RAISE EXCEPTION 'payment_identity_immutable'; END IF;
 IF OLD.status IN ('success','failed','cancelled') AND ROW(NEW.status,NEW.transaction_ref,NEW.paid_at) IS DISTINCT FROM ROW(OLD.status,OLD.transaction_ref,OLD.paid_at)
 THEN RAISE EXCEPTION 'payment_terminal_immutable'; END IF;
 END IF;
 IF NEW.status='success' THEN
 NEW.paid_at=coalesce(NEW.paid_at,clock_timestamp());
 SELECT coalesce(sum(amount),0) INTO captured FROM payments WHERE order_id=NEW.order_id AND status='success' AND id<>NEW.id;
 IF captured+NEW.amount>o.total THEN RAISE EXCEPTION 'payment_exceeds_order_total' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_payment BEFORE INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION guard_payment();
CREATE FUNCTION after_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE orders SET updated_at=clock_timestamp() WHERE id=NEW.order_id;
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
 PERFORM emit_order_event(NEW.order_id,'payment.status_changed',NEW.status,'payment:'||NEW.id||':'||NEW.status,jsonb_build_object('payment_id',NEW.id));
 END IF;
 IF NEW.status='success' THEN
 UPDATE voucher_redemptions SET status='consumed' WHERE order_id=NEW.order_id AND status='reserved';
 -- Thanh toán về muộn khi đơn đã hủy vẫn ghi nhận tiền; cần quy trình hoàn tiền, không tự khôi phục đơn.
 IF EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='pending_payment' AND payment_status='paid') THEN
 IF EXISTS(SELECT 1 FROM stock_holds WHERE order_id=NEW.order_id AND status='active' AND expires_at<=now()) THEN
 UPDATE orders SET status='cancelled',cancelled_reason='payment_received_after_reservation_expired' WHERE id=NEW.order_id;
 ELSE UPDATE orders SET status='pending_confirmation' WHERE id=NEW.order_id; END IF;
 END IF;
 END IF; RETURN NULL;
END $$;
CREATE TRIGGER after_payment AFTER INSERT OR UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION after_payment();
CREATE FUNCTION guard_refund() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p payments%ROWTYPE; allocated NUMERIC;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'refund_delete_forbidden'; END IF;
 PERFORM 1 FROM orders WHERE id=NEW.order_id FOR UPDATE;
 SELECT * INTO STRICT p FROM payments WHERE id=NEW.payment_id AND order_id=NEW.order_id FOR UPDATE;
 IF p.status<>'success' THEN RAISE EXCEPTION 'refund_requires_captured_payment' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND (ROW(NEW.payment_id,NEW.order_id,NEW.return_request_id,NEW.amount,NEW.idempotency_key)
 IS DISTINCT FROM ROW(OLD.payment_id,OLD.order_id,OLD.return_request_id,OLD.amount,OLD.idempotency_key)
 OR (OLD.status<>'pending' AND NEW.status<>OLD.status)) THEN RAISE EXCEPTION 'refund_identity_or_terminal_immutable'; END IF;
 SELECT coalesce(sum(amount),0) INTO allocated FROM refunds WHERE payment_id=NEW.payment_id AND id<>NEW.id AND status IN ('pending','success');
 IF NEW.status IN ('pending','success') AND allocated+NEW.amount>p.amount THEN RAISE EXCEPTION 'refund_exceeds_captured_amount' USING ERRCODE='23514'; END IF;
 IF NEW.status='success' THEN NEW.processed_at=coalesce(NEW.processed_at,clock_timestamp()); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_refund BEFORE INSERT OR UPDATE OR DELETE ON refunds FOR EACH ROW EXECUTE FUNCTION guard_refund();
CREATE FUNCTION after_refund() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE orders SET updated_at=clock_timestamp() WHERE id=NEW.order_id;
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
 PERFORM emit_order_event(NEW.order_id,'refund.status_changed',NEW.status,'refund:'||NEW.id||':'||NEW.status,jsonb_build_object('refund_id',NEW.id)); END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER after_refund AFTER INSERT OR UPDATE OF status ON refunds FOR EACH ROW EXECUTE FUNCTION after_refund();

CREATE FUNCTION guard_return_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE req return_requests%ROWTYPE; purchased INT; used_qty BIGINT;
BEGIN
 IF TG_OP='UPDATE' AND ROW(NEW.order_id,NEW.order_item_id,NEW.return_request_id,NEW.quantity) IS DISTINCT FROM ROW(OLD.order_id,OLD.order_item_id,OLD.return_request_id,OLD.quantity)
 THEN RAISE EXCEPTION 'return_line_identity_immutable'; END IF;
 SELECT * INTO STRICT req FROM return_requests WHERE id=NEW.return_request_id;
 SELECT oi.quantity INTO purchased FROM order_items oi JOIN orders o ON o.id=oi.order_id
 WHERE oi.id=NEW.order_item_id AND o.id=NEW.order_id AND o.status='delivered' FOR UPDATE OF oi;
 IF NOT FOUND THEN RAISE EXCEPTION 'return_requires_delivered_order_item' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' AND req.status<>'requested' THEN RAISE EXCEPTION 'add_return_line_only_when_requested'; END IF;
 SELECT coalesce(sum(ri.quantity),0) INTO used_qty FROM return_items ri JOIN return_requests r ON r.id=ri.return_request_id
 WHERE ri.order_item_id=NEW.order_item_id AND ri.id<>NEW.id AND r.status NOT IN ('rejected','cancelled');
 IF used_qty+NEW.quantity>purchased THEN RAISE EXCEPTION 'return_exceeds_purchased_quantity' USING ERRCODE='23514'; END IF;
 IF (req.request_type='exchange')<>(NEW.replacement_variant_id IS NOT NULL) THEN RAISE EXCEPTION 'exchange_requires_replacement_variant' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_return_item BEFORE INSERT OR UPDATE ON return_items FOR EACH ROW EXECUTE FUNCTION guard_return_item();
CREATE FUNCTION guard_return_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM orders WHERE id=NEW.order_id AND status='delivered' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'return_requires_delivered_order' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
 IF NEW.status<>'requested' THEN RAISE EXCEPTION 'return_initial_status'; END IF;
 ELSE
 IF ROW(NEW.order_id,NEW.request_type) IS DISTINCT FROM ROW(OLD.order_id,OLD.request_type) THEN RAISE EXCEPTION 'return_identity_immutable'; END IF;
 IF NEW.status<>OLD.status AND NOT (
 (OLD.status='requested' AND NEW.status IN ('approved','rejected','cancelled')) OR
 (OLD.status='approved' AND NEW.status IN ('item_received','cancelled')) OR
 (OLD.status='item_received' AND NEW.status IN ('exchange_sent','refunded','completed')) OR
 (OLD.status='exchange_sent' AND NEW.status='completed')) THEN RAISE EXCEPTION 'invalid_return_transition' USING ERRCODE='23514'; END IF;
 IF NEW.status='approved' AND NOT EXISTS(SELECT 1 FROM return_items WHERE return_request_id=NEW.id) THEN RAISE EXCEPTION 'empty_return_request'; END IF;
 IF NEW.status='exchange_sent' AND (NEW.request_type<>'exchange' OR NEW.replacement_order_id IS NULL) THEN RAISE EXCEPTION 'missing_exchange_order'; END IF;
 NEW.version=OLD.version+1;
 END IF;
 IF NEW.status IN ('rejected','completed','refunded','cancelled') THEN NEW.resolved_at=clock_timestamp(); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_return_request BEFORE INSERT OR UPDATE ON return_requests FOR EACH ROW EXECUTE FUNCTION guard_return_request();
CREATE FUNCTION after_return_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
 PERFORM emit_order_event(NEW.order_id,'return.status_changed',NEW.status::TEXT,'return:'||NEW.id||':'||NEW.version,jsonb_build_object('return_request_id',NEW.id,'request_type',NEW.request_type)); END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER after_return_request AFTER INSERT OR UPDATE OF status ON return_requests FOR EACH ROW EXECUTE FUNCTION after_return_request();
CREATE FUNCTION guard_shipment_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bought INT; packed BIGINT; st order_status;
BEGIN
 SELECT status INTO st FROM orders WHERE id=NEW.order_id FOR UPDATE;
 IF st NOT IN ('confirmed','picking','packed') THEN RAISE EXCEPTION 'shipment_items_wrong_order_stage'; END IF;
 SELECT quantity INTO bought FROM order_items WHERE id=NEW.order_item_id AND order_id=NEW.order_id FOR UPDATE;
 IF TG_OP='UPDATE' AND ROW(NEW.shipment_id,NEW.order_id,NEW.order_item_id) IS DISTINCT FROM ROW(OLD.shipment_id,OLD.order_id,OLD.order_item_id) THEN RAISE EXCEPTION 'shipment_item_identity_immutable'; END IF;
 SELECT coalesce(sum(quantity),0) INTO packed FROM shipment_items WHERE order_item_id=NEW.order_item_id AND shipment_id<>NEW.shipment_id;
 IF packed+NEW.quantity>bought THEN RAISE EXCEPTION 'shipment_exceeds_order_quantity' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_shipment_item BEFORE INSERT OR UPDATE ON shipment_items FOR EACH ROW EXECUTE FUNCTION guard_shipment_item();
CREATE FUNCTION guard_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE auth review_authorizations%ROWTYPE; buyer UUID; ost order_status; grantrow order_access_grants%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
 IF ROW(NEW.order_item_id,NEW.customer_id,NEW.authorization_id) IS DISTINCT FROM ROW(OLD.order_item_id,OLD.customer_id,OLD.authorization_id) THEN RAISE EXCEPTION 'review_buyer_immutable'; END IF;
 RETURN NEW;
 END IF;
 SELECT * INTO STRICT auth FROM review_authorizations WHERE id=NEW.authorization_id FOR UPDATE;
 SELECT o.customer_id,o.status INTO buyer,ost FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.id=NEW.order_item_id;
 IF buyer IS DISTINCT FROM NEW.customer_id OR ost<>'delivered' OR auth.expires_at<=now()
 THEN RAISE EXCEPTION 'review_requires_verified_buyer_and_delivery' USING ERRCODE='23514'; END IF;
 IF auth.method='guest_verified' THEN
 SELECT * INTO STRICT grantrow FROM order_access_grants WHERE id=auth.access_grant_id;
 IF grantrow.customer_id<>buyer OR grantrow.scope<>'review' OR grantrow.expires_at<=now() OR grantrow.revoked_at IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM order_items WHERE id=NEW.order_item_id AND order_id=grantrow.order_id)
 OR NOT EXISTS(SELECT 1 FROM identity_verifications WHERE id=grantrow.verification_id AND customer_id=buyer AND verified_at IS NOT NULL)
 THEN RAISE EXCEPTION 'invalid_guest_review_grant' USING ERRCODE='23514'; END IF;
 ELSE
 IF NOT EXISTS(SELECT 1 FROM customers WHERE id=buyer AND user_id IS NOT NULL) THEN RAISE EXCEPTION 'authenticated_review_requires_account'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_review BEFORE INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION guard_review();

CREATE FUNCTION guard_embedding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dim INT; space TEXT;
BEGIN
 SELECT embedding_dim,embedding_space INTO dim,space FROM model_versions WHERE id=NEW.model_version_id;
 IF dim IS NULL OR space IS NULL OR vector_dims(NEW.embedding)<>dim OR vector_norm(NEW.embedding)=0
 THEN RAISE EXCEPTION 'embedding_dimension_or_space_invalid' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_product_embedding BEFORE INSERT OR UPDATE ON product_embeddings FOR EACH ROW EXECUTE FUNCTION guard_embedding();
CREATE TRIGGER guard_user_embedding BEFORE INSERT OR UPDATE ON user_embeddings FOR EACH ROW EXECUTE FUNCTION guard_embedding();
CREATE FUNCTION guard_quiz_response() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM style_quiz_questions q CROSS JOIN LATERAL jsonb_array_elements(q.options) o
 WHERE q.id=NEW.question_id AND o->>'id'=NEW.selected_option) THEN RAISE EXCEPTION 'invalid_quiz_option' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_quiz_response BEFORE INSERT OR UPDATE ON style_quiz_responses FOR EACH ROW EXECUTE FUNCTION guard_quiz_response();
CREATE FUNCTION guard_purchase_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.event_type='purchase' AND NOT EXISTS(SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id
 JOIN product_variants v ON v.id=oi.variant_id JOIN customers c ON c.id=o.customer_id
 WHERE oi.id=NEW.order_item_id AND v.product_id=NEW.product_id
 AND (NEW.variant_id IS NULL OR NEW.variant_id=oi.variant_id) AND o.status='delivered'
 AND ((NEW.user_id IS NOT NULL AND c.user_id=NEW.user_id) OR (NEW.user_id IS NULL AND NEW.session_id=o.origin_session_id)))
 THEN RAISE EXCEPTION 'purchase_event_not_verified' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_purchase_event BEFORE INSERT OR UPDATE ON interaction_events FOR EACH ROW EXECUTE FUNCTION guard_purchase_event();

CREATE FUNCTION post_stock_receipt(p_receipt UUID,p_actor UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE r stock_receipts%ROWTYPE; line RECORD; mid UUID;
BEGIN
 PERFORM require_permission(p_actor,'inventory.receive');
 SELECT * INTO STRICT r FROM stock_receipts WHERE id=p_receipt FOR UPDATE;
 IF r.status='posted' THEN RETURN; END IF;
 IF r.status<>'draft' OR NOT EXISTS(SELECT 1 FROM stock_receipt_items WHERE receipt_id=p_receipt) THEN RAISE EXCEPTION 'invalid_or_empty_receipt'; END IF;
 FOR line IN SELECT * FROM stock_receipt_items WHERE receipt_id=p_receipt ORDER BY variant_id,location_id LOOP
 INSERT INTO inventory(variant_id,location_id,quantity_on_hand) VALUES(line.variant_id,line.location_id,line.quantity)
 ON CONFLICT(variant_id,location_id) DO UPDATE SET quantity_on_hand=inventory.quantity_on_hand+EXCLUDED.quantity_on_hand;
 INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reference_type,reference_id,idempotency_key,created_by)
 VALUES(line.variant_id,line.location_id,'inbound',line.quantity,'receipt_item',line.id,'receipt:'||line.id,p_actor) RETURNING id INTO mid;
 UPDATE stock_receipt_items SET movement_id=mid WHERE id=line.id;
 END LOOP;
 UPDATE stock_receipts SET status='posted',posted_at=clock_timestamp(),posted_by=p_actor WHERE id=p_receipt;
END $$;
CREATE FUNCTION apply_stock_adjustment(p_request UUID,p_actor UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE r stock_adjustment_requests%ROWTYPE; mid UUID;
BEGIN
 PERFORM require_permission(p_actor,'inventory.adjust.approve');
 SELECT * INTO STRICT r FROM stock_adjustment_requests WHERE id=p_request FOR UPDATE;
 IF r.applied_movement_id IS NOT NULL THEN RETURN; END IF;
 IF r.status='rejected' OR r.requested_by=p_actor THEN RAISE EXCEPTION 'invalid_adjustment_approval'; END IF;
 UPDATE inventory SET quantity_on_hand=quantity_on_hand+r.quantity_diff WHERE variant_id=r.variant_id AND location_id=r.location_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'inventory_row_missing'; END IF;
 INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reference_type,reference_id,idempotency_key,created_by)
 VALUES(r.variant_id,r.location_id,'adjustment',r.quantity_diff,'adjustment',r.id,'adjustment:'||r.id,p_actor) RETURNING id INTO mid;
 UPDATE stock_adjustment_requests SET status='approved',approved_by=p_actor,approved_at=clock_timestamp(),applied_movement_id=mid WHERE id=r.id;
END $$;

CREATE FUNCTION guard_discount() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid UUID; st order_status;
BEGIN
 oid=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
 SELECT status INTO st FROM orders WHERE id=oid FOR UPDATE;
 IF st<>'draft' THEN RAISE EXCEPTION 'submitted_discount_immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.order_id,NEW.order_item_id,NEW.discount_scope,NEW.promotion_id) IS DISTINCT FROM ROW(OLD.order_id,OLD.order_item_id,OLD.discount_scope,OLD.promotion_id) THEN RAISE EXCEPTION 'discount_identity_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_discount BEFORE INSERT OR UPDATE OR DELETE ON order_discounts FOR EACH ROW EXECUTE FUNCTION guard_discount();
CREATE FUNCTION after_discount() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE line UUID; oid UUID;
BEGIN
 line=CASE WHEN TG_OP='DELETE' THEN OLD.order_item_id ELSE NEW.order_item_id END;
 oid=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
 IF line IS NOT NULL THEN UPDATE order_items SET discount_amount=coalesce((SELECT sum(amount) FROM order_discounts WHERE order_item_id=line),0) WHERE id=line;
 ELSE UPDATE orders SET updated_at=clock_timestamp() WHERE id=oid; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER after_discount AFTER INSERT OR UPDATE OR DELETE ON order_discounts FOR EACH ROW EXECUTE FUNCTION after_discount();
CREATE FUNCTION guard_redemption() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p promotions%ROWTYPE; c customers%ROWTYPE; n INT; personal INT;
BEGIN
 PERFORM 1 FROM orders WHERE id=NEW.order_id FOR UPDATE;
 SELECT * INTO STRICT p FROM promotions WHERE id=NEW.promotion_id FOR UPDATE;
 SELECT * INTO STRICT c FROM customers WHERE id=NEW.customer_id;
 IF TG_OP='UPDATE' THEN
 IF ROW(NEW.order_id,NEW.customer_id,NEW.promotion_id,NEW.discount_amount) IS DISTINCT FROM ROW(OLD.order_id,OLD.customer_id,OLD.promotion_id,OLD.discount_amount)
 OR (OLD.status IN ('released','consumed') AND NEW.status<>OLD.status) THEN RAISE EXCEPTION 'redemption_identity_or_terminal_immutable'; END IF;
 NEW.quota_identity_hash=OLD.quota_identity_hash;
 IF NEW.status IN ('released','consumed') THEN RETURN NEW; END IF;
 END IF;
 IF p.status<>'active' OR now()<p.start_at OR now()>=p.end_at THEN RAISE EXCEPTION 'promotion_not_active' USING ERRCODE='23514'; END IF;
 IF c.phone_verified_at IS NOT NULL THEN NEW.quota_identity_hash=encode(digest('phone:'||c.phone,'sha256'),'hex');
 ELSIF c.email_verified_at IS NOT NULL AND c.email IS NOT NULL THEN NEW.quota_identity_hash=encode(digest('email:'||lower(trim(c.email)),'sha256'),'hex');
 ELSE RAISE EXCEPTION 'promotion_quota_requires_verified_contact' USING ERRCODE='23514'; END IF;
 SELECT count(*),count(*) FILTER(WHERE quota_identity_hash=NEW.quota_identity_hash) INTO n,personal
 FROM voucher_redemptions WHERE promotion_id=p.id AND id<>NEW.id AND status IN ('reserved','consumed');
 IF (p.usage_limit IS NOT NULL AND n>=p.usage_limit) OR personal>=p.usage_limit_per_customer THEN RAISE EXCEPTION 'promotion_usage_limit' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_redemption BEFORE INSERT OR UPDATE ON voucher_redemptions FOR EACH ROW EXECUTE FUNCTION guard_redemption();
CREATE FUNCTION promotion_matches_variant(p_promotion UUID,p_variant UUID) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM promotions p JOIN product_variants v ON v.id=p_variant JOIN products pr ON pr.id=v.product_id
 WHERE p.id=p_promotion AND (p.eligibility_scope='all'
 OR (p.eligibility_scope='products' AND EXISTS(SELECT 1 FROM promotion_products WHERE promotion_id=p.id AND product_id=v.product_id))
 OR (p.eligibility_scope='variants' AND EXISTS(SELECT 1 FROM promotion_variants WHERE promotion_id=p.id AND variant_id=v.id))
 OR (p.eligibility_scope='categories' AND EXISTS(SELECT 1 FROM promotion_categories WHERE promotion_id=p.id AND category_id=pr.category_id))))
$$;
CREATE FUNCTION validate_checkout_promotions(p_order UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE o orders%ROWTYPE; r RECORD; eligible NUMERIC; actual NUMERIC; maximum NUMERIC;
BEGIN
 SELECT * INTO STRICT o FROM orders WHERE id=p_order FOR UPDATE;
 FOR r IN SELECT vr.id redemption_id,vr.discount_amount,p.* FROM voucher_redemptions vr JOIN promotions p ON p.id=vr.promotion_id
 WHERE vr.order_id=p_order AND vr.status='reserved' ORDER BY p.id FOR UPDATE OF p LOOP
 IF r.status<>'active' OR now()<r.start_at OR now()>=r.end_at OR o.subtotal<r.min_order_value THEN RAISE EXCEPTION 'promotion_ineligible_at_checkout'; END IF;
 IF r.customer_scope='selected' AND NOT EXISTS(SELECT 1 FROM promotion_customers WHERE promotion_id=r.id AND customer_id=o.customer_id) THEN RAISE EXCEPTION 'promotion_customer_ineligible'; END IF;
 IF r.customer_scope='first_purchase' AND EXISTS(SELECT 1 FROM orders WHERE customer_id=o.customer_id AND id<>o.id AND status NOT IN ('draft','cancelled')) THEN RAISE EXCEPTION 'promotion_not_first_purchase'; END IF;
 IF NOT r.stackable AND (SELECT count(*) FROM voucher_redemptions WHERE order_id=p_order AND status='reserved')>1 THEN RAISE EXCEPTION 'promotion_not_stackable'; END IF;
 SELECT coalesce(sum(subtotal),0) INTO eligible FROM order_items WHERE order_id=p_order AND promotion_matches_variant(r.id,variant_id);
 IF eligible=0 THEN RAISE EXCEPTION 'promotion_no_eligible_items'; END IF;
 SELECT coalesce(sum(amount),0) INTO actual FROM order_discounts WHERE order_id=p_order AND promotion_id=r.id AND redemption_id=r.redemption_id;
 IF actual<>r.discount_amount THEN RAISE EXCEPTION 'promotion_allocation_mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM order_discounts d WHERE d.order_id=p_order AND d.promotion_id=r.id
 AND ((r.discount_type='free_shipping')<>(d.discount_scope='shipping'))) THEN RAISE EXCEPTION 'promotion_wrong_discount_scope'; END IF;
 IF EXISTS(SELECT 1 FROM order_discounts d JOIN order_items oi ON oi.id=d.order_item_id WHERE d.order_id=p_order AND d.promotion_id=r.id AND NOT promotion_matches_variant(r.id,oi.variant_id)) THEN RAISE EXCEPTION 'discount_on_ineligible_variant'; END IF;
 maximum=CASE r.discount_type WHEN 'percentage' THEN round(eligible*r.discount_value/100,2) WHEN 'fixed_amount' THEN least(eligible,r.discount_value) ELSE o.shipping_fee END;
 IF r.max_discount_amount IS NOT NULL THEN maximum=least(maximum,r.max_discount_amount); END IF;
 IF actual>maximum THEN RAISE EXCEPTION 'promotion_discount_exceeds_rule'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM order_discounts d WHERE d.order_id=p_order AND d.promotion_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM voucher_redemptions vr WHERE vr.id=d.redemption_id AND vr.promotion_id=d.promotion_id AND vr.order_id=p_order AND vr.status='reserved'))
 THEN RAISE EXCEPTION 'discount_without_valid_redemption'; END IF;
END $$;

CREATE FUNCTION guard_support_code() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lim staff_support_limits%ROWTYPE; spent NUMERIC;
BEGIN
 IF TG_OP='UPDATE' AND ROW(NEW.issued_by,NEW.value,NEW.customer_id,NEW.promotion_id,NEW.ticket_id,NEW.issued_at) IS DISTINCT FROM ROW(OLD.issued_by,OLD.value,OLD.customer_id,OLD.promotion_id,OLD.ticket_id,OLD.issued_at) THEN RAISE EXCEPTION 'support_code_identity_immutable'; END IF;
 PERFORM require_permission(NEW.issued_by,'support.code.issue');
 SELECT * INTO lim FROM staff_support_limits WHERE user_id=NEW.issued_by FOR UPDATE;
 SELECT coalesce(sum(value),0) INTO spent FROM support_codes WHERE issued_by=NEW.issued_by AND id<>NEW.id AND approval_status='approved'
 AND (issued_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE=(NEW.issued_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
 IF NEW.approval_status='approved' AND (lim.user_id IS NULL OR NEW.value>lim.max_per_code OR spent+NEW.value>lim.max_per_day)
 THEN PERFORM require_permission(NEW.approved_by,'promotion.approve'); END IF;
 IF NOT EXISTS(SELECT 1 FROM support_tickets WHERE id=NEW.ticket_id AND customer_id=NEW.customer_id) THEN RAISE EXCEPTION 'support_code_wrong_customer'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_support_code BEFORE INSERT OR UPDATE ON support_codes FOR EACH ROW EXECUTE FUNCTION guard_support_code();

CREATE FUNCTION validate_ab_traffic() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tid UUID; total NUMERIC; st TEXT;
BEGIN
 tid=CASE WHEN TG_TABLE_NAME='ab_tests' THEN NEW.id WHEN TG_OP='DELETE' THEN OLD.ab_test_id ELSE NEW.ab_test_id END;
 SELECT status INTO st FROM ab_tests WHERE id=tid FOR UPDATE;
 SELECT coalesce(sum(traffic_percentage),0) INTO total FROM ab_test_variants WHERE ab_test_id=tid;
 IF total>100 OR (st='running' AND total<>100) THEN RAISE EXCEPTION 'invalid_experiment_traffic_total' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER validate_ab_traffic AFTER INSERT OR UPDATE OR DELETE ON ab_test_variants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_ab_traffic();
CREATE CONSTRAINT TRIGGER validate_ab_running AFTER INSERT OR UPDATE ON ab_tests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_ab_traffic();

CREATE FUNCTION eligible_recommendation_variants(p_customer UUID DEFAULT NULL,p_zone UUID DEFAULT NULL,
 p_size_value UUID DEFAULT NULL,p_promotion UUID DEFAULT NULL,p_recent_days INT DEFAULT 30)
 RETURNS TABLE(product_id UUID,variant_id UUID,available_quantity BIGINT,delivery_check_required BOOLEAN)
 LANGUAGE sql STABLE AS $$
 SELECT p.id,v.id,i.available_quantity,(p_zone IS NULL)
 FROM products p JOIN categories c ON c.id=p.category_id JOIN product_variants v ON v.product_id=p.id
 JOIN inventory_available i ON i.variant_id=v.id
 WHERE p.status='active' AND c.is_active AND v.is_active AND i.available_quantity>0
 AND (p_size_value IS NULL OR EXISTS(SELECT 1 FROM variant_attribute_values va WHERE va.variant_id=v.id AND va.attribute_value_id=p_size_value))
 AND (p_zone IS NULL OR (EXISTS(SELECT 1 FROM shipping_service_zones sz JOIN shipping_services ss ON ss.id=sz.service_id
 JOIN shipping_zones z ON z.id=sz.zone_id WHERE sz.zone_id=p_zone AND z.enabled AND ss.enabled AND sz.is_serviceable)
 AND NOT EXISTS(SELECT 1 FROM product_shipping_restrictions WHERE product_id=p.id AND zone_id=p_zone)))
 AND (p_promotion IS NULL OR EXISTS(SELECT 1 FROM promotions pm WHERE pm.id=p_promotion AND pm.status='active' AND now()>=pm.start_at AND now()<pm.end_at
 AND promotion_matches_variant(pm.id,v.id) AND (pm.customer_scope='all'
 OR (pm.customer_scope='selected' AND EXISTS(SELECT 1 FROM promotion_customers WHERE promotion_id=pm.id AND customer_id=p_customer))
 OR (pm.customer_scope='first_purchase' AND p_customer IS NOT NULL AND NOT EXISTS(SELECT 1 FROM orders WHERE customer_id=p_customer AND status NOT IN ('draft','cancelled'))))))
 AND (p_customer IS NULL OR p.is_repeat_purchase OR NOT EXISTS(
 SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN product_variants ov ON ov.id=oi.variant_id
 WHERE o.customer_id=p_customer AND o.status='delivered' AND ov.product_id=p.id
 AND o.submitted_at>=now()-make_interval(days=>greatest(p_recent_days,0))
 AND oi.quantity>coalesce((SELECT sum(ri.quantity) FROM return_items ri JOIN return_requests rr ON rr.id=ri.return_request_id
 WHERE ri.order_item_id=oi.id AND rr.status IN ('item_received','exchange_sent','completed','refunded')),0)))
$$;

DO $$ DECLARE t RECORD; BEGIN
 FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='ettee' AND column_name='updated_at' AND table_name<>'orders' LOOP
 EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON ettee.%I FOR EACH ROW EXECUTE FUNCTION ettee.touch_updated_at()',t.table_name);
 END LOOP;
END $$;

-- Khóa các chứng từ đã ghi sổ và danh tính SKU để lịch sử không bị sửa lệch.
CREATE FUNCTION guard_receipt_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid UUID; st TEXT;
BEGIN
 rid=CASE WHEN TG_OP='DELETE' THEN OLD.receipt_id ELSE NEW.receipt_id END;
 SELECT status INTO st FROM stock_receipts WHERE id=rid FOR UPDATE;
 IF st<>'draft' THEN RAISE EXCEPTION 'posted_receipt_items_immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.receipt_id,NEW.variant_id,NEW.location_id) IS DISTINCT FROM ROW(OLD.receipt_id,OLD.variant_id,OLD.location_id) THEN RAISE EXCEPTION 'receipt_item_identity_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_receipt_item BEFORE INSERT OR UPDATE OR DELETE ON stock_receipt_items FOR EACH ROW EXECUTE FUNCTION guard_receipt_item();
CREATE FUNCTION guard_shipment_item_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM orders WHERE id=OLD.order_id AND status IN ('confirmed','picking','packed') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'shipped_items_immutable' USING ERRCODE='23514'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER guard_shipment_item_delete BEFORE DELETE ON shipment_items FOR EACH ROW EXECUTE FUNCTION guard_shipment_item_delete();
CREATE FUNCTION guard_return_item_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM return_requests WHERE id=OLD.return_request_id AND status='requested' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'approved_return_items_immutable' USING ERRCODE='23514'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER guard_return_item_delete BEFORE DELETE ON return_items FOR EACH ROW EXECUTE FUNCTION guard_return_item_delete();
CREATE TRIGGER protect_order_delete BEFORE DELETE ON orders FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TRIGGER protect_experiment_assignment BEFORE UPDATE OR DELETE ON experiment_assignments FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE FUNCTION lock_experiment_variant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tid UUID; st TEXT;
BEGIN
 tid=CASE WHEN TG_OP='DELETE' THEN OLD.ab_test_id ELSE NEW.ab_test_id END;
 SELECT status INTO st FROM ab_tests WHERE id=tid FOR UPDATE;
 IF st IN ('running','completed') THEN RAISE EXCEPTION 'running_experiment_variants_immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND NEW.ab_test_id<>OLD.ab_test_id THEN RAISE EXCEPTION 'experiment_variant_owner_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER lock_experiment_variant BEFORE INSERT OR UPDATE OR DELETE ON ab_test_variants FOR EACH ROW EXECUTE FUNCTION lock_experiment_variant();

CREATE FUNCTION restock_return_item(p_item UUID,p_location UUID,p_actor UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE ri return_items%ROWTYPE; req return_requests%ROWTYPE; vid UUID;
BEGIN
 PERFORM require_permission(p_actor,'inventory.receive');
 PERFORM 1 FROM orders o JOIN return_items x ON x.order_id=o.id WHERE x.id=p_item FOR UPDATE OF o;
 SELECT * INTO STRICT ri FROM return_items WHERE id=p_item FOR UPDATE;
 SELECT * INTO STRICT req FROM return_requests WHERE id=ri.return_request_id;
 IF ri.restocked_at IS NOT NULL THEN RETURN; END IF;
 IF req.status NOT IN ('item_received','exchange_sent','completed','refunded') OR ri.disposition IS DISTINCT FROM 'restock'
 THEN RAISE EXCEPTION 'return_not_approved_for_restock' USING ERRCODE='23514'; END IF;
 SELECT variant_id INTO vid FROM order_items WHERE id=ri.order_item_id;
 INSERT INTO inventory(variant_id,location_id,quantity_on_hand) VALUES(vid,p_location,ri.quantity)
 ON CONFLICT(variant_id,location_id) DO UPDATE SET quantity_on_hand=inventory.quantity_on_hand+EXCLUDED.quantity_on_hand;
 INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reference_type,reference_id,idempotency_key,created_by)
 VALUES(vid,p_location,'return_in',ri.quantity,'return_item',ri.id,'return:'||ri.id,p_actor);
 UPDATE return_items SET restocked_at=clock_timestamp() WHERE id=ri.id;
END $$;
CREATE FUNCTION merge_guest_cart(p_session UUID,p_user UUID) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE guest carts%ROWTYPE; target UUID;
BEGIN
 -- p_user chỉ lấy từ principal đã xác thực; p_session phải thuộc cookie/device hiện tại tại API.
 PERFORM 1 FROM users WHERE id=p_user AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'active_user_required'; END IF;
 SELECT * INTO guest FROM carts WHERE session_id=p_session AND status='active' FOR UPDATE;
 INSERT INTO carts(user_id) VALUES(p_user) ON CONFLICT(user_id) WHERE status='active' AND user_id IS NOT NULL DO NOTHING;
 SELECT id INTO STRICT target FROM carts WHERE user_id=p_user AND status='active' FOR UPDATE;
 IF guest.id IS NOT NULL THEN
 INSERT INTO cart_items(cart_id,variant_id,quantity,price_at_add)
 SELECT target,variant_id,quantity,price_at_add FROM cart_items WHERE cart_id=guest.id
 ON CONFLICT(cart_id,variant_id) DO UPDATE SET quantity=cart_items.quantity+EXCLUDED.quantity;
 UPDATE carts SET status='merged',merged_into=target WHERE id=guest.id;
 END IF; RETURN target;
END $$;
CREATE FUNCTION add_order_item(p_order UUID,p_variant UUID,p_quantity INT) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v RECORD; line_id UUID; attrs JSONB;
BEGIN
 PERFORM 1 FROM orders WHERE id=p_order AND status='draft' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'draft_order_required'; END IF;
 SELECT pv.*,p.name INTO v FROM product_variants pv JOIN products p ON p.id=pv.product_id
 WHERE pv.id=p_variant AND pv.is_active AND p.status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'variant_not_sellable'; END IF;
 SELECT coalesce(jsonb_object_agg(a.code,av.value),'{}') INTO attrs FROM variant_attribute_values vv
 JOIN attributes a ON a.id=vv.attribute_id JOIN attribute_values av ON av.id=vv.attribute_value_id WHERE vv.variant_id=p_variant;
 INSERT INTO order_items(order_id,variant_id,product_name_snapshot,sku_snapshot,variant_snapshot,unit_price,quantity)
 VALUES(p_order,p_variant,v.name,v.sku,attrs,v.price,p_quantity)
 ON CONFLICT(order_id,variant_id) DO UPDATE SET quantity=EXCLUDED.quantity,unit_price=EXCLUDED.unit_price
 RETURNING id INTO line_id; RETURN line_id;
END $$;
CREATE FUNCTION on_account_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.is_staff=EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=NEW.id AND r.is_staff_role);
 IF NEW.status='locked' AND OLD.status IS DISTINCT FROM NEW.status THEN
 UPDATE auth_sessions SET revoked_at=clock_timestamp() WHERE user_id=NEW.id AND revoked_at IS NULL;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER on_account_status BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION on_account_status();
CREATE FUNCTION refresh_staff_flag() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN UPDATE users SET updated_at=clock_timestamp() WHERE id=OLD.user_id; END IF;
 IF TG_OP<>'DELETE' THEN UPDATE users SET updated_at=clock_timestamp() WHERE id=NEW.user_id; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER refresh_staff_flag AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION refresh_staff_flag();

CREATE VIEW order_overview AS
 SELECT o.*,
 CASE WHEN o.payment_status='refunded' THEN 'refunded'
 WHEN EXISTS(SELECT 1 FROM return_requests r WHERE r.order_id=o.id AND r.status='exchange_sent') THEN 'exchange_in_progress'
 WHEN EXISTS(SELECT 1 FROM return_requests r WHERE r.order_id=o.id AND r.status IN ('requested','approved')) THEN 'return_requested'
 WHEN EXISTS(SELECT 1 FROM return_requests r WHERE r.order_id=o.id AND r.status IN ('item_received','completed','refunded')) THEN 'has_returned_items'
 ELSE 'none' END AS after_sales_status
 FROM orders o;

-- Chứng từ đã ghi sổ không được mở lại hoặc xóa để tránh nhập kho hai lần.
CREATE FUNCTION guard_receipt_header() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.status='posted' THEN RAISE EXCEPTION 'posted_receipt_immutable' USING ERRCODE='23514'; END IF;
  RETURN OLD;
 END IF;
 IF OLD.status='posted' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'posted_receipt_immutable' USING ERRCODE='23514'; END IF;
 IF NEW.status='posted' AND (NOT EXISTS(SELECT 1 FROM stock_receipt_items WHERE receipt_id=NEW.id)
 OR EXISTS(SELECT 1 FROM stock_receipt_items WHERE receipt_id=NEW.id AND movement_id IS NULL))
 THEN RAISE EXCEPTION 'receipt_must_be_posted_through_function' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_receipt_header BEFORE UPDATE OR DELETE ON stock_receipts FOR EACH ROW EXECUTE FUNCTION guard_receipt_header();

-- ===== Email giao dịch theo từng sự kiện đơn hàng =====
CREATE TABLE order_events (
 id BIGSERIAL PRIMARY KEY, order_id UUID NOT NULL REFERENCES orders(id),
 event_type TEXT NOT NULL, status_key TEXT NOT NULL, event_key TEXT UNIQUE NOT NULL,
 source_data JSONB NOT NULL DEFAULT '{}', occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_order_events_order_sequence ON order_events(order_id,id);
CREATE TABLE email_templates (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_key TEXT NOT NULL, version INT NOT NULL CHECK(version>0),
 locale TEXT NOT NULL DEFAULT 'vi', subject_template TEXT NOT NULL, text_template TEXT NOT NULL, html_template TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(template_key,version,locale)
);
CREATE TABLE notification_rules (
 event_type TEXT NOT NULL, status_key TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE,
 template_id UUID NOT NULL REFERENCES email_templates(id), status_label TEXT NOT NULL,
 PRIMARY KEY(event_type,status_key)
);
CREATE TABLE email_suppressions (
 email TEXT PRIMARY KEY, reason TEXT NOT NULL CHECK(reason IN ('hard_bounce','complaint','manual','customer_disabled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by UUID REFERENCES users(id),
 CHECK(email=lower(trim(email)))
);
CREATE TABLE email_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id),
 customer_id UUID NOT NULL REFERENCES customers(id), order_event_id BIGINT NOT NULL REFERENCES order_events(id),
 template_id UUID NOT NULL REFERENCES email_templates(id),
 recipient_email TEXT, recipient_name TEXT NOT NULL,
 payload_snapshot JSONB NOT NULL,
 subject_rendered TEXT, text_rendered TEXT, html_rendered TEXT,
 send_status TEXT NOT NULL DEFAULT 'queued' CHECK(send_status IN ('queued','processing','retry','accepted','uncertain','dead','skipped')),
 delivery_status TEXT NOT NULL DEFAULT 'unknown' CHECK(delivery_status IN ('unknown','delivered','bounced','complained')),
 skip_reason TEXT, attempt_count INT NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
 max_attempts INT NOT NULL DEFAULT 5 CHECK(max_attempts BETWEEN 1 AND 20),
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(), lock_token UUID, locked_until TIMESTAMPTZ,
 provider TEXT NOT NULL DEFAULT 'smtp', provider_message_id TEXT,
 last_error_code TEXT, last_error TEXT,
 tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 tracking_token TEXT UNIQUE NOT NULL DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
 tracking_expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '90 days',
 accepted_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, bounced_at TIMESTAMPTZ, complained_at TIMESTAMPTZ,
 first_open_signal_at TIMESTAMPTZ, last_open_signal_at TIMESTAMPTZ,
 first_click_signal_at TIMESTAMPTZ, last_click_signal_at TIMESTAMPTZ,
 acknowledged_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(order_event_id), UNIQUE(provider,provider_message_id),
 CHECK(send_status='skipped' OR recipient_email IS NOT NULL),
 CHECK(recipient_email IS NULL OR recipient_email=lower(trim(recipient_email))),
 CHECK((send_status='processing')=(lock_token IS NOT NULL AND locked_until IS NOT NULL)),
 CHECK(send_status<>'accepted' OR accepted_at IS NOT NULL)
);
CREATE INDEX idx_email_queue_due ON email_messages(next_attempt_at,order_event_id) WHERE send_status IN ('queued','retry');
CREATE INDEX idx_email_order_sequence ON email_messages(order_id,order_event_id,send_status);
CREATE INDEX idx_email_customer_created ON email_messages(customer_id,created_at DESC);
CREATE TABLE email_send_attempts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email_message_id UUID NOT NULL REFERENCES email_messages(id),
 attempt_no INT NOT NULL CHECK(attempt_no>0), lock_token UUID UNIQUE NOT NULL,
 started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), finished_at TIMESTAMPTZ,
 outcome TEXT CHECK(outcome IN ('accepted','retry','dead','uncertain')),
 error_code TEXT, error_message TEXT, UNIQUE(email_message_id,attempt_no),
 CHECK((outcome IS NULL)=(finished_at IS NULL))
);
CREATE TABLE email_events (
 id BIGSERIAL PRIMARY KEY, email_message_id UUID NOT NULL REFERENCES email_messages(id),
 event_type TEXT NOT NULL CHECK(event_type IN ('accepted','delivered','bounced','complained','open_signal','click_signal','acknowledged')),
 source TEXT NOT NULL CHECK(source IN ('smtp','provider','pixel','link','customer')),
 provider TEXT, provider_event_id TEXT,
 occurred_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 user_agent TEXT, automation_hint BOOLEAN, metadata JSONB NOT NULL DEFAULT '{}',
 UNIQUE(provider,provider_event_id),
 CHECK(source<>'provider' OR (provider IS NOT NULL AND provider_event_id IS NOT NULL)),
 CHECK(event_type<>'acknowledged' OR source='customer'),
 CHECK(event_type NOT IN ('delivered','bounced','complained') OR source='provider')
);
CREATE INDEX idx_email_events_message_time ON email_events(email_message_id,event_type,occurred_at);
CREATE TRIGGER protect_order_events BEFORE UPDATE OR DELETE ON order_events FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TRIGGER protect_email_events BEFORE UPDATE OR DELETE ON email_events FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TRIGGER protect_email_templates BEFORE UPDATE OR DELETE ON email_templates FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TRIGGER touch_email_message BEFORE UPDATE ON email_messages FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO email_templates(template_key,version,subject_template,text_template,html_template) VALUES
 ('order_update',1,'[ET.TEE Shop] Đơn {{order_code}}: {{status_label}}',
 E'Chào {{customer_name}},\nĐơn {{order_code}}: {{status_label}}.\nTổng giá trị đơn: {{total_vnd}} VND.\nThời điểm cập nhật: {{occurred_at}}.\nXem đơn: {{order_url}}\nXác nhận đã xem: {{ack_url}}\nCảm ơn bạn đã mua sắm tại ET.TEE Shop.',
 '<!doctype html><html lang="vi"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:24px"><main style="max-width:600px;margin:auto;background:white;padding:28px;border-radius:12px"><p style="font-size:12px;letter-spacing:2px">ET.TEE SHOP</p><h1 style="font-size:22px">{{status_label}}</h1><p>Chào {{customer_name}},</p><p>Đơn hàng <strong>{{order_code}}</strong> đã có cập nhật mới.</p><p>Tổng giá trị đơn: <strong>{{total_vnd}} VND</strong><br>Thời điểm: {{occurred_at}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#151515;color:white;padding:12px 20px;text-decoration:none;border-radius:6px">Xem đơn hàng</a></p><p><a href="{{ack_url}}">Xác nhận tôi đã xem cập nhật này</a></p><p style="font-size:12px;color:#666">Thông báo giao dịch từ ET.TEE Shop. Nếu bật theo dõi thông báo, email có thể ghi nhận tín hiệu tải ảnh và nhấp liên kết. Bạn có thể đổi tùy chọn trong hồ sơ.</p>{{tracking_pixel}}</main></body></html>');
INSERT INTO notification_rules(event_type,status_key,template_id,status_label)
SELECT e.event_type,e.status_key,t.id,e.label FROM email_templates t CROSS JOIN (VALUES
 ('order.status_changed','pending_payment','Chờ thanh toán'),
 ('order.status_changed','pending_confirmation','Chờ xác nhận'),
 ('order.status_changed','confirmed','Đã xác nhận đơn hàng'),
 ('order.status_changed','picking','Đang lấy hàng'),
 ('order.status_changed','packed','Đã đóng gói'),
 ('order.status_changed','handed_to_carrier','Đã bàn giao vận chuyển'),
 ('order.status_changed','shipping','Đang giao hàng'),
 ('order.status_changed','delivered','Đã giao hàng'),
 ('order.status_changed','cancelled','Đơn hàng đã hủy'),
 ('payment.status_changed','success','Đã ghi nhận thanh toán'),
 ('payment.status_changed','failed','Thanh toán chưa thành công'),
 ('return.status_changed','requested','Đã tiếp nhận yêu cầu đổi trả'),
 ('return.status_changed','approved','Yêu cầu đổi trả đã được duyệt'),
 ('return.status_changed','rejected','Yêu cầu đổi trả chưa được chấp thuận'),
 ('return.status_changed','item_received','Đã nhận hàng gửi trả'),
 ('return.status_changed','exchange_sent','Đã gửi hàng thay thế'),
 ('return.status_changed','completed','Đã hoàn tất đổi trả'),
 ('return.status_changed','refunded','Đã hoàn tất hoàn tiền cho yêu cầu trả hàng'),
 ('return.status_changed','cancelled','Yêu cầu đổi trả đã hủy'),
 ('refund.status_changed','pending','Đang xử lý hoàn tiền'),
 ('refund.status_changed','success','Đã hoàn tiền'),
 ('refund.status_changed','failed','Hoàn tiền cần được xử lý lại'),
 ('shipment.exception','exception','Có phát sinh trong quá trình giao hàng')
) e(event_type,status_key,label) WHERE t.template_key='order_update' AND t.version=1;

CREATE FUNCTION emit_order_event(p_order UUID,p_type TEXT,p_status TEXT,p_key TEXT,p_data JSONB DEFAULT '{}') RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE eid BIGINT;
BEGIN
 INSERT INTO order_events(order_id,event_type,status_key,event_key,source_data)
 VALUES(p_order,p_type,p_status,p_key,p_data) ON CONFLICT(event_key) DO NOTHING RETURNING id INTO eid;
 IF eid IS NULL THEN SELECT id INTO eid FROM order_events WHERE event_key=p_key; END IF;
 RETURN eid;
END $$;
CREATE FUNCTION enqueue_order_email() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rule notification_rules%ROWTYPE; o orders%ROWTYPE; c customers%ROWTYPE; reason TEXT;
BEGIN
 SELECT * INTO rule FROM notification_rules WHERE event_type=NEW.event_type AND status_key=NEW.status_key AND enabled;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO STRICT o FROM orders WHERE id=NEW.order_id;
 SELECT * INTO STRICT c FROM customers WHERE id=o.customer_id;
 reason=CASE WHEN o.customer_email IS NULL THEN 'no_recipient_email'
 WHEN NOT o.email_notifications_enabled OR NOT c.order_email_enabled THEN 'customer_disabled'
 WHEN EXISTS(SELECT 1 FROM email_suppressions WHERE email=lower(trim(o.customer_email))) THEN 'suppressed_recipient' ELSE NULL END;
 INSERT INTO email_messages(order_id,customer_id,order_event_id,template_id,recipient_email,recipient_name,payload_snapshot,send_status,skip_reason,tracking_enabled)
 VALUES(o.id,c.id,NEW.id,rule.template_id,lower(trim(o.customer_email)),o.customer_name,
 jsonb_build_object('order_code',o.order_code,'order_id',o.id,'customer_name',o.customer_name,'total',o.total,
 'status_label',rule.status_label,'occurred_at',NEW.occurred_at,'event_type',NEW.event_type,'status_key',NEW.status_key),
 CASE WHEN reason IS NULL THEN 'queued' ELSE 'skipped' END,reason,c.email_tracking_enabled)
 ON CONFLICT(order_event_id) DO NOTHING;
 RETURN NULL;
END $$;
CREATE TRIGGER enqueue_order_email AFTER INSERT ON order_events FOR EACH ROW EXECUTE FUNCTION enqueue_order_email();

CREATE FUNCTION claim_email_messages(p_limit INT DEFAULT 10,p_lease_seconds INT DEFAULT 120)
 RETURNS SETOF email_messages LANGUAGE plpgsql AS $$
DECLARE m email_messages%ROWTYPE;
BEGIN
 IF p_limit<1 OR p_limit>100 OR p_lease_seconds<30 OR p_lease_seconds>900 THEN RAISE EXCEPTION 'invalid_email_claim_parameters'; END IF;
 FOR m IN SELECT em.* FROM email_messages em WHERE em.send_status IN ('queued','retry')
 AND em.next_attempt_at<=now() AND em.attempt_count<em.max_attempts
 AND NOT EXISTS(SELECT 1 FROM email_messages older WHERE older.order_id=em.order_id AND older.order_event_id<em.order_event_id
 AND older.send_status IN ('queued','retry','processing','uncertain'))
 ORDER BY em.order_event_id FOR UPDATE OF em SKIP LOCKED LIMIT p_limit LOOP
 IF EXISTS(SELECT 1 FROM email_suppressions WHERE email=m.recipient_email)
 OR NOT EXISTS(SELECT 1 FROM customers WHERE id=m.customer_id AND order_email_enabled) THEN
 UPDATE email_messages SET send_status='skipped',skip_reason='suppressed_before_send' WHERE id=m.id;
 CONTINUE;
 END IF;
 UPDATE email_messages SET send_status='processing',attempt_count=attempt_count+1,
 lock_token=gen_random_uuid(),locked_until=clock_timestamp()+make_interval(secs=>p_lease_seconds)
 WHERE id=m.id RETURNING * INTO m;
 INSERT INTO email_send_attempts(email_message_id,attempt_no,lock_token) VALUES(m.id,m.attempt_count,m.lock_token);
 RETURN NEXT m;
 END LOOP;
END $$;
CREATE FUNCTION finish_email_attempt(p_message UUID,p_lock UUID,p_outcome TEXT,p_provider_message_id TEXT DEFAULT NULL,p_error_code TEXT DEFAULT NULL,p_error TEXT DEFAULT NULL)
 RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE m email_messages%ROWTYPE; result TEXT;
BEGIN
 IF p_outcome NOT IN ('accepted','retry','dead','uncertain') THEN RAISE EXCEPTION 'invalid_email_outcome'; END IF;
 SELECT * INTO m FROM email_messages WHERE id=p_message AND send_status='processing' AND lock_token=p_lock FOR UPDATE;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 result=CASE WHEN p_outcome='retry' AND m.attempt_count>=m.max_attempts THEN 'dead' ELSE p_outcome END;
 UPDATE email_messages SET send_status=result,lock_token=NULL,locked_until=NULL,
 provider_message_id=coalesce(p_provider_message_id,provider_message_id),
 accepted_at=CASE WHEN result='accepted' THEN coalesce(accepted_at,clock_timestamp()) ELSE accepted_at END,
 next_attempt_at=CASE WHEN result='retry' THEN clock_timestamp()+make_interval(secs=>least(3600,30*power(2,m.attempt_count-1)::INT)) ELSE next_attempt_at END,
 last_error_code=p_error_code,last_error=left(p_error,2000) WHERE id=m.id;
 UPDATE email_send_attempts SET outcome=result,finished_at=clock_timestamp(),error_code=p_error_code,error_message=left(p_error,2000) WHERE lock_token=p_lock;
 IF result='accepted' THEN INSERT INTO email_events(email_message_id,event_type,source,occurred_at) VALUES(m.id,'accepted','smtp',clock_timestamp()); END IF;
 RETURN TRUE;
END $$;
CREATE FUNCTION reap_expired_email_leases() RETURNS INT LANGUAGE plpgsql AS $$
DECLARE m RECORD; n INT=0;
BEGIN
 FOR m IN SELECT id,lock_token FROM email_messages WHERE send_status='processing' AND locked_until<clock_timestamp() FOR UPDATE SKIP LOCKED LOOP
 PERFORM finish_email_attempt(m.id,m.lock_token,'uncertain',NULL,'WORKER_LEASE_EXPIRED','Chưa biết SMTP đã nhận thư hay chưa; cần đối chiếu trước khi gửi lại.'); n=n+1;
 END LOOP; RETURN n;
END $$;
CREATE FUNCTION retry_email_message(p_message UUID,p_actor UUID,p_reason TEXT,p_accept_duplicate_risk BOOLEAN DEFAULT FALSE) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE m email_messages%ROWTYPE;
BEGIN
 PERFORM require_permission(p_actor,'notification.retry');
 IF length(trim(coalesce(p_reason,'')))=0 THEN RAISE EXCEPTION 'retry_reason_required'; END IF;
 SELECT * INTO STRICT m FROM email_messages WHERE id=p_message FOR UPDATE;
 IF m.send_status NOT IN ('dead','uncertain') OR m.attempt_count>=20 THEN RAISE EXCEPTION 'email_not_retryable'; END IF;
 IF m.send_status='uncertain' AND NOT p_accept_duplicate_risk THEN RAISE EXCEPTION 'smtp_delivery_uncertain_requires_review'; END IF;
 IF EXISTS(SELECT 1 FROM email_suppressions WHERE email=m.recipient_email) THEN RAISE EXCEPTION 'recipient_suppressed'; END IF;
 UPDATE email_messages SET send_status='retry',max_attempts=least(20,attempt_count+3),next_attempt_at=clock_timestamp()
 WHERE id=m.id;
 INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_value)
 VALUES(p_actor,'email.retry','email_message',m.id,jsonb_build_object('reason',p_reason,'previous_status',m.send_status));
END $$;
CREATE FUNCTION summarize_email_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE em email_messages%ROWTYPE;
BEGIN
 SELECT * INTO STRICT em FROM email_messages WHERE id=NEW.email_message_id FOR UPDATE;
 IF NEW.event_type='delivered' THEN
 UPDATE email_messages SET delivered_at=least(coalesce(delivered_at,NEW.occurred_at),NEW.occurred_at),
 delivery_status=CASE WHEN delivery_status IN ('bounced','complained') THEN delivery_status ELSE 'delivered' END WHERE id=em.id;
 ELSIF NEW.event_type IN ('bounced','complained') THEN
 UPDATE email_messages SET delivery_status=CASE WHEN delivery_status='complained' THEN 'complained' ELSE NEW.event_type END,
 bounced_at=CASE WHEN NEW.event_type='bounced' THEN coalesce(bounced_at,NEW.occurred_at) ELSE bounced_at END,
 complained_at=CASE WHEN NEW.event_type='complained' THEN coalesce(complained_at,NEW.occurred_at) ELSE complained_at END WHERE id=em.id;
 IF NEW.event_type='complained' OR coalesce((NEW.metadata->>'hard_bounce')::BOOLEAN,FALSE) THEN
 INSERT INTO email_suppressions(email,reason) VALUES(em.recipient_email,CASE WHEN NEW.event_type='complained' THEN 'complaint' ELSE 'hard_bounce' END)
 ON CONFLICT(email) DO UPDATE SET reason=EXCLUDED.reason;
 END IF;
 ELSIF NEW.event_type='open_signal' THEN
 UPDATE email_messages SET first_open_signal_at=least(coalesce(first_open_signal_at,NEW.occurred_at),NEW.occurred_at),
 last_open_signal_at=greatest(coalesce(last_open_signal_at,NEW.occurred_at),NEW.occurred_at) WHERE id=em.id;
 ELSIF NEW.event_type='click_signal' THEN
 UPDATE email_messages SET first_click_signal_at=least(coalesce(first_click_signal_at,NEW.occurred_at),NEW.occurred_at),
 last_click_signal_at=greatest(coalesce(last_click_signal_at,NEW.occurred_at),NEW.occurred_at) WHERE id=em.id;
 ELSIF NEW.event_type='acknowledged' THEN UPDATE email_messages SET acknowledged_at=coalesce(acknowledged_at,NEW.occurred_at) WHERE id=em.id;
 END IF; RETURN NULL;
END $$;
CREATE TRIGGER summarize_email_event AFTER INSERT ON email_events FOR EACH ROW EXECUTE FUNCTION summarize_email_event();
CREATE FUNCTION record_email_signal(p_token TEXT,p_type TEXT,p_user_agent TEXT DEFAULT NULL,p_automation_hint BOOLEAN DEFAULT NULL)
 RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE m email_messages%ROWTYPE;
BEGIN
 IF p_type NOT IN ('open_signal','click_signal','acknowledged') THEN RAISE EXCEPTION 'invalid_public_email_signal'; END IF;
 SELECT * INTO m FROM email_messages WHERE tracking_token=p_token AND tracking_expires_at>now()
 AND send_status IN ('processing','accepted','uncertain') FOR UPDATE;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 -- Tôn trọng tùy chọn hiện tại, không chỉ snapshot lúc xếp hàng.
 IF p_type<>'acknowledged' AND (NOT m.tracking_enabled OR NOT EXISTS(SELECT 1 FROM customers WHERE id=m.customer_id AND email_tracking_enabled)) THEN RETURN FALSE; END IF;
 IF p_type='acknowledged' AND m.acknowledged_at IS NOT NULL THEN RETURN TRUE; END IF;
 INSERT INTO email_events(email_message_id,event_type,source,occurred_at,user_agent,automation_hint)
 VALUES(m.id,p_type,CASE p_type WHEN 'open_signal' THEN 'pixel' WHEN 'click_signal' THEN 'link' ELSE 'customer' END,
 clock_timestamp(),left(p_user_agent,500),p_automation_hint);
 RETURN TRUE;
END $$;
CREATE FUNCTION record_provider_email_event(p_provider TEXT,p_event_id TEXT,p_message UUID,p_type TEXT,p_occurred TIMESTAMPTZ,p_metadata JSONB DEFAULT '{}') RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE eid BIGINT;
BEGIN
 IF p_type NOT IN ('delivered','bounced','complained') OR length(trim(p_event_id))=0 THEN RAISE EXCEPTION 'invalid_provider_email_event'; END IF;
 INSERT INTO email_events(email_message_id,event_type,source,provider,provider_event_id,occurred_at,metadata)
 VALUES(p_message,p_type,'provider',p_provider,p_event_id,p_occurred,p_metadata)
 ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id INTO eid;
 RETURN eid IS NOT NULL;
END $$;
CREATE VIEW order_email_status AS
 SELECT em.id AS email_message_id,em.order_id,o.order_code,e.event_type,e.status_key,
 em.recipient_email,em.send_status,em.delivery_status,em.skip_reason,em.attempt_count,
 em.accepted_at,em.delivered_at,em.bounced_at,em.complained_at,
 em.first_open_signal_at,em.last_open_signal_at,em.first_click_signal_at,em.last_click_signal_at,em.acknowledged_at,
 (SELECT count(*) FROM email_events ev WHERE ev.email_message_id=em.id AND ev.event_type='open_signal') AS open_signal_count,
 (SELECT count(*) FROM email_events ev WHERE ev.email_message_id=em.id AND ev.event_type='click_signal') AS click_signal_count,
 CASE WHEN em.acknowledged_at IS NOT NULL THEN 'Khách xác nhận đã xem'
 WHEN em.first_click_signal_at IS NOT NULL THEN 'Có tín hiệu nhấp liên kết'
 WHEN em.first_open_signal_at IS NOT NULL THEN 'Có tín hiệu mở, chưa xác nhận đã đọc'
 ELSE 'Chưa có tín hiệu đọc' END AS engagement_label,
 em.last_error_code,em.created_at
 FROM email_messages em JOIN orders o ON o.id=em.order_id JOIN order_events e ON e.id=em.order_event_id;

CREATE FUNCTION shipment_exception_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='exception' AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
 PERFORM emit_order_event(NEW.order_id,'shipment.exception','exception','shipment:'||NEW.id||':'||NEW.version,jsonb_build_object('shipment_id',NEW.id)); END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION shipment_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.version=OLD.version+1; RETURN NEW; END $$;
CREATE TRIGGER shipment_version BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION shipment_version();
CREATE TRIGGER shipment_exception_email AFTER INSERT OR UPDATE OF status ON shipments FOR EACH ROW EXECUTE FUNCTION shipment_exception_email();

COMMENT ON TABLE email_messages IS 'Transactional outbox. SMTP accepted khác delivered; open/click là tín hiệu, không chứng minh đọc. Lease hết hạn chuyển uncertain để tránh tự gửi trùng.';
COMMENT ON COLUMN email_messages.acknowledged_at IS 'Khách chủ động POST xác nhận đã xem; GET, pixel, click không tự xác nhận.';
COMMENT ON TABLE order_access_grants IS 'Quyền xem/review/return của khách đã xác minh. Tracking token email không cấp quyền đọc dữ liệu đơn.';
COMMENT ON TABLE product_embeddings IS 'Version + modality; vector_dims được kiểm tra theo registry. Dùng item behavior embedding cùng space với query SASRec.';
COMMENT ON TABLE order_events IS 'Sự kiện bất biến cùng transaction với cập nhật đơn; source_data không tự chèn vào nội dung email.';


-- Đường dẫn phân giải cố định cho functions. Runtime không được sở hữu schema hay sửa DDL.
DO $$ DECLARE f RECORD; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ettee' LOOP
 EXECUTE format('ALTER FUNCTION %s SET search_path TO ettee,public',f.signature);
 END LOOP;
END $$;
REVOKE ALL ON SCHEMA ettee FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA ettee FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA ettee FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ettee FROM PUBLIC;
COMMIT;
