-- He thong chi quan ly MOT cua hang (SingleShop.ID = 1). CSDL con du lieu cua chi nhanh khac
-- (vd shop 2 "ET.TEE Hanoi Branch"): don hang, ton kho, nhan vien... gan voi chi nhanh do khong
-- hien cho cua hang 1. Gop tat ca ve cua hang 1. KHONG xoa ban ghi nghiep vu nao; chi nhanh cu
-- duoc tat (is_active = false) de con tra lai lich su.

-- 1. Bang co rang buoc duy nhat theo (shop_id, ...): xu ly dong se bi trung truoc khi doi shop_id.
--    Cau hinh san pham tai chi nhanh: cua hang 1 da co cau hinh cho san pham do thi xoa mem ban cua chi nhanh.
UPDATE shop_product_configs c
SET deleted_at = CURRENT_TIMESTAMP
WHERE c.shop_id <> 1 AND c.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM shop_product_configs k
              WHERE k.shop_id = 1 AND k.product_id = c.product_id AND k.deleted_at IS NULL);
-- Hai chi nhanh khac cung cau hinh mot san pham: giu ban moi nhat (id lon nhat).
UPDATE shop_product_configs c
SET deleted_at = CURRENT_TIMESTAMP
WHERE c.shop_id <> 1 AND c.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM shop_product_configs k
              WHERE k.shop_id <> 1 AND k.deleted_at IS NULL AND k.product_id = c.product_id AND k.id > c.id);

--    Danh muc noi bat: trung voi cua hang 1 (hoac giua cac chi nhanh) thi bo ban cua chi nhanh.
DELETE FROM store_featured_categories f
WHERE f.shop_id <> 1
  AND (EXISTS (SELECT 1 FROM store_featured_categories k WHERE k.shop_id = 1 AND k.category_id = f.category_id)
    OR EXISTS (SELECT 1 FROM store_featured_categories k
               WHERE k.shop_id <> 1 AND k.category_id = f.category_id AND k.id > f.id));

--    Danh gia nhan vien: moi (nhan vien, ky) chi mot ban; giu ban cua cua hang 1.
DELETE FROM staff_performance_evaluations e
WHERE e.shop_id <> 1
  AND EXISTS (SELECT 1 FROM staff_performance_evaluations k
              WHERE k.shop_id = 1 AND k.user_id = e.user_id AND k.evaluation_period = e.evaluation_period);

-- 2. Doi shop_id ve cua hang 1 o moi bang.
UPDATE orders                        SET shop_id = 1 WHERE shop_id <> 1;
UPDATE users                         SET shop_id = 1 WHERE shop_id <> 1;
UPDATE inventories                   SET shop_id = 1 WHERE shop_id <> 1;
UPDATE goods_receipts                SET shop_id = 1 WHERE shop_id <> 1;
UPDATE stocktakes                    SET shop_id = 1 WHERE shop_id <> 1;
UPDATE restock_requests              SET shop_id = 1 WHERE shop_id <> 1;
UPDATE suppliers                     SET shop_id = 1 WHERE shop_id <> 1;
UPDATE vouchers                      SET shop_id = 1 WHERE shop_id <> 1;
UPDATE voucher_change_requests       SET shop_id = 1 WHERE shop_id <> 1;
UPDATE campaigns                     SET shop_id = 1 WHERE shop_id <> 1;
UPDATE marketing_posts               SET shop_id = 1 WHERE shop_id <> 1;
UPDATE support_tickets               SET shop_id = 1 WHERE shop_id <> 1;
UPDATE cod_reconciliations           SET shop_id = 1 WHERE shop_id <> 1;
UPDATE cskh_voucher_quotas           SET shop_id = 1 WHERE shop_id <> 1;
UPDATE cskh_voucher_grants           SET shop_id = 1 WHERE shop_id <> 1;
UPDATE shop_work_shifts              SET shop_id = 1 WHERE shop_id <> 1;
UPDATE staff_performance_evaluations SET shop_id = 1 WHERE shop_id <> 1;
UPDATE shop_product_configs          SET shop_id = 1 WHERE shop_id <> 1;
UPDATE store_featured_categories     SET shop_id = 1 WHERE shop_id <> 1;
UPDATE order_lookup_audit_logs       SET actor_shop_id = 1 WHERE actor_shop_id <> 1;

-- 3. Tat cac chi nhanh cu (giu ban ghi de con tra lich su).
UPDATE shops SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id <> 1;
