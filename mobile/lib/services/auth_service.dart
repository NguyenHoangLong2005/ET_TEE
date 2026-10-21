import 'dart:convert';

import 'api_client.dart';

class UserSession {
  const UserSession({
    required this.token,
    required this.fullName,
    required this.email,
    required this.role,
  });

  final String token;
  final String fullName;
  final String email;
  final String role;

  String get roleLabel => switch (role) {
    'ADMIN' => 'Quản trị hệ thống',
    'SHOP_OWNER' => 'Chủ cửa hàng',
    'CSKH_STAFF' => 'Chăm sóc khách hàng',
    _ => role.replaceAll('_', ' '),
  };

  static UserSession fromResponse(Map<String, dynamic> data) {
    final token = data['token']?.toString();
    if (token == null || token.isEmpty) {
      throw const ApiException('Máy chủ không trả về mã đăng nhập.');
    }
    final claims = _readClaims(token);
    var role = data['role']?.toString() ?? claims['role']?.toString() ?? '';
    if (role.isEmpty && claims['authorities'] is List) {
      role = (claims['authorities'] as List)
          .map((item) => item.toString())
          .firstWhere((item) => item.startsWith('ROLE_'), orElse: () => '')
          .replaceFirst('ROLE_', '');
    }
    role = role.toUpperCase().replaceFirst('ROLE_', '');
    if (!const {'ADMIN', 'SHOP_OWNER', 'CSKH_STAFF'}.contains(role)) {
      throw ApiException(
        role.isEmpty
            ? 'Tài khoản chưa được phân quyền quản trị, chủ cửa hàng hoặc CSKH.'
            : 'Vai trò $role chưa được hỗ trợ trong ứng dụng này.',
      );
    }
    return UserSession(
      token: token,
      fullName: data['fullName']?.toString() ?? 'Người dùng ET.TEE',
      email: data['email']?.toString() ?? '',
      role: role,
    );
  }

  static Map<String, dynamic> _readClaims(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return const {};
      final payload = utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      );
      final decoded = jsonDecode(payload);
      return decoded is Map ? Map<String, dynamic>.from(decoded) : const {};
    } on FormatException {
      return const {};
    }
  }
}

class AuthService {
  static Future<UserSession> login(String email, String password) async {
    final response = await ApiClient.post(
      '/api/auth/login',
      body: {'email': email.trim(), 'password': password},
    );
    final data = unwrapResponse(response);
    if (data is! Map) {
      throw const ApiException('Dữ liệu đăng nhập từ máy chủ không hợp lệ.');
    }
    final session = UserSession.fromResponse(Map<String, dynamic>.from(data));
    await ApiClient.saveToken(session.token);
    return session;
  }

  static Future<UserSession?> restoreSession() async {
    final token = await ApiClient.readToken();
    if (token == null || token.isEmpty) return null;
    final claims = UserSession._readClaims(token);
    try {
      return UserSession.fromResponse({
        'token': token,
        'role': claims['role'],
        'fullName': claims['fullName'] ?? claims['name'],
        'email': claims['email'] ?? claims['sub'],
      });
    } on ApiException {
      await logout();
      return null;
    }
  }

  static Future<void> logout() => ApiClient.clearToken();
}
