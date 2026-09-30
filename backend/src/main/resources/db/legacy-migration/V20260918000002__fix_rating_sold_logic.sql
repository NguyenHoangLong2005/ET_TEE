-- Change average_rating to DOUBLE for better precision
ALTER TABLE products MODIFY COLUMN average_rating DOUBLE PRECISION DEFAULT 0.0;

-- Recalculate average_rating and total_reviews correctly
UPDATE products p
SET 
  total_reviews = COALESCE((SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status = 'APPROVED'), 0),
  average_rating = COALESCE((SELECT AVG(rating) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status = 'APPROVED'), 0.0);

-- Recalculate sold_count excluding cancelled and returned orders
UPDATE products p
SET sold_count = COALESCE((
    SELECT SUM(oi.quantity) 
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    WHERE oi.product_id = p.id 
      AND o.order_status NOT IN ('CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED')
), 0);
