-- ============================================================
-- V20260929000000__datafix_indexes_and_backfill.sql
--
-- Task rieng "chore/datafix-indexes", chay TRUOC Giai doan 0 cua viec phan quyen
-- da chi nhanh. Gom 4 phan, doc lap voi nhau:
--   1. Index con thieu (doi chieu tu db/legacy-migration/, chua tung chay)
--   2. Unique index tren LOWER(email) + 3 khoa ngoai cho support_tickets/ticket_messages
--   3. Backfill product_variants.color_code tu color_hex (xem ColorPalette.java)
--   4. Backfill products.average_rating/total_reviews va products.sold_count +
--      orders.sold_counted (xem SoldCountService.java)
--
-- Tat ca da duoc kiem tra CHI DOC tren du lieu that truoc khi viet file nay:
--   - 0 nhom email trung khi ha ve chu thuong
--   - 0 dong support_tickets/ticket_messages mo coi
--   - 16838/16838 bien the co color_hex, ca 9 gia tri deu khop chinh xac trong
--     ColorPalette (khong dong nao roi vao nhanh "mau gan nhat")
--   - 1043 review APPROVED tren 243 san pham, 381 san pham co don DELIVERED
-- Xem bao cao task datafix trong lich su trao doi de biet chi tiet tung con so.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Index con thieu tren du lieu da co
-- ------------------------------------------------------------
-- Hibernate khong tu sinh index tren khoa ngoai; Postgres cung khong. 20 file
-- migration cu khai bao 45 index nhung chua bao gio chay (xem docs/flyway.md),
-- nen DB that hien khong co index phu nao ngoai PK/UNIQUE. Danh sach duoi day la
-- toan bo phan da doi chieu la "thieu that" khoi 45 index do.

CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_code ON support_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_shop ON support_tickets(shop_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(status);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at);

CREATE INDEX IF NOT EXISTS idx_audit_staff_id ON staff_audit_log(staff_id);

CREATE INDEX IF NOT EXISTS idx_cskh_grant_ticket ON cskh_voucher_grants(ticket_id);
CREATE INDEX IF NOT EXISTS idx_cskh_grant_customer ON cskh_voucher_grants(customer_id);
CREATE INDEX IF NOT EXISTS idx_cskh_grant_staff ON cskh_voucher_grants(staff_id);
CREATE INDEX IF NOT EXISTS idx_cskh_quota_shop_period ON cskh_voucher_quotas(shop_id, period);

-- Ten cot khac voi ban goc trong file legacy (staff_id/order_id/looked_up_at):
-- bang thuc te tren DB dung actor_id, found_order_id, created_at (xem entity
-- OrderLookupAuditLog.java / doi chieu V1__baseline.sql).
CREATE INDEX IF NOT EXISTS idx_order_lookup_actor ON order_lookup_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_order_lookup_found_order ON order_lookup_audit_logs(found_order_id);
CREATE INDEX IF NOT EXISTS idx_order_lookup_created_at ON order_lookup_audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_color_code ON product_variants(color_code);


-- ------------------------------------------------------------
-- 2a. Unique index tren LOWER(email)
-- ------------------------------------------------------------
-- Doi chung voi AuthService.normalizeEmail(): moi diem vao dang ky/dang nhap/quen
-- mat khau da chuan hoa .trim().toLowerCase() truoc khi doc/ghi, nen index nay
-- chi xac nhan lai o tang DB, khong doi hanh vi ung dung.
-- Da kiem tra CHI DOC: 0 nhom email trung nhau khi ha ve chu thuong.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));


-- ------------------------------------------------------------
-- 2b. Khoa ngoai con thieu (da kiem tra: 0 dong mo coi)
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_support_tickets_order'
    ) THEN
        ALTER TABLE support_tickets
            ADD CONSTRAINT fk_support_tickets_order
            FOREIGN KEY (order_id) REFERENCES orders(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_support_tickets_customer'
    ) THEN
        ALTER TABLE support_tickets
            ADD CONSTRAINT fk_support_tickets_customer
            FOREIGN KEY (customer_id) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_messages_ticket'
    ) THEN
        ALTER TABLE ticket_messages
            ADD CONSTRAINT fk_ticket_messages_ticket
            FOREIGN KEY (ticket_id) REFERENCES support_tickets(id);
    END IF;
END $$;


