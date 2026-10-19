-- Luu nguoi gui phieu dieu chinh ton kho de bao ket qua duyet / tu choi / yeu cau chinh sua qua chuong.
-- Cot requested_by (bigint) khong chua duoc User.id (chuoi) nen tu truoc den nay luon NULL.
ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS requester_user_id VARCHAR(255);
