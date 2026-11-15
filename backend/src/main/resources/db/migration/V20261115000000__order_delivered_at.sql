-- Doanh thu truoc day duoc gom theo created_at (ngay dat) cua cac don DELIVERED, nen don dat thang 10
-- giao thang 11 bi tinh vao thang 10. Luu thoi diem giao hang de bao cao theo ngay giao.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Don cu: lay dong DELIVERED dau tien trong lich su trang thai (dong sau la tu choi tra hang).
UPDATE orders o
SET delivered_at = h.first_delivered
FROM (SELECT order_id, MIN(created_at) AS first_delivered
      FROM order_status_history
      WHERE status = 'DELIVERED'
      GROUP BY order_id) h
WHERE h.order_id = o.id AND o.delivered_at IS NULL;

-- Don da giao nhung khong co lich su (du lieu seed / du lieu cu): dung lan cap nhat cuoi, roi ngay dat.
UPDATE orders
SET delivered_at = COALESCE(updated_at, created_at)
WHERE delivered_at IS NULL
  AND status IN ('DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED');

CREATE INDEX IF NOT EXISTS idx_orders_shop_delivered_at ON orders (shop_id, delivered_at);
