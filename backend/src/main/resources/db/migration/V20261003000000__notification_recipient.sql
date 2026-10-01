-- Thong bao ca nhan (vd: danh gia hieu suat nhan vien). NULL = thong bao he thong cho admin.
ALTER TABLE system_notifications ADD COLUMN IF NOT EXISTS recipient_user_id character varying(255);
CREATE INDEX IF NOT EXISTS idx_system_notifications_recipient ON system_notifications (recipient_user_id, created_at DESC);
