-- ============================================================
-- V20260905000000__demo_seed_data.sql
--
-- Du lieu mau cho moi truong DEV/STAGING. Mien tinh khi: KHONG duoc
-- chay tren database thật (Supabase production).
--
-- Ly do ton tai: V1__baseline.sql chi tao schema rong, khong co du
-- lieu mau nao cho catalog don hang hay van chuyen. Khong co file
-- nao trong repo ghi du lieu khop voi schema hien tai, nen khong the
-- xem giao dien hay chay luong ban hang / kho / van chuyen voi du
-- lieu rong.
--
-- File nay chay DUNG MOT LAN: Flyway ghi version da ap dung vao
-- flyway_schema_history. Moi INSERT deu co ON CONFLICT DO NOTHING
-- de chay lai khong sinh loi.
--
-- Thu tu phu thuoc: shop -> category -> product -> variant ->
-- inventory -> user -> order -> item -> reservation -> shipment.
-- Co khoa ngoai giua cac bang nay.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Khach hang (can cho orders.user_id)
-- ------------------------------------------------------------
-- password_hash la BCrypt cua "Khach@123". Chi dung de test, khong
-- phai mat khau cua tai khoan that.
INSERT INTO users (id, email, email_verified, full_name, password_hash, phone, status, role, created_at, updated_at)
VALUES
  ('11111111-aaaa-4aaa-8aaa-111111111111', 'khach01@et.tee', TRUE, 'Nguyen Van An',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0901110001', 'ACTIVE', 'USER', now(), now()),
  ('22222222-bbbb-4bbb-8bbb-222222222222', 'khach02@et.tee', TRUE, 'Tran Thi Binh',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0901110002', 'ACTIVE', 'USER', now(), now()),
  ('33333333-cccc-4ccc-8ccc-333333333333', 'khach03@et.tee', TRUE, 'Le Van Cuong',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0901110003', 'ACTIVE', 'USER', now(), now())
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 2. Danh muc
-- ------------------------------------------------------------
INSERT INTO categories (id, parent_id, name, slug, description, image_url, active, display_order)
VALUES
  (1, NULL, 'Ao thun nam', 'ao-thun-nam', 'Ao thun nam cotton oversize', NULL, TRUE, 1),
  (2, NULL, 'Ao nu',       'ao-nu',       'Ao nua cac loai',          NULL, TRUE, 2),
  (3, NULL, 'Quan',        'quan',        'Jean, quan tay, short',   NULL, TRUE, 3),
  (4, NULL, 'Phu kien',    'phu-kien',    'Mu, tui, phu kien',       NULL, TRUE, 4)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 3. San pham
--    slug NOT NULL, created_at NOT NULL, price NOT NULL
-- ------------------------------------------------------------
INSERT INTO products
  (id, name, slug, description, brand, price, sale_price, category_id, gender, material, style,
   status, created_at, updated_at, is_new, is_best_seller, is_sale, sold_count, average_rating)
VALUES
  (1, 'Ao thun cotton oversize', 'ao-thun-cotton-oversize',
   'Ao thun 100% cotton form rong, thoai mai', 'ET.TEE', 299000, 249000, 1, 'UNISEX', 'Cotton', 'Casual',
   'active', now(), now(), TRUE, FALSE, TRUE, 12, 4.5),
  (2, 'Quan jean slim fit', 'quan-jean-slim-fit',
   'Quan denim co gian cao cap', 'Denim Co', 599000, 499000, 3, 'MEN', 'Denim', 'Streetwear',
   'active', now(), now(), TRUE, TRUE, TRUE, 8, 4.2),
  (3, 'Ao so mi linen', 'ao-so-mi-linen',
   'Ao so mi vai lien thoang khi', 'ET.TEE', 399000, NULL, 2, 'WOMEN', 'Linen', 'Minimalist',
   'active', now(), now(), TRUE, FALSE, FALSE, 5, 4.7),
  (4, 'Tui xach canvas', 'tui-xach-canvas',
   'Tui xach canvas de vai, dung tich 20L', 'ET.TEE', 199000, NULL, 4, 'UNISEX', 'Canvas', 'Casual',
   'active', now(), now(), FALSE, FALSE, FALSE, 3, 4.1)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 4. Bien the san pham
--    available_quantity NOT NULL, sku NOT NULL, stock NOT NULL
-- ------------------------------------------------------------
INSERT INTO product_variants
  (id, product_id, sku, color, size, price, sale_price, stock, available_quantity, color_hex, color_code)
VALUES
  (1, 1, 'ET-AT-001-M',  'Den',  'M',  299000, 249000, 50, 50, '#111111', 'DEN'),
  (2, 1, 'ET-AT-001-L',  'Den',  'L',  299000, 249000, 35, 35, '#111111', 'DEN'),
  (3, 1, 'ET-AT-001-XL', 'Trang','XL', 299000, 249000, 20, 20, '#FFFFFF', 'TRANG'),
  (4, 2, 'ET-QJ-002-32', 'Xanh', '32', 599000, 499000, 20, 20, '#1E3A8A', 'XANH'),
  (5, 3, 'ET-SM-003-S',  'Be',   'S',  399000, NULL,    25, 25, '#D2B48C', 'BE'),
  (6, 4, 'ET-TX-004-01', 'Den',  'ONE',199000, NULL,    40, 40, '#222222', 'DEN')
ON CONFLICT (sku) DO NOTHING;


-- ------------------------------------------------------------
-- 5. Ton kho
--    inventories: product_id NOT NULL + UNIQUE, product_name NOT NULL.
--    Vì UNIQUE theo product_id, moi san pham chi co MOT dong ton kho.
-- ------------------------------------------------------------
INSERT INTO inventories
  (product_id, product_name, warehouse_location, quantity_on_hand, quantity_reserved, reorder_level, shop_id)
VALUES
  (1, 'Ao thun cotton oversize', 'KHO-A01', 50, 0, 10, 1),
  (2, 'Quan jean slim fit',      'KHO-A02', 20, 0, 10, 1),
  (3, 'Ao so mi linen',          'KHO-B01', 25, 0, 10, 1),
  -- Hang sap het de kiem tra muc "De xuat nhap them".
  (4, 'Tui xach canvas',         'KHO-B02',  3, 0, 10, 1)
ON CONFLICT (product_id) DO NOTHING;


-- ------------------------------------------------------------
-- 6. Don hang - trang thai phu cho 3 role
--    PENDING_CONFIRMATION: ban hang xac nhan
--    CONFIRMED          : kho bat dau picking
--    PICKING            : kho dang lay hang
--    PACKED             : kho in tem + ban giao
--    SHIPPING           : van chuyen dang giao (co shipment IN_TRANSIT)
--    DELIVERED          : da giao xong
--    CANCELLED          : da huy
--    PENDING_PAYMENT    : chua thanh toan, sla_deadline da qua
-- ------------------------------------------------------------
INSERT INTO orders
  (id, order_code, user_id, shop_id, customer_name, customer_phone, customer_email,
   shipping_address, status, order_status, payment_method,
   payment_status, subtotal, shipping_fee, discount_total,
   total_amount, cancel_reason, created_at, updated_at)
VALUES
(101, 'ET-DEMO-0101', '11111111-aaaa-4aaa-8aaa-111111111111', 1,
   'Nguyen Van An', '0901110001', 'khach01@et.tee',
   '12 Le Loi, Q1, TPHCM',
   'PENDING_CONFIRMATION', 'PENDING_CONFIRMATION', 'COD', 'UNPAID',
   547000, 30000, 0, 577000, NULL, now(), now()),

  (102, 'ET-DEMO-0102', '22222222-bbbb-4bbb-8bbb-222222222222', 1,
   'Tran Thi Binh', '0901110002', 'khach02@et.tee',
   '45 Nguyen Hue, Q1, TPHCM',
   'PENDING_CONFIRMATION', 'PENDING_CONFIRMATION', 'BANK_TRANSFER', 'PAID',
   299000, 30000, 0, 329000, 'Khach yeu cau goi truoc', now(), now()),

  (103, 'ET-DEMO-0103', '33333333-cccc-4ccc-8ccc-333333333333', 1,
   'Le Van Cuong', '0901110003', 'khach03@et.tee',
   '78 Dien Bien Phu, Q5, TPHCM',
   'CONFIRMED', 'CONFIRMED', 'COD', 'UNPAID',
   998000, 30000, 0, 1028000, NULL, now(), now()),

  (104, 'ET-DEMO-0104', '11111111-aaaa-4aaa-8aaa-111111111111', 1,
   'Nguyen Van An', '0901110001', 'khach01@et.tee',
   '12 Le Loi, Q1, TPHCM',
   'PICKING', 'PICKING', 'COD', 'UNPAID',
   299000, 30000, 0, 329000, NULL, now(), now()),

  (105, 'ET-DEMO-0105', '22222222-bbbb-4bbb-8bbb-222222222222', 1,
   'Tran Thi Binh', '0901110002', 'khach02@et.tee',
   '45 Nguyen Hue, Q1, TPHCM',
   'PACKED', 'PACKED', 'COD', 'UNPAID',
   399000, 30000, 0, 429000, 'Dong goi ky, giu that', now(), now()),

  (106, 'ET-DEMO-0106', '33333333-cccc-4ccc-8ccc-333333333333', 1,
   'Le Van Cuong', '0901110003', 'khach03@et.tee',
   '78 Dien Bien Phu, Q5, TPHCM',
   'SHIPPING', 'SHIPPING', 'COD', 'UNPAID',
   699000, 30000, 0, 729000, NULL, now(), now()),

  (107, 'ET-DEMO-0107', '11111111-aaaa-4aaa-8aaa-111111111111', 1,
   'Nguyen Van An', '0901110001', 'khach01@et.tee',
   '12 Le Loi, Q1, TPHCM',
   'DELIVERED', 'DELIVERED', 'COD', 'PAID',
   598000, 30000, 0, 628000, 'Da giao thanh cong', now() - interval '3 days', now() - interval '2 days'),

  (108, 'ET-DEMO-0108', '22222222-bbbb-4bbb-8bbb-222222222222', 1,
   'Tran Thi Binh', '0901110002', 'khach02@et.tee',
   '45 Nguyen Hue, Q1, TPHCM',
   'CANCELLED', 'CANCELLED', 'COD', 'UNPAID',
   199000, 30000, 0, 229000, NULL, now(), now()),
  -- SLA da het han: de kiem tra canh bao SLA cua ban hang.
  (109, 'ET-DEMO-0109', '33333333-cccc-4ccc-8ccc-333333333333', 1,
   'Le Van Cuong', '0901110003', 'khach03@et.tee',
   '78 Dien Bien Phu, Q5, TPHCM',
   'PENDING_CONFIRMATION', 'PENDING_CONFIRMATION', 'COD', 'UNPAID',
   299000, 30000, 0, 329000, 'Khach lien he nhieu lan, uu tien', now(), now())
ON CONFLICT (order_code) DO NOTHING;

-- SLA: 101 va 109 sap het/da qua han, 102 con kha nhieu.
UPDATE orders SET sla_deadline = now() - interval '2 hours' WHERE order_code = 'ET-DEMO-0101';
UPDATE orders SET sla_deadline = now() + interval '3 hours'  WHERE order_code = 'ET-DEMO-0102';
UPDATE orders SET sla_deadline = now() - interval '45 minutes' WHERE order_code = 'ET-DEMO-0109';

UPDATE orders SET cancel_reason = 'Khach doi y kich thuoc' WHERE order_code = 'ET-DEMO-0108';


-- ------------------------------------------------------------
-- 7. Chi tiet don hang
--    unit_price NOT NULL, total_price NOT NULL, variant_id NOT NULL,
--    reviewed NOT NULL, product_name_snapshot NOT NULL
-- ------------------------------------------------------------
INSERT INTO order_items
  (id, order_id, product_id, variant_id, product_name_snapshot, color_snapshot, size_snapshot,
   unit_price, quantity, total_price, sale_price, reviewed)
VALUES
  (1011, 101, 1, 1, 'Ao thun cotton oversize', 'Den',   'M',   299000, 1, 299000, 249000, FALSE),
  (1012, 101, 2, 4, 'Quan jean slim fit',      'Xanh',  '32',  599000, 1, 599000, 499000, FALSE),
  (1021, 102, 1, 1, 'Ao thun cotton oversize', 'Den',   'M',   299000, 1, 299000, 249000, FALSE),
  (1031, 103, 2, 4, 'Quan jean slim fit',      'Xanh',  '32',  599000, 1, 599000, 499000, FALSE),
  (1032, 103, 3, 5, 'Ao so mi linen',          'Be',    'S',   399000, 1, 399000, NULL,    FALSE),
  (1041, 104, 1, 1, 'Ao thun cotton oversize', 'Den',   'M',   299000, 1, 299000, 249000, FALSE),
  (1051, 105, 3, 5, 'Ao so mi linen',          'Be',    'S',   399000, 1, 399000, NULL,    FALSE),
  (1061, 106, 3, 5, 'Ao so mi linen',          'Be',    'S',   399000, 1, 399000, NULL,    FALSE),
  (1062, 106, 4, 6, 'Tui xach canvas',         'Den',   'ONE', 199000, 1, 199000, NULL,    FALSE),
  (1063, 106, 1, 2, 'Ao thun cotton oversize', 'Den',   'L',   299000, 1, 299000, 249000, FALSE),
  (1071, 107, 2, 4, 'Quan jean slim fit',      'Xanh',  '32',  599000, 1, 599000, 499000, TRUE),
  (1081, 108, 4, 6, 'Tui xach canvas',         'Den',   'ONE', 199000, 1, 199000, NULL,    FALSE),
  (1091, 109, 1, 1, 'Ao thun cotton oversize', 'Den',   'M',   299000, 1, 299000, 249000, FALSE)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 8. Yeu cau giu hang (cho kho duyet)
--    status CHECK trong {PENDING, APPROVED, REJECTED, RELEASED}
-- ------------------------------------------------------------
INSERT INTO stock_reservations (order_id, product_id, quantity, status, reject_reason, created_at)
VALUES
  (101, 1, 1, 'PENDING',    NULL, now()),
  (102, 2, 1, 'PENDING',    NULL, now()),
  (103, 3, 1, 'APPROVED',   NULL, now()),
  (104, 1, 1, 'APPROVED',   NULL, now()),
  (108, 4, 1, 'REJECTED',   'San pham dang het ton', now())
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- 9. Van don (cho van chuyen)
--    tracking_code NOT NULL + UNIQUE, order_id NOT NULL + UNIQUE,
--    cod_amount, cod_reconciled NOT NULL.
--    status CHECK chap nhan ca CHUOI THUONG va CHUOI THUONG.
-- ------------------------------------------------------------
INSERT INTO shipments
  (shipment_id, order_id, carrier_name, tracking_code, status,
   cod_amount, cod_reconciled, handover_at, delivered_at, delivery_proof_url)
VALUES
  (106, 106, 'Giao Hang Nhanh', 'GHN1060001', 'IN_TRANSIT',
   729000, FALSE, now() - interval '6 hours', NULL, NULL),
  (107, 107, 'Viettel Post',    'VTP1070001', 'DELIVERED',
   628000, FALSE, now() - interval '3 days', now() - interval '2 days', '/uploads/pod/107.jpg'),

  -- Ready package chua tao van don: don 105 da dong goi, san sang ban giao.
  -- Van don cho don 108 (da huy) khong duoc tao.
  (108, 105, 'Giao Hang Nhanh', 'GHN1050001', 'PENDING',
   429000, FALSE, NULL, NULL, NULL)
ON CONFLICT (tracking_code) DO NOTHING;


-- ------------------------------------------------------------
-- 10. Bang chung giao hang + phieu doi soat COD
-- ------------------------------------------------------------
INSERT INTO proof_of_delivery (shipment_id, receiver_name, delivered_at, image_url)
SELECT s.shipment_id, 'Le Van Cuong', s.delivered_at, s.delivery_proof_url
FROM shipments s
WHERE s.tracking_code = 'VTP1070001'
  AND NOT EXISTS (
    SELECT 1 FROM proof_of_delivery p WHERE p.shipment_id = s.shipment_id
  );


-- ------------------------------------------------------------
-- 11. Dem nhanh de kiem tra du lieu da nap
-- ------------------------------------------------------------
DO $$
DECLARE
    v_cats   bigint;
    v_prods  bigint;
    v_vari   bigint;
    v_inv    bigint;
    v_orders bigint;
    v_reserv bigint;
    v_ship   bigint;
BEGIN
    SELECT count(*) INTO v_cats   FROM categories;
    SELECT count(*) INTO v_prods  FROM products;
    SELECT count(*) INTO v_vari   FROM product_variants;
    SELECT count(*) INTO v_inv    FROM inventories;
    SELECT count(*) INTO v_orders FROM orders;
    SELECT count(*) INTO v_reserv FROM stock_reservations;
    SELECT count(*) INTO v_ship   FROM shipments;

    RAISE NOTICE 'Demo data: categories=%, products=%, variants=%, inventories=%, orders=%, reservations=%, shipments=%',
        v_cats, v_prods, v_vari, v_inv, v_orders, v_reserv, v_ship;
END $$;