-- ------------------------------------------------------------
-- 3. Backfill product_variants.color_code tu color_hex
-- ------------------------------------------------------------
-- KHONG backfill product_images.color_code: ma 2 chu cai cuoi ten file la ma SAN
-- PHAM (trung slug 1336/1336), khong phai ma mau -- moi san pham chi co 1 ma anh
-- duy nhat trong khi 665/668 san pham co 3-4 mau bien the khac nhau. Suy mau tu do
-- se gan SAI cho phan lon anh. Xem bao cao khao sat de biet vi du cu the.
--
-- Bang duoi day khop 100% voi ColorPalette.java (backend/src/main/java/com/
-- nguyenhoanglong/util/ColorPalette.java) - sua mot cho thi sua ca hai.
UPDATE product_variants
SET color_code = CASE LOWER(color_hex)
    WHEN '#ffffff' THEN 'white'
    WHEN '#111111' THEN 'black'
    WHEN '#9ca3af' THEN 'gray'
    WHEN '#d6c3a5' THEN 'beige'
    WHEN '#f3e5ab' THEN 'cream'
    WHEN '#8b5a2b' THEN 'earth'
    WHEN '#5f7a61' THEN 'graygreen'
    WHEN '#facc15' THEN 'yellow'
    WHEN '#dc2626' THEN 'red'
    WHEN '#2563eb' THEN 'blue'
    WHEN '#0f172a' THEN 'navy'
    WHEN '#3b5f8a' THEN 'denim'
    WHEN '#f9a8d4' THEN 'pink'
    WHEN '#16a34a' THEN 'green'
    ELSE NULL
END
WHERE color_hex IS NOT NULL
  AND color_code IS NULL;


-- ------------------------------------------------------------
-- 4a. Dong bo cac cot cu/moi tren order_status_history
-- ------------------------------------------------------------
-- Bang co 2 cap cot cung y nghia (status/new_status, old_status/from_status) do
-- lich su doi ten cot; 31/64 dong dang thieu mot nua cap old/from. Dien cheo qua
-- lai, uu tien gia tri da co, khong ghi de gia tri dang co san.
UPDATE order_status_history SET status = new_status WHERE status IS NULL AND new_status IS NOT NULL;
UPDATE order_status_history SET new_status = status WHERE new_status IS NULL AND status IS NOT NULL;
UPDATE order_status_history SET old_status = from_status WHERE old_status IS NULL AND from_status IS NOT NULL;
UPDATE order_status_history SET from_status = old_status WHERE from_status IS NULL AND old_status IS NOT NULL;


-- ------------------------------------------------------------
-- 4b. Tinh lai products.average_rating / total_reviews
-- ------------------------------------------------------------
-- Cung cong thuc voi ProductRepository.recalculateProductRating(): chi tinh
-- review dang APPROVED. 1043 review APPROVED tren 243 san pham theo khao sat
-- CHI DOC; 425 san pham con lai ve 0/0.0.
UPDATE products p
SET total_reviews = agg.cnt,
    average_rating = agg.avg_rating
FROM (
    SELECT product_id, COUNT(*) AS cnt, AVG(rating)::double precision AS avg_rating
    FROM product_reviews
    WHERE status = 'APPROVED'
    GROUP BY product_id
) agg
WHERE p.id = agg.product_id;

UPDATE products
SET total_reviews = 0, average_rating = 0.0
WHERE id NOT IN (SELECT product_id FROM product_reviews WHERE status = 'APPROVED');


-- ------------------------------------------------------------
-- 4c. Tinh lai products.sold_count tu don DELIVERED, va co orders.sold_counted
-- ------------------------------------------------------------
-- Cot moi: ddl-auto=validate khong tu tao cot, phai them bang tay o day truoc
-- khi Order.java (entity) mong doi no ton tai. Xem SoldCountService.java.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sold_counted boolean NOT NULL DEFAULT false;

-- Truoc day sold_count duoc cong ngay luc checkout (moi don, ke ca chua giao) roi
-- tru khi huy. Gio no chi thay doi khi don CHUYEN SANG DELIVERED (xem
-- SoldCountService.java). Tinh lai mot lan cho khop mo hinh moi: 381 san pham,
-- tong 2862 don vi theo khao sat CHI DOC.
UPDATE products
SET sold_count = 0;

UPDATE products p
SET sold_count = agg.total_qty
FROM (
    SELECT oi.product_id, SUM(oi.quantity) AS total_qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'DELIVERED'
    GROUP BY oi.product_id
) agg
WHERE p.id = agg.product_id;

-- Danh dau moi don DELIVERED la "da cong vao sold_count" de SoldCountService
-- khong cong lai lan nua khi don do sau nay chuyen tiep sang RETURNED/REFUNDED.
-- Don da RETURNED/REFUNDED thi sold_counted phai la false (da tru roi, hoac chua
-- tung cong vi khong qua DELIVERED). Cac trang thai con lai (dang xu ly, huy)
-- chua bao gio duoc cong nen cung la false.
UPDATE orders SET sold_counted = (status = 'DELIVERED');
