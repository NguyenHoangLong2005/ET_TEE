-- Ensure all status history columns exist and synchronize old_status / new_status with from_status / status
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS old_status VARCHAR(50);
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS new_status VARCHAR(50);
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS from_status VARCHAR(50);
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Sync historical data
UPDATE order_status_history SET old_status = from_status WHERE old_status IS NULL AND from_status IS NOT NULL;
UPDATE order_status_history SET from_status = old_status WHERE from_status IS NULL AND old_status IS NOT NULL;
UPDATE order_status_history SET new_status = status WHERE new_status IS NULL AND status IS NOT NULL;
UPDATE order_status_history SET status = new_status WHERE status IS NULL AND new_status IS NOT NULL;
