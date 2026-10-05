import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../domain/repositories/auth_repository.dart';
import '../di/injector.dart';
import '../router/app_router.dart';
import '../state/base_controller.dart';
import 'stat_card.dart';

/// Khung chung cho 3 man hinh chinh: tieu de + nut dang xuat + khoi so lieu.
///
/// App duoc dung chung tren may o kho/xe van chuyen nen nut dang xuat phai
/// luon nam trong AppBar, khong the chon sau.
class RoleShell extends StatelessWidget {
  const RoleShell({
    super.key,
    required this.title,
    required this.controller,
    required this.onRefresh,
    this.stats = const [],
    this.bottom,
    required this.body,
  });

  final String title;
  final BaseController controller;
  final Future<void> Function() onRefresh;
  final List<Widget> stats;
  final PreferredSizeWidget? bottom;
  final Widget body;

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn sẽ phải đăng nhập lại để tiếp tục ca.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    await sl<AuthRepository>().logout();
    if (context.mounted) context.go(Routes.login);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        bottom: bottom,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới',
            onPressed: controller.isLoading ? null : onRefresh,
          ),
          PopupMenuButton<String>(
            tooltip: 'Tài khoản',
            onSelected: (value) {
              if (value == 'logout') _confirmLogout(context);
            },
            itemBuilder: (ctx) => const [
              PopupMenuItem(value: 'logout', child: Text('Đăng xuất')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          if (controller.errorMessage != null)
            _ErrorBanner(
              message: controller.errorMessage!,
              onRetry: onRefresh,
            ),
          if (stats.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: StatRow(cards: stats),
            ),
          Expanded(child: body),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      color: scheme.errorContainer,
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
      child: Row(
        children: [
          Icon(Icons.error_outline, size: 18, color: scheme.onErrorContainer),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: scheme.onErrorContainer, fontSize: 12),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}