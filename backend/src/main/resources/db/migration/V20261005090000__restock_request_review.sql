-- De xuat nhap hang cua nhan vien kho duoc luu PENDING nhung khong ai doc: hang doi phe duyet cua
-- chu cua hang chi lay voucher va dieu chinh ton kho. Them cot ghi lai nguoi duyet / tu choi.
ALTER TABLE restock_requests ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);
ALTER TABLE restock_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE restock_requests ADD COLUMN IF NOT EXISTS review_note VARCHAR(500);
