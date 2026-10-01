-- Datafix gia khuyen mai (SalePriceDatafixService) chi ghi products.sale_price, bo trong
-- product_variants.sale_price. Gio hang va checkout tinh theo bien the, nen 482 san pham "dang giam"
-- van bi tinh gia goc, va trang chi tiet nhay ve gia goc ngay khi khach chon phan loai.
-- Chi chep cho bien the cung gia niem yet voi san pham va chua co gia khuyen mai rieng.
UPDATE product_variants v
SET sale_price = p.sale_price
FROM products p
WHERE v.product_id = p.id
  AND p.sale_price IS NOT NULL
  AND p.sale_price < p.price
  AND v.sale_price IS NULL
  AND v.price = p.price;
