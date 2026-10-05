-- ============================================================
-- V20261001010000__audit_log_result_backfill.sql
--
-- Cot activity_logs.result vua duoc them (V20261001000000) nen cac ban ghi cu deu NULL.
-- Truoc do he thong CHI ghi log sau khi thao tac da thanh cong (dang nhap thanh cong,
-- dang ky, khoa/mo khoa, cap/thu hoi quyen...); dang nhap that bai va truy cap bi tu
-- choi chua tung duoc ghi. Vi vay moi ban ghi cu deu la SUCCESS - dien gia tri nay de
-- cot "Ket qua" tren trang Nhat ky kiem toan va bo loc theo ket qua dung cho ca lich su.
-- Chi cap nhat dong dang NULL; khong dong vao ban ghi moi.
-- ============================================================

UPDATE activity_logs SET result = 'SUCCESS' WHERE result IS NULL;
