export const ROUTE_PERMISSIONS = {
  '/admin': ['ADMIN'],
  '/store-owner': ['SHOP_OWNER', 'ADMIN'],
  '/staff/dashboard/sales': ['SALES_STAFF', 'ADMIN', 'SHOP_OWNER'],
  '/staff/dashboard/warehouse': ['WAREHOUSE_STAFF', 'ADMIN', 'SHOP_OWNER'],
  '/staff/products': ['STAFF', 'ADMIN', 'SHOP_OWNER', 'MARKETING_STAFF', 'SALES_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF'],
  '/staff/orders': ['STAFF', 'ADMIN', 'SHOP_OWNER', 'SALES_STAFF', 'SHIPPING_STAFF', 'CSKH_STAFF'],
  '/staff/dashboard': ['STAFF', 'ADMIN', 'SHOP_OWNER', 'MARKETING_STAFF', 'SALES_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF', 'CSKH_STAFF'],
};

// Default route for staff dashboard
export const DEFAULT_STAFF_ROUTES: Record<string, string> = {
  'ADMIN': '/admin/dashboard',
  'SHOP_OWNER': '/store-owner/dashboard',
  'SALES_STAFF': '/staff/dashboard/sales',
  'WAREHOUSE_STAFF': '/staff/dashboard/warehouse',
  'STAFF': '/staff/dashboard',
  'CSKH_STAFF': '/staff/dashboard',
  'SHIPPING_STAFF': '/staff/dashboard',
  'MARKETING_STAFF': '/staff/dashboard'
};
