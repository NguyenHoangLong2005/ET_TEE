-- Ticket khach tao khong kem don hang luu shop_id = NULL; nhan vien CSKH chi thay ticket cua cua hang
-- minh nen ticket do chi admin thay. Migration gop chi nhanh truoc day chi doi shop_id <> 1, bo sot NULL.
UPDATE support_tickets SET shop_id = 1 WHERE shop_id IS NULL;
