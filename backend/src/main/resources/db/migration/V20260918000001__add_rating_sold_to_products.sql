-- Add columns for rating and sold count
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,1) DEFAULT 0.0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INT DEFAULT 0;

-- Initialize data from existing reviews
UPDATE products p
SET 
  total_reviews = COALESCE((SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status = 'APPROVED'), 0),
  average_rating = COALESCE((SELECT CAST(AVG(rating) AS DECIMAL(3,1)) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status = 'APPROVED'), 0.0);

-- Initialize data from existing orders (excluding cancelled)
UPDATE products p
SET sold_count = COALESCE((
    SELECT SUM(oi.quantity) 
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    WHERE oi.product_id = p.id 
      AND o.status NOT IN (2) -- Assuming CANCELLED is an enum, wait! We might need to use string. Let's use order_status which is VARCHAR
), 0);

-- Correcting the order status check using order_status string column
UPDATE products p
SET sold_count = COALESCE((
    SELECT SUM(oi.quantity) 
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    WHERE oi.product_id = p.id 
      AND o.order_status != 'CANCELLED'
), 0);
