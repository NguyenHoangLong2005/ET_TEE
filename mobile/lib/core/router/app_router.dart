import 'package:go_router/go_router.dart';

import '../../presentation/auth/pages/login_page.dart';
import '../../presentation/sales/pages/sales_home_page.dart';
import '../../presentation/shipping/pages/shipping_home_page.dart';
import '../../presentation/warehouse/pages/warehouse_home_page.dart';

abstract class Routes {
  Routes._();

  static const splash = '/';
  static const login = '/login';

  static const salesHome = '/sales';
  static const warehouseHome = '/warehouse';
  static const shippingHome = '/shipping';
}

final GoRouter appRouter = GoRouter(
  initialLocation: Routes.login,
  routes: [
    GoRoute(
      path: Routes.login,
      builder: (_, __) => const LoginPage(),
    ),
    GoRoute(
      path: Routes.salesHome,
      builder: (_, __) => const SalesHomePage(),
    ),
    GoRoute(
      path: Routes.warehouseHome,
      builder: (_, __) => const WarehouseHomePage(),
    ),
    GoRoute(
      path: Routes.shippingHome,
      builder: (_, __) => const ShippingHomePage(),
    ),
  ],
);