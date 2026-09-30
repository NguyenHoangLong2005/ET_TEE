-- Migration to add shop_id column to orders table
-- This enables multi-shop order isolation

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_id BIGINT;

-- Add index for faster shop-based queries
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);

-- Backfill existing orders with default shop_id = 1 (single-shop mode)
UPDATE orders SET shop_id = 1 WHERE shop_id IS NULL;
