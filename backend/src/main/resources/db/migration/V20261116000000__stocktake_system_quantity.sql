-- Phieu kiem ke truoc day chi luu so dem duoc, khong so voi ton he thong. Luu ton he thong tai
-- vi tri do luc nhap so dem va chenh lech, de chu cua hang biet can dieu chinh.
ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS system_quantity INTEGER;
ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS difference_quantity INTEGER;
