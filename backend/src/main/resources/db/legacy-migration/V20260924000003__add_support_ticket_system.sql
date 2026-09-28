-- Support Ticket System Schema
-- Enables customer service (CSKH) ticket management

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(255),
    order_id BIGINT,
    shop_id BIGINT,
    channel VARCHAR(20) NOT NULL DEFAULT 'CHAT',
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    priority INTEGER NOT NULL DEFAULT 3,
    assigned_to VARCHAR(255),
    escalated_to VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Messages Table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_id VARCHAR(255),
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    attachment_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_code ON support_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_shop ON support_tickets(shop_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at);

-- Create indexes for ticket_messages
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);

-- Add foreign key constraints
ALTER TABLE ticket_messages ADD CONSTRAINT fk_ticket_messages_ticket 
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;

ALTER TABLE support_tickets ADD CONSTRAINT fk_support_tickets_order 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE support_tickets ADD CONSTRAINT fk_support_tickets_customer 
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;
