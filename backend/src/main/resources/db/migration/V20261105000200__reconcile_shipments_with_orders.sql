-- Dong bo trang thai kien hang (shipments) voi trang thai don (orders).
--
-- Mot so du lieu kiem thu (khach "Audit Customer ...", ma GHN-AUDIT-..., tao 24/09 bang script
-- ghi thang vao CSDL) co don da DELIVERED nhung kien van HANDED_OVER / PENDING / IN_TRANSIT.
-- Trang van don hien nut "Bat dau giao hang" cho cac kien nay, bam thi backend bao "Don hang
-- dang o trang thai DELIVERED, khong the chuyen sang SHIPPING". Code hien tai luon cap nhat kien
-- va don cung luc (ShippingService), nen day chi la sua du lieu cu; khong xoa gi.
--
-- So sanh khong phan biet hoa/thuong vi rang buoc shipments_status_check cho phep ca hai.

-- 1. Don da giao (ke ca da giao roi khach yeu cau tra) -> kien "Da giao".
UPDATE shipments s
SET status = 'DELIVERED',
    delivered_at = COALESCE(s.delivered_at, o.updated_at, CURRENT_TIMESTAMP),
    handover_at = COALESCE(s.handover_at, s.delivered_at, o.updated_at, CURRENT_TIMESTAMP)
FROM orders o
WHERE o.id = s.order_id
  AND UPPER(o.status) IN ('DELIVERED', 'RETURN_REQUESTED')
  AND UPPER(s.status) IN ('PENDING', 'HANDED_OVER', 'IN_TRANSIT', 'EXCEPTION');

-- 2. Don dang giao -> kien chua o buoc "Dang giao" thi dua len "Dang giao".
UPDATE shipments s
SET status = 'IN_TRANSIT',
    handover_at = COALESCE(s.handover_at, o.updated_at, CURRENT_TIMESTAMP)
FROM orders o
WHERE o.id = s.order_id
  AND UPPER(o.status) = 'SHIPPING'
  AND UPPER(s.status) IN ('PENDING', 'HANDED_OVER');

-- 3. Su co con mo tren kien da giao xong: dong lai, ghi chu ly do.
UPDATE shipping_exceptions e
SET status = 'RESOLVED',
    resolution_note = COALESCE(e.resolution_note || ' | ', '')
        || 'Tự đóng khi đồng bộ dữ liệu: đơn hàng đã giao thành công.'
FROM shipments s
WHERE s.shipment_id = e.shipment_id
  AND UPPER(s.status) = 'DELIVERED'
  AND UPPER(e.status) = 'OPEN';
