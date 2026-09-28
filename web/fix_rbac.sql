
DO \$\$ 
BEGIN
    -- Check if we need gen_random_uuid() or if it auto generates
    INSERT INTO role_permissions (id, role_code, permission, created_at, updated_at)
    SELECT gen_random_uuid(), 'ADMIN', 'MANAGE_ROLE_PERMISSION', current_timestamp, current_timestamp
    WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_code='ADMIN' AND permission='MANAGE_ROLE_PERMISSION');
END \$\$;
