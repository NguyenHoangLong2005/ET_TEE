-- Add lockout fields to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;

-- Case-insensitive email uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Login attempts audit log
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  ip_address VARCHAR(45),
  success BOOLEAN,
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- Index for searching login attempts by email and time (useful for rate limiting / checking recent failures)
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
  ON login_attempts(email, attempted_at);
