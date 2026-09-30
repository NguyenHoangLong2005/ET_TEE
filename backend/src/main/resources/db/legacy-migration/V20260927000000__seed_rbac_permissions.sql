-- Seed default RBAC permissions for all system roles.
-- Uses INSERT ... WHERE NOT EXISTS to be fully idempotent.

-- ADMIN
INSERT INTO role_permissions (role_code, permission)
SELECT 'ADMIN', perm FROM (VALUES
  ('MANAGE_USER'), ('MANAGE_ROLE_PERMISSION'), ('MANAGE_GLOBAL_CATEGORY'),
  ('CONFIG_PAYMENT_SHIPPING'), ('VIEW_SYS_ERROR_LOG'), ('VIEW_AUDIT_LOG'),
  ('MANAGE_BACKUP'), ('MANAGE_AI_MODEL_FEATURE_FLAG'), ('MANAGE_MAILING')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'ADMIN' AND permission = t.perm
);

-- SHOP_OWNER
INSERT INTO role_permissions (role_code, permission)
SELECT 'SHOP_OWNER', perm FROM (VALUES
  ('MANAGE_SHOP_STAFF'), ('VIEW_SHOP_DASHBOARD'), ('VIEW_SHOP_LOG'),
  ('APPROVE_SHOP_PROMO'), ('MANAGE_SHOP_INVENTORY'), ('MANAGE_SHOP_CATEGORY'),
  ('MANAGE_SHOP_PRODUCT')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'SHOP_OWNER' AND permission = t.perm
);

-- SALES_STAFF
INSERT INTO role_permissions (role_code, permission)
SELECT 'SALES_STAFF', perm FROM (VALUES
  ('VIEW_NEW_ORDER'), ('VERIFY_ORDER'), ('PROCESS_ORDER_NOTE'),
  ('REQUEST_STOCK_HOLD'), ('MONITOR_ORDER_SLA')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'SALES_STAFF' AND permission = t.perm
);

-- CSKH_STAFF
INSERT INTO role_permissions (role_code, permission)
SELECT 'CSKH_STAFF', perm FROM (VALUES
  ('CHAT_CUSTOMER'), ('MANAGE_TICKET'), ('SEARCH_ORDER_BASIC'),
  ('PROCESS_RETURN_REFUND'), ('ISSUE_SUPPORT_VOUCHER'), ('ESCALATE_TICKET')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'CSKH_STAFF' AND permission = t.perm
);

-- WAREHOUSE_STAFF
INSERT INTO role_permissions (role_code, permission)
SELECT 'WAREHOUSE_STAFF', perm FROM (VALUES
  ('INBOUND_STOCK'), ('COUNT_STOCK'), ('MANAGE_STOCK_LOCATION'), ('ADJUST_STOCK'),
  ('HOLD_STOCK_ORDER'), ('PICK_PACK_LABEL'), ('HANDOVER_SHIPPING'), ('PROPOSE_RESTOCK')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'WAREHOUSE_STAFF' AND permission = t.perm
);

-- SHIPPING_STAFF
INSERT INTO role_permissions (role_code, permission)
SELECT 'SHIPPING_STAFF', perm FROM (VALUES
  ('RECEIVE_PACKED_LIST'), ('MANAGE_WAYBILL'), ('CONFIRM_HANDOVER'),
  ('UPDATE_SHIPPING_EXCEPTION'), ('UPLOAD_POD'), ('RECONCILE_COD')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'SHIPPING_STAFF' AND permission = t.perm
);

-- MARKETING_STAFF
INSERT INTO role_permissions (role_code, permission)
SELECT 'MARKETING_STAFF', perm FROM (VALUES
  ('MANAGE_BANNER_LANDING'), ('MANAGE_CAMPAIGN_PROMO'), ('MANAGE_PRODUCT_PLACEMENT'),
  ('AB_TEST_CAMPAIGN'), ('VIEW_CAMPAIGN_ANALYTICS')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'MARKETING_STAFF' AND permission = t.perm
);

-- STAFF
INSERT INTO role_permissions (role_code, permission)
SELECT 'STAFF', perm FROM (VALUES
  ('ORDER_VIEW'), ('PRODUCT_VIEW')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'STAFF' AND permission = t.perm
);

-- USER
INSERT INTO role_permissions (role_code, permission)
SELECT 'USER', perm FROM (VALUES
  ('PROFILE_VIEW')
) AS t(perm)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions WHERE role_code = 'USER' AND permission = t.perm
);
