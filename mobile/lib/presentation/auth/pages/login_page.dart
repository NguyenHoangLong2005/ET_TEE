import 'package:flutter/material.dart';

import '../../../core/di/injector.dart';
import '../../../core/router/app_router.dart';
import '../../../domain/entities/app_role.dart';
import '../../../domain/repositories/auth_repository.dart';

/// Màn hình vào ứng dụng. Không có form đăng nhập: chọn vai trò để dùng tài
/// khoản demo tương ứng, hoặc tự động khôi phục phiên đã lưu.
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  static const _demoPassword = 'Demo@123456';

  static const _roles = [
    (AppRole.salesStaff, 'Nhân viên Bán hàng', 'sales@et.tee',
        Icons.point_of_sale_outlined),
    (AppRole.warehouseStaff, 'Nhân viên Kho', 'warehouse@et.tee',
        Icons.warehouse_outlined),
    (AppRole.shippingStaff, 'Nhân viên Vận chuyển', 'shipping@et.tee',
        Icons.local_shipping_outlined),
  ];

  bool _booting = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  /// Đã có token hợp lệ -> vào thẳng màn hình theo vai trò, không cần chọn.
  Future<void> _boot() async {
    try {
      await sl<AuthRepository>().restoreSession();
      if (!mounted) return;
      await redirectByRole(context);
    } catch (_) {
      if (!mounted) return;
      setState(() => _booting = false);
    }
  }

  Future<void> _loginAs(String email) async {
    setState(() {
      _booting = true;
      _error = null;
    });
    try {
      await sl<AuthRepository>().login(email, _demoPassword);
      if (!mounted) return;
      await redirectByRole(context);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _booting = false;
        _error = _message(e);
      });
    }
  }

  String _message(Object e) {
    final text = '$e';
    if (text.contains('401') || text.toLowerCase().contains('unauthorized')) {
      return 'Sai tài khoản hoặc mật khẩu demo.';
    }
    if (text.toLowerCase().contains('connection') ||
        text.toLowerCase().contains('network')) {
      return 'Không kết nối được tới máy chủ. Kiểm tra backend đã chạy chưa.';
    }
    return 'Không vào được: $text';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'ET Tee Staff',
                  style: Theme.of(context).textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Chọn vai trò để bắt đầu ca làm việc',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                if (_error != null) ...[
                  _ErrorBanner(message: _error!),
                  const SizedBox(height: 16),
                ],
                if (_booting)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: CircularProgressIndicator(),
                  )
                else
                  for (final (_, label, email, icon) in _roles)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: FilledButton.icon(
                        onPressed: () => _loginAs(email),
                        icon: Icon(icon),
                        label: Text(label),
                      ),
                    ),
                const SizedBox(height: 8),
                Text(
                  'Tài khoản demo: ${_roles.first.$3} / $_demoPassword',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, color: scheme.onErrorContainer, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: scheme.onErrorContainer, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
