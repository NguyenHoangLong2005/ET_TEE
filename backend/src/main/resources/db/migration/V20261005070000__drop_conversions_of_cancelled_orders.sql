-- Huy don tra lai luot voucher (xoa voucher_redemptions) nhung de nguyen su kien CONVERSION, nen
-- trang Hieu qua van dem don da huy la "don tu khuyen mai" va cong ca doanh thu cua no.
DELETE FROM campaign_analytics ca
USING orders o
WHERE ca.order_id = o.id
  AND ca.event_type = 'CONVERSION'
  AND o.status = 'CANCELLED';
