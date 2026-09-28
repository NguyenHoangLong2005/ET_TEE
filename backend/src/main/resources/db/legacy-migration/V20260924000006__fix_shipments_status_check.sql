-- Fix shipments status check constraint to support uppercase Java enum values
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_status_check;

ALTER TABLE shipments ADD CONSTRAINT shipments_status_check 
CHECK (status IN (
    'PENDING', 'HANDED_OVER', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'RETURNED',
    'pending', 'handed_over', 'in_transit', 'delivered', 'exception', 'returned'
));
