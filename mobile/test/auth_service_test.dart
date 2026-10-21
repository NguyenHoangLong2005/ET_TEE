import 'package:flutter_test/flutter_test.dart';
import 'package:etteeshop_mobile/services/auth_service.dart';

void main() {
  test('shows localized labels for supported staff roles', () {
    expect(
      const UserSession(
        token: 'token',
        fullName: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      ).roleLabel,
      'Quản trị hệ thống',
    );
    expect(
      const UserSession(
        token: 'token',
        fullName: 'Owner',
        email: 'owner@example.com',
        role: 'SHOP_OWNER',
      ).roleLabel,
      'Chủ cửa hàng',
    );
    expect(
      const UserSession(
        token: 'token',
        fullName: 'Support',
        email: 'support@example.com',
        role: 'CSKH_STAFF',
      ).roleLabel,
      'Chăm sóc khách hàng',
    );
  });
}
