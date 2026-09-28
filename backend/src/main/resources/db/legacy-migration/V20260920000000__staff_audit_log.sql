CREATE TABLE staff_audit_log (
    id BIGSERIAL PRIMARY KEY,
    staff_id VARCHAR(255) NOT NULL REFERENCES users(id),
    actor_id VARCHAR(255) NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_staff_id ON staff_audit_log(staff_id);
