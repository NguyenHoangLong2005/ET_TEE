-- ShippingService.addException luu kien sang EXCEPTION truoc roi moi chen ban ghi su co, khong
-- cung transaction. Khi chen loi (vd mo ta de trong vi pham NOT NULL), kien bi ket o EXCEPTION
-- ma khong co su co OPEN nao de xu ly. Tra cac kien do ve dung buoc nhu resolveException:
-- don dang SHIPPING -> IN_TRANSIT, da ban giao -> HANDED_OVER, con lai -> PENDING.
UPDATE shipments s
SET status = CASE
        WHEN o.status = 'SHIPPING' THEN 'IN_TRANSIT'
        WHEN s.handover_at IS NOT NULL THEN 'HANDED_OVER'
        ELSE 'PENDING'
    END
FROM orders o
WHERE o.id = s.order_id
  AND s.status = 'EXCEPTION'
  AND NOT EXISTS (
      SELECT 1 FROM shipping_exceptions e
      WHERE e.shipment_id = s.shipment_id AND e.status = 'OPEN'
  );
