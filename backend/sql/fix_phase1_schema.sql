-- Phase 1: Add missing columns for users, orders, and product_reviews
-- This script is idempotent and safely adds constraints only if they do not already exist.
-- Run on your Supabase/PostgreSQL database.

-- Users table: add role column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'USER';

-- Orders table: add missing customer and order details columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_address_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS order_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shipping_fee DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION DEFAULT 0;

-- Product reviews table: add additional fields if missing
ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS order_item_id BIGINT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS customer_name_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS purchased_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS purchased_color VARCHAR(100),
  ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN NOT NULL DEFAULT TRUE;

-- Add UNIQUE constraint on order_item_id only if it does not already exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_reviews_order_item_id_key') THEN
      ALTER TABLE product_reviews ADD CONSTRAINT product_reviews_order_item_id_key UNIQUE (order_item_id);
   END IF;
END $$;

-- Add foreign key constraint linking order_item_id to order_items(id) only if it does not already exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_reviews_order_item') THEN
      ALTER TABLE product_reviews
         ADD CONSTRAINT fk_product_reviews_order_item
         FOREIGN KEY (order_item_id) REFERENCES order_items(id)
         ON UPDATE CASCADE ON DELETE SET NULL;
   END IF;
END $$;

-- Orders table: add missing columns if any
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_code VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS guest_token VARCHAR(255);

-- Order items table: add missing snapshot and pricing columns
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_name_snapshot VARCHAR(255) NOT NULL DEFAULT 'Sản phẩm',
  ADD COLUMN IF NOT EXISTS image_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS color_snapshot VARCHAR(100),
  ADD COLUMN IF NOT EXISTS size_snapshot VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewed BOOLEAN NOT NULL DEFAULT FALSE;
