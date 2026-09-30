-- Migration to fix staff shop_id assignment
-- Updates existing staff users to have shop_id = 1

-- Update staff users to have shop_id = 1 (except ADMIN)
UPDATE users SET shop_id = 1 
WHERE shop_id IS NULL 
AND role IN ('SALES_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF', 'STAFF', 'SHOP_OWNER');
