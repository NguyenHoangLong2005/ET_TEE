-- ET.TEE / ONE-SHOT DB FIX + SAMPLE DATA SEED
-- Paste this entire file into pgAdmin Query Tool or psql as a superuser (postgres / owner role).
-- This script grants the required PostgreSQL privileges to ettee_app and then loads the sample data.

BEGIN;

-- 1) Grant basic schema access
GRANT USAGE ON SCHEMA public TO ettee_app;
GRANT USAGE ON SCHEMA ettee TO ettee_app;

-- 2) Grant table and sequence privileges on existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ettee TO ettee_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ettee TO ettee_app;

-- 3) Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA ettee
  GRANT ALL ON TABLES TO ettee_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA ettee
  GRANT ALL ON SEQUENCES TO ettee_app;

-- 4) Grant execute on schema functions needed by triggers / validation logic
GRANT EXECUTE ON FUNCTION ettee.variant_signature(uuid) TO ettee_app;
GRANT EXECUTE ON FUNCTION ettee.validate_variant() TO ettee_app;
GRANT EXECUTE ON FUNCTION ettee.refresh_variant_signature() TO ettee_app;

-- 5) Optionally grant execute for all functions in schema ettee
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ettee TO ettee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA ettee
  GRANT EXECUTE ON FUNCTIONS TO ettee_app;

COMMIT;

-- ==========================================================
-- SAMPLE DATA SEED (copied from sample_data_seed.sql)
-- ==========================================================

SET search_path TO public, ettee;

BEGIN;

-- Staff users for account management demo
INSERT INTO users (id, email, phone, password_hash, full_name, status, is_staff, created_at, updated_at, last_login_at)
VALUES
  ('7d8fd727-9dc5-4d2a-8c1b-7430c8915e86', 'shopowner@ettee.vn', '0901000001', '$2a$10$4ycgQ8dC8b1YI3LWpK3p8uN4mZU0lI8fL5tG6Xn7sZ3wekL0h8f6m', 'Nguyễn Thị Bích', 'active', true, now(), now(), now()),
  ('23b1c088-3b2e-409d-b2c8-700945195af5', 'cskh@ettee.vn', '0901000002', '$2a$10$4ycgQ8dC8b1YI3LWpK3p8uN4mZU0lI8fL5tG6Xn7sZ3wekL0h8f6m', 'Trần Văn Cường', 'active', true, now(), now(), now())
ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profile (user_id, employee_code, department, hired_at, is_active)
VALUES
  ('7d8fd727-9dc5-4d2a-8c1b-7430c8915e86', 'ET-SH-001', 'Store Owner', current_date - interval '120 days', true),
  ('23b1c088-3b2e-409d-b2c8-700945195af5', 'ET-CSKH-001', 'CSKH', current_date - interval '90 days', true)
ON CONFLICT (user_id) DO NOTHING;

