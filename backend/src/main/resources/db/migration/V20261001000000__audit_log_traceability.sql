-- ============================================================
-- V20261001000000__audit_log_traceability.sql
--
-- Nhat ky kiem toan truoc day chi luu: nguoi dung (id), hanh dong, thuc the, mo ta, IP.
-- IP thuc te luon la 127.0.0.1 (hard-code / dia chi proxy), khong biet ai dung vai tro
-- gi, thao tac thanh cong hay that bai, khong co duong dan goi API hay gia tri truoc/sau.
-- Them cac cot de truy vet day du. Tat ca cot moi deu NULLABLE nen cac ban ghi cu giu
-- nguyen va khong can backfill.
-- ============================================================

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS actor_email  VARCHAR(255);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS actor_role   VARCHAR(50);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS http_method  VARCHAR(10);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS request_path VARCHAR(500);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS status_code  INTEGER;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS result       VARCHAR(20);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_agent   VARCHAR(500);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS duration_ms  INTEGER;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS request_id   VARCHAR(64);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS old_value    TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS new_value    TEXT;

-- Bang chi co PK; loc theo thoi gian / hanh dong / nguoi dung / ket qua can index
-- khi so ban ghi tang len.
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action     ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id    ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity     ON activity_logs (target_entity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_result     ON activity_logs (result);
CREATE INDEX IF NOT EXISTS idx_activity_logs_request_id ON activity_logs (request_id);
