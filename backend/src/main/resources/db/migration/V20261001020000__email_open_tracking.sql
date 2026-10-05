-- ============================================================
-- V20261001020000__email_open_tracking.sql
--
-- Theo doi viec khach da mo email hay chua (tracking pixel).
--   tracking_token  : ma ngau nhien, khong doan truoc duoc, nhung trong URL anh 1x1 cua email
--   opened_at       : lan mo dau tien
--   last_opened_at  : lan mo gan nhat
--   open_count      : so lan tai anh (uoc luong so lan mo)
-- Ban ghi cu khong co token nen khong duoc theo doi (hien "khong theo doi" tren giao dien).
-- ============================================================

ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS tracking_token  VARCHAR(64);
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS opened_at       TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS last_opened_at  TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS open_count      INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uk_email_logs_tracking_token
    ON email_logs (tracking_token) WHERE tracking_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_opened_at ON email_logs (opened_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);