-- Categories
INSERT INTO categories (id, parent_id, name, slug, description, is_active, sort_order)
VALUES
  ('11111111-1111-4111-8111-111111111111', NULL, 'Áo thun nam', 'ao-thun-nam', 'Dòng áo thun nam thời thượng', true, 1),
  ('22222222-2222-4222-8222-222222222222', NULL, 'Giày sneaker', 'giay-sneaker', 'Giày sneaker cho daily wear', true, 2),
  ('33333333-3333-4333-8333-333333333333', NULL, 'Phụ kiện', 'phu-kien', 'Phụ kiện thời trang', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Products and variants
INSERT INTO products (id, category_id, name, slug, description, brand, gender_target, base_price, status, is_repeat_purchase, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Áo thun Basic Oversize', 'ao-thun-basic-oversize', 'Áo thun nam cotton oversize, form rộng và thoải mái.', 'ET.TEE', 'male', 299000, 'active', true, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Sneaker Street Runner', 'sneaker-street-runner', 'Giày sneaker chạy bộ nhẹ, nâng đỡ tốt cho vận động.', 'ET.TEE', 'unisex', 890000, 'active', true, now(), now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 'Túi đeo chéo Mini', 'tui-deo-cheo-mini', 'Túi đeo chéo mini tiện dụng cho đi học và đi làm.', 'ET.TEE', 'unisex', 249000, 'active', false, now(), now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (id, product_id, sku, price, compare_at_price, weight_grams, barcode, is_active, attribute_signature, created_at, updated_at)
VALUES
  ('d1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ET-AT-001-M', 299000, 349000, 240, '890123456001', false, NULL, now(), now()),
  ('d2222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ET-AT-001-L', 299000, 349000, 260, '890123456002', false, NULL, now(), now()),
  ('d3333333-3333-4333-8333-333333333333', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ET-SR-001-41', 890000, 980000, 650, '890123456003', false, NULL, now(), now()),
  ('d4444444-4444-4444-8444-444444444444', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ET-SR-001-42', 890000, 980000, 670, '890123456004', false, NULL, now(), now()),
  ('d5555555-5555-4555-8555-555555555555', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'ET-TDC-001', 249000, 279000, 180, '890123456005', false, NULL, now(), now())
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory (variant_id, location_id, quantity_on_hand, quantity_reserved, reorder_level, updated_at)
VALUES
  ('d1111111-1111-4111-8111-111111111111', (SELECT id FROM stock_locations WHERE code = 'MAIN'), 28, 2, 10, now()),
  ('d2222222-2222-4222-8222-222222222222', (SELECT id FROM stock_locations WHERE code = 'MAIN'), 15, 1, 8, now()),
  ('d3333333-3333-4333-8333-333333333333', (SELECT id FROM stock_locations WHERE code = 'MAIN'), 12, 0, 6, now()),
  ('d4444444-4444-4444-8444-444444444444', (SELECT id FROM stock_locations WHERE code = 'MAIN'), 7, 1, 5, now()),
  ('d5555555-5555-4555-8555-555555555555', (SELECT id FROM stock_locations WHERE code = 'MAIN'), 30, 0, 12, now())
ON CONFLICT (variant_id, location_id) DO NOTHING;

-- Customers for orders and tickets
INSERT INTO customers (id, user_id, full_name, email, phone, order_email_enabled, email_tracking_enabled, created_at, updated_at)
VALUES
  ('0dd3b7d3-8bee-4c39-8f7f-88e1a3f4d3eb', NULL, 'Nguyễn Văn An', 'an.nguyen@example.com', '0911000001', true, true, now(), now()),
  ('57f50963-387a-4d96-87cb-cc0d6c0e33ab', NULL, 'Phạm Thị Mai', 'mai.pham@example.com', '0911000002', true, true, now(), now()),
  ('c624dd00-85da-4e86-bd1b-824c5e6f83c4', NULL, 'Lê Hoàng Nam', 'nam.le@example.com', '0911000003', true, true, now(), now())
ON CONFLICT (phone) DO NOTHING;

-- Orders to populate order lookup pages
INSERT INTO orders (
  id, order_code, customer_id, source_platform, checkout_key, customer_name, customer_phone, customer_email,
  shipping_address, status, payment_method, payment_status, currency, subtotal, discount_total,
  shipping_fee, shipping_discount, version, placed_at, submitted_at, confirmed_by, confirmed_at,
  updated_at
)
VALUES
  (
    'e0d0b9d7-bc17-4e2a-b8fe-7d7a4a4ff1c1', 'ET-20260913-1001', '0dd3b7d3-8bee-4c39-8f7f-88e1a3f4d3eb', 'web',
    'f5f7fc50-fee2-4e0c-9db6-cffbaca4dd71', 'Nguyễn Văn An', '0911000001', 'an.nguyen@example.com',
    '{"province":"TP.HCM","district":"Quận 1","ward":"Bến Nghé","street_address":"123 Lê Lợi"}'::jsonb,
    'confirmed', 'cod', 'paid', 'VND', 598000, 0, 30000, 0, 0, now(), now(),
    '7d8fd727-9dc5-4d2a-8c1b-7430c8915e86', now(), now()
  ),
  (
    '91c2d94a-8d80-4a4c-95a4-ae3bde6f2f72', 'ET-20260913-1002', '57f50963-387a-4d96-87cb-cc0d6c0e33ab', 'app',
    'f0a554da-7f4d-42f3-b542-18746ed42246', 'Phạm Thị Mai', '0911000002', 'mai.pham@example.com',
    '{"province":"Hà Nội","district":"Quận Hoàn Kiếm","ward":"Hàng Trống","street_address":"456 Trần Hưng Đạo"}'::jsonb,
    'shipping', 'vnpay', 'paid', 'VND', 890000, 100000, 30000, 0, 0, now(), now(),
    '7d8fd727-9dc5-4d2a-8c1b-7430c8915e86', now(), now()
  ),
  (
    '8b0317ee-6755-4c5b-9652-4d6d8474d7e8', 'ET-20260913-1003', 'c624dd00-85da-4e86-bd1b-824c5e6f83c4', 'staff',
    'bd91e324-b1a7-48e1-a56d-bd8dcdc5d465', 'Lê Hoàng Nam', '0911000003', 'nam.le@example.com',
    '{"province":"Đà Nẵng","district":"Quận Hải Châu","ward":"Hải Châu I","street_address":"789 Trần Phú"}'::jsonb,
    'delivered', 'bank_transfer', 'paid', 'VND', 249000, 0, 20000, 0, 0, now(), now(),
    '7d8fd727-9dc5-4d2a-8c1b-7430c8915e86', now(), now()
  )
ON CONFLICT (order_code) DO NOTHING;

INSERT INTO order_items (id, order_id, variant_id, product_name_snapshot, sku_snapshot, variant_snapshot, unit_price, quantity, discount_amount)
VALUES
  ('b1a9d2e2-89ae-4bc4-8d1e-1b9d8bb2d7f0', 'e0d0b9d7-bc17-4e2a-b8fe-7d7a4a4ff1c1', 'd1111111-1111-4111-8111-111111111111', 'Áo thun Basic Oversize', 'ET-AT-001-M', '{"size":"M"}'::jsonb, 299000, 1, 0),
  ('c2a3a856-1d19-43ca-b734-bc4d76ae8d7b', 'e0d0b9d7-bc17-4e2a-b8fe-7d7a4a4ff1c1', 'd5555555-5555-4555-8555-555555555555', 'Túi đeo chéo Mini', 'ET-TDC-001', '{"default":"default"}'::jsonb, 249000, 1, 0),
  ('d0d6c7ec-bc3c-41a2-ad5b-cb37dc148540', '91c2d94a-8d80-4a4c-95a4-ae3bde6f2f72', 'd3333333-3333-4333-8333-333333333333', 'Sneaker Street Runner', 'ET-SR-001-41', '{"size":"41"}'::jsonb, 890000, 1, 100000),
  ('ea44dfc3-b639-4eb9-a7d6-3f0e4b747d1b', '8b0317ee-6755-4c5b-9652-4d6d8474d7e8', 'd5555555-5555-4555-8555-555555555555', 'Túi đeo chéo Mini', 'ET-TDC-001', '{"default":"default"}'::jsonb, 249000, 1, 0)
ON CONFLICT (order_id, variant_id) DO NOTHING;

-- Tickets for CSKH pages
INSERT INTO support_tickets (id, customer_id, order_id, channel, subject, status, priority, assigned_to, escalated_to, created_at, resolved_at)
VALUES
  ('f31b6656-2511-4f16-bf6a-c0d3b83f49b7', '0dd3b7d3-8bee-4c39-8f7f-88e1a3f4d3eb', 'e0d0b9d7-bc17-4e2a-b8fe-7d7a4a4ff1c1', 'chat', 'Cần hỗ trợ đổi trả áo thun Basic Oversize', 'in_progress', 2, '23b1c088-3b2e-409d-b2c8-700945195af5', NULL, now() - interval '4 hours', NULL),
  ('ea0b5cb4-c7a6-4f68-a5d2-5359e9e8abaf', '57f50963-387a-4d96-87cb-cc0d6c0e33ab', '91c2d94a-8d80-4a4c-95a4-ae3bde6f2f72', 'phone', 'Khách hỏi thời gian giao hàng sneaker Street Runner', 'open', 3, '23b1c088-3b2e-409d-b2c8-700945195af5', NULL, now() - interval '6 hours', NULL),
  ('2d8d1c6b-fd16-41d2-85d2-2d4f06f3a1e4', 'c624dd00-85da-4e86-bd1b-824c5e6f83c4', '8b0317ee-6755-4c5b-9652-4d6d8474d7e8', 'email', 'Yêu cầu đổi size túi đeo chéo Mini', 'resolved', 1, '23b1c088-3b2e-409d-b2c8-700945195af5', NULL, now() - interval '2 days', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, message, created_at)
VALUES
  ('2b4d603a-89d1-4df8-9f3c-a79f9980c594', 'f31b6656-2511-4f16-bf6a-c0d3b83f49b7', 'customer', NULL, 'Xin hỗ trợ đổi size vì áo vừa quá rộng.', now() - interval '4 hours'),
  ('7288f46d-f1d2-4f64-968f-c69534c16dce', 'f31b6656-2511-4f16-bf6a-c0d3b83f49b7', 'staff', '23b1c088-3b2e-409d-b2c8-700945195af5', 'Mình đang kiểm tra đơn hàng và sẽ liên hệ lại trong 30 phút.', now() - interval '3 hours'),
  ('34dc197f-4f25-4e2f-9ae3-b3d8dd5d25a5', 'ea0b5cb4-c7a6-4f68-a5d2-5359e9e8abaf', 'customer', NULL, 'Mình muốn biết đơn hàng đã gửi đi chưa?', now() - interval '6 hours'),
  ('a3e34ffc-afda-4c5b-8f04-0b89abcff040', '2d8d1c6b-fd16-41d2-85d2-2d4f06f3a1e4', 'staff', '23b1c088-3b2e-409d-b2c8-700945195af5', 'Đã cập nhật size phù hợp và đã chốt giải quyết.', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

COMMIT;
