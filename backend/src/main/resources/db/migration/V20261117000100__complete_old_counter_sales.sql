-- Don ban tai quay tao truoc khi he thong tu hoan tat don tai quay: khong dia chi giao, da thu tien
-- tai quay, nhung van nam o CONFIRMED (chua tinh doanh thu, chua tinh da ban, kho chua tru).
-- Hoan tat chung nhu luong moi (SalesOrderService.createSalesOrder): tru ton tren ke, cong da ban,
-- ghi ngay giao = ngay ban, va ghi lich su trang thai.
CREATE TEMP TABLE counter_sales ON COMMIT DROP AS
SELECT o.id, o.created_at
FROM orders o
WHERE o.status = 'CONFIRMED'
  AND COALESCE(o.payment_method, '') <> 'COD'
  AND COALESCE(o.sold_counted, FALSE) = FALSE
  AND o.shipping_address_snapshot IN ('Tại quầy (POS)', 'Thanh toán & nhận tại cửa hàng (POS)')
  AND NOT EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.id);

CREATE TEMP TABLE counter_sale_lines ON COMMIT DROP AS
SELECT oi.product_id, SUM(COALESCE(oi.quantity, 0)) AS qty
FROM order_items oi JOIN counter_sales c ON c.id = oi.order_id
GROUP BY oi.product_id;

-- Hang roi ke (vai tro cua buoc dong goi voi don giao di).
UPDATE inventories i
SET quantity_on_hand = GREATEST(0, i.quantity_on_hand - l.qty)
FROM counter_sale_lines l
WHERE i.product_id = l.product_id;

UPDATE products p
SET sold_count = COALESCE(p.sold_count, 0) + l.qty
FROM counter_sale_lines l
WHERE p.id = l.product_id;

-- Yeu cau giu hang con treo cua cac don nay khong con y nghia.
UPDATE stock_reservations r
SET status = 'RELEASED'
FROM counter_sales c
WHERE r.order_id = c.id AND r.status IN ('PENDING', 'APPROVED');

UPDATE orders o
SET status = 'DELIVERED', order_status = 'DELIVERED', sold_counted = TRUE,
    delivered_at = COALESCE(o.delivered_at, c.created_at, now()), updated_at = now()
FROM counter_sales c
WHERE o.id = c.id;

INSERT INTO order_status_history (order_id, from_status, old_status, status, new_status, changed_by, reason, created_at)
SELECT c.id, 'CONFIRMED', 'CONFIRMED', 'DELIVERED', 'DELIVERED', 'SYSTEM',
       'Hoàn tất đơn bán tại quầy tạo trước khi đơn tại quầy được tự hoàn tất', now()
FROM counter_sales c;
