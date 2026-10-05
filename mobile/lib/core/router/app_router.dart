import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/di/injector.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/app_role.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../presentation/auth/pages/login_page.dart';
import '../../presentation/sales/pages/sales_home_page.dart';
import '../../presentation/shipping/pages/shipping_home_page.dart';
import '../../presentation/warehouse/pages/warehouse_home_page.dart';

abstract class Routes {
  Routes._();

  static const login = '/login';
  static const salesHome = '/sales';
  static const warehouseHome = '/warehouse';
  static const shippingHome = '/shipping';

  /// Trang chung cho 3 role, dung khi nguoi dung co nhieu vai tro.
  static const denied = '/denied';

  static String homeFor(AppRole? role) => switch (role) {
        AppRole.salesStaff => salesHome,
        AppRole.warehouseStaff => warehouseHome,
        AppRole.shippingStaff => shippingHome,
        _ => denied,
      };
}

/// Chuyen den man hinh theo vai tro chinh cua tai khoan.
///
/// [currentProfile] goi /api/auth/me; neu lenh loi (token het han, mat mang)
/// thi coi nhu chua dang nhap va day ve login.
Future<void> redirectByRole(BuildContext context) async {
  final repo = sl<AuthRepository>();
  final impl = repo is AuthRepositoryImpl ? repo : null;

  StaffProfile? profile = impl?.cachedProfile;
  if (profile == null) {
    try {
      profile = await repo.currentProfile();
    } catch (_) {
      profile = null;
    }
  }

  if (!context.mounted) return;

  final role = profile?.primaryRole;
  if (profile == null || role == null) {
    await repo.logout();
    if (context.mounted) context.go(Routes.login);
    return;
  }
  context.go(Routes.homeFor(role));
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
    GoRoute(
      path: Routes.denied,
      builder: (_, __) => const _NoRolePage(),
    ),
  ],
);

class _NoRolePage extends StatelessWidget {
  const _NoRolePage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Không có quyền truy cập')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.block, size: 48),
              const SizedBox(height: 12),
              const Text(
                'Tài khoản này không được gán vai trò nhân viên '
                '(bán hàng, kho, vận chuyển).',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => context.go(Routes.login),
                child: const Text('Đăng nhập tài khoản khác'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}