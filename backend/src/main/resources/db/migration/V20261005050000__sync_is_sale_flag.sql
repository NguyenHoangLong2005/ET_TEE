-- Co is_sale lech khoi gia that: 511 san pham bat co "dang giam gia" nhung nhieu san pham khong co
-- gia khuyen mai, nen bo loc "Dang giam gia" tra ve hang khong giam. Tu gio co duoc tinh tu gia.
UPDATE products
SET is_sale = (sale_price IS NOT NULL AND sale_price < price)
WHERE is_sale IS DISTINCT FROM (sale_price IS NOT NULL AND sale_price < price);
