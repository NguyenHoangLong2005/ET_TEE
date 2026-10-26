import 'dart:convert';

import '../core/api.dart';
import '../core/storage.dart';

/// Port of web/src/lib/services/authService.ts.
class AuthService {
  static final _api = Api.instance;

  static Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body, String fallback) async {
    final res = await _api.send('POST', path, body: body);
    if (!res.ok) throw ApiException(res.errorMessage(fallback), status: res.status);
    return res.body is Map<String, dynamic> ? res.body as Map<String, dynamic> : {};
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _api.send('POST', '/api/auth/login',
        body: {'email': email, 'password': password, 'guestToken': AppStorage.instance.existingGuestToken});
    if (!res.ok) {
      if (res.body == null) throw ApiException('Đã xảy ra lỗi không xác định.');
      throw ApiException(res.errorMessage('Lỗi đăng nhập'), status: res.status);
    }
    final body = Map<String, dynamic>.from(res.body as Map);
    final payload = decodeJwt(body['token'] as String?);
    if (payload != null) {
      body['role'] ??= payload['role'] ?? roleFromAuthorities(payload['authorities']);
    }
    return body;
  }

  static Future<void> register(Map<String, dynamic> data) =>
      _post('/api/auth/register', {...data, 'guestToken': AppStorage.instance.existingGuestToken}, 'Lỗi đăng ký');

  static Future<bool> checkEmailAvailable(String email) async {
    try {
      final res = await _api.send('GET', '/api/auth/check-email', query: {'email': email});
      if (!res.ok) return false;
      return (res.body is Map && res.body['available'] == true);
    } catch (_) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> verifyEmail(String email, String code) => _post('/api/auth/verify-email',
      {'email': email, 'code': code, 'guestToken': AppStorage.instance.existingGuestToken}, 'Lỗi xác thực email');

  static Future<void> resendCode(String email) => _post('/api/auth/resend-code', {'email': email}, 'Lỗi gửi lại mã');

  static Future<void> forgotPassword(String email) =>
      _post('/api/auth/forgot-password', {'email': email}, 'Lỗi yêu cầu khôi phục mật khẩu');

  static Future<void> resendPasswordResetCode(String email) =>
      _post('/api/auth/resend-password-reset-code', {'email': email}, 'Lỗi gửi lại mã khôi phục');

  static Future<void> resetPassword(String email, String otp, String newPassword) => _post(
      '/api/auth/reset-password', {'email': email, 'otp': otp, 'newPassword': newPassword}, 'Lỗi đổi mật khẩu');

  /// /api/auth/me; throws 'Unauthorized' when the token is no longer accepted.
  static Future<Map<String, dynamic>> getMe() async {
    final res = await _api.send('GET', '/api/auth/me');
    if (res.status == 401 || res.status == 403) throw ApiException('Unauthorized', status: res.status);
    if (!res.ok) throw ApiException('Không thể kết nối tới máy chủ.', status: res.status);
    final raw = res.body;
    final data = (raw is Map && raw['data'] is Map) ? raw['data'] as Map : (raw as Map? ?? {});
    String? role = data['role'] as String? ?? ((data['roles'] is List && (data['roles'] as List).isNotEmpty) ? '${(data['roles'] as List).first}' : null);
    List<dynamic> permissions = (data['permissions'] ?? data['authorities'] ?? []) as List;
    final payload = decodeJwt(AppStorage.instance.token);
    if (payload != null) {
      role ??= payload['role'] as String? ?? roleFromAuthorities(payload['authorities']);
      if (permissions.isEmpty && payload['authorities'] is List) permissions = payload['authorities'] as List;
    }
    return {
      'id': '${data['userId'] ?? data['id'] ?? ''}',
      'email': data['email'] ?? '',
      'fullName': data['fullName'] ?? '',
      'role': normalizeRole(role),
      'permissions': permissions.map((e) => '$e').toList(),
      'phone': data['phone'] ?? '',
      'status': data['status'],
      'shopId': data['shopId'],
    };
  }
}

Map<String, dynamic>? decodeJwt(String? token) {
  if (token == null) return null;
  final parts = token.split('.');
  if (parts.length != 3) return null;
  try {
    final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
    final m = jsonDecode(payload);
    return m is Map<String, dynamic> ? m : null;
  } catch (_) {
    return null;
  }
}

String? roleFromAuthorities(dynamic authorities) {
  if (authorities is! List) return null;
  for (final a in authorities) {
    final s = '$a';
    if (s.startsWith('ROLE_')) return s.substring(5);
  }
  return null;
}

/// Uppercase, ROLE_ prefix dropped; USER when unknown.
String normalizeRole(String? raw) {
  if (raw == null || raw.trim().isEmpty) return 'USER';
  return raw
      .toUpperCase()
      .replaceFirst(RegExp(r'^ROLE_'), '')
      .replaceAll(RegExp(r'[^A-Z0-9_]+'), '_')
      .replaceAll(RegExp(r'_+'), '_');
}

const staffRoles = {
  'ADMIN',
  'SUPER_ADMIN',
  'SHOP_OWNER',
  'MARKETING_STAFF',
  'SALES_STAFF',
  'CSKH_STAFF',
  'WAREHOUSE_STAFF',
  'SHIPPING_STAFF',
  'STAFF',
};

String roleDisplayName(String role) => switch (role) {
      'ADMIN' || 'SUPER_ADMIN' => 'Quản trị viên Hệ thống',
      'SHOP_OWNER' => 'Chủ cửa hàng',
      'SALES_STAFF' => 'Nhân viên Bán hàng',
      'CSKH_STAFF' => 'Chăm sóc Khách hàng',
      'WAREHOUSE_STAFF' => 'Nhân viên Kho',
      'SHIPPING_STAFF' => 'Nhân viên Vận chuyển',
      'MARKETING_STAFF' => 'Nhân viên Marketing',
      'STAFF' => 'Nhân viên Cửa hàng',
      _ => role.replaceAll('_', ' '),
    };
