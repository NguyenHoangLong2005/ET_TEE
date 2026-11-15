-- Phieu dieu chinh ton kho truoc day chi gan voi dong inventory (theo san pham), nen khi duyet
-- chi doi tong cua san pham; ton cua tung bien the (product_variants.stock / available_quantity),
-- thu ma gio hang va don hang thuc su dung, khong he thay doi. Luu bien the can dieu chinh.
ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS variant_id BIGINT;
ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS variant_label VARCHAR(255);
