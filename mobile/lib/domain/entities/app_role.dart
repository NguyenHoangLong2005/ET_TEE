/// Mirrors com.nguyenhoanglong.constant.Role
enum AppRole {
  admin('ADMIN'),
  salesStaff('SALES_STAFF'),
  warehouseStaff('WAREHOUSE_STAFF'),
  shippingStaff('SHIPPING_STAFF'),
  cskhStaff('CSKH_STAFF'),
  marketingStaff('MARKETING_STAFF'),
  shopOwner('SHOP_OWNER'),
  user('USER');

  const AppRole(this.wireName);

  final String wireName;

  static AppRole? fromWire(String? value) {
    if (value == null) return null;
    for (final role in AppRole.values) {
      if (role.wireName == value) return role;
    }
    return null;
  }

  bool get isSales => this == AppRole.salesStaff;
  bool get isWarehouse => this == AppRole.warehouseStaff;
  bool get isShipping => this == AppRole.shippingStaff;
}