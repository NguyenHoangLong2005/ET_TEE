-- Fix order_status_history table columns
ALTER TABLE order_status_history ALTER COLUMN new_status DROP NOT NULL;

-- Add status column if it doesn't exist (for databases that ran the original migration)
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Sync data between status and new_status columns
UPDATE order_status_history SET status = new_status WHERE status IS NULL AND new_status IS NOT NULL;
UPDATE order_status_history SET new_status = status WHERE new_status IS NULL AND status IS NOT NULL;
