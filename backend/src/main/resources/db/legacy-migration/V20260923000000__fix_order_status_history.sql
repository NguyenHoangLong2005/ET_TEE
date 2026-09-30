-- Migration to fix order_status_history table
-- Ensure the table has the correct columns matching the entity

-- Drop existing table if it exists (will lose data, but this is for development)
DROP TABLE IF EXISTS order_status_history;

-- Create table with correct schema (status is NOT NULL)
CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    from_status VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(status);

-- Add foreign key constraint (optional, can skip for now)
-- ALTER TABLE order_status_history ADD CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id);
