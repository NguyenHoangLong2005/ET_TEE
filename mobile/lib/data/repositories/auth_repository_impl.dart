import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/token_storage.dart';
import '../../domain/entities/app_role.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._api, this._tokens);

  final ApiClient _api;
  final TokenStorage _tokens;

  StaffProfile? _cachedProfile;

  @override
  StaffProfile? get cachedProfile => _cachedProfile;

  @override
  Future<void> login(String email, String password) async {
    final data = await _api.post<Map<String, dynamic>>(
      '${AppConfig.authBase}/login',
      body: {'email': email, 'password': password},
      parse: (raw) => raw as Map<String, dynamic>,
    );

    final access = (data['accessToken'] ?? data['token']) as String?;
    if (access == null || access.isEmpty) {
      throw StateError('LOGIN_RESPONSE_MISSING_TOKEN');
    }
    await _tokens.saveTokens(
      access: access,
      refresh: data['refreshToken'] as String?,
    );
    await _api.setToken(access);

    await currentProfile();
  }

  @override
  Future<void> logout() async {
    _cachedProfile = null;
    await _tokens.clear();
    await _api.clearToken();
  }

  @override
  Future<StaffProfile> currentProfile() async {
    final data = await _api.get<Map<String, dynamic>>(
      '${AppConfig.authBase}/me',
      parse: (raw) => raw as Map<String, dynamic>,
    );

    // /api/auth/me tra `role` (don) hoac `roles` (mang).
    final roles = <AppRole>[];
    final roleWire = data['role'] as String?;
    if (roleWire != null) {
      final role = AppRole.fromWire(roleWire);
      if (role != null) roles.add(role);
    }
    for (final e in (data['roles'] as List<dynamic>? ?? [])) {
      final role = AppRole.fromWire('$e');
      if (role != null && !roles.contains(role)) roles.add(role);
    }

    final uid = data['userId'] ?? data['id'];

    return _cachedProfile = StaffProfile(
      id: uid == null ? 0 : (uid is num ? uid.toInt() : int.tryParse('$uid') ?? 0),
      fullName: data['fullName'] as String? ?? '',
      roles: roles,
      permissions: (data['permissions'] as List<dynamic>? ?? [])
          .map((e) => '$e')
          .toList(),
    );
  }

  @override
  Future<void> restoreSession() async {
    final token = await _tokens.readAccessToken();
    if (token == null || token.isEmpty) {
      throw StateError('NO_SESSION');
    }
    // Nap token vao header truoc khi goi /me.
    await _api.setToken(token);
    await currentProfile();
  }
}
