import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// Phân tuyến theo vai trò sau khi đăng nhập.
AppRoleHome resolveHome(String? primaryRoleWire) {
  switch (primaryRoleWire) {
    case 'SALES_STAFF':
      return AppRoleHome.sales;
    case 'WAREHOUSE_STAFF':
      return AppRoleHome.warehouse;
    case 'SHIPPING_STAFF':
      return AppRoleHome.shipping;
    default:
      return AppRoleHome.denied;
  }
}

enum AppRoleHome {
  sales('/sales'),
  warehouse('/warehouse'),
  shipping('/shipping'),
  denied('/login');

  const AppRoleHome(this.path);

  final String path;

  void go() => context.go(path);
}