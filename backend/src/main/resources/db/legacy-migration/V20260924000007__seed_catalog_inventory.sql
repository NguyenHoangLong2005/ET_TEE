-- V20260924000007__seed_catalog_inventory.sql
-- Ensure all catalog products have a valid inventory record in public.inventories

CREATE TABLE IF NOT EXISTS public.inventories (
    inventory_id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    warehouse_location VARCHAR(100) DEFAULT 'KHO-MAIN',
    quantity_on_hand INTEGER NOT NULL DEFAULT 100,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    shop_id BIGINT DEFAULT 1
);

INSERT INTO public.inventories (product_id, product_name, warehouse_location, quantity_on_hand, quantity_reserved, reorder_level, shop_id)
SELECT 
    p.id, 
    COALESCE(p.name, 'Product ' || p.id), 
    'KHO-MAIN', 
    100, 
    0, 
    10, 
    1
FROM public.products p
WHERE NOT EXISTS (
    SELECT 1 FROM public.inventories inv WHERE inv.product_id = p.id
);
