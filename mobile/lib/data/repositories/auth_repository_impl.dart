import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/app_role.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._api);

  final ApiClient _api;

  StaffProfile? _cached;

  @override
  Future<void> login(String email, String password) async {
    final data = await _api.post<Map<String, dynamic>>(
      '${AppConfig.authBase}/login',
      body: {'email': email, 'password': password},
      parse: (raw) => raw as Map<String, dynamic>,
    );
    final token = data['token'] ?? data['accessToken'];
    if (token is String && token.isNotEmpty) {
      await _api.setToken(token);
    }
    final refresh = data['refreshToken'];
    await currentProfile();
    if (refresh is String) {
      // TODO: persist refresh token for silent renewal.
    }
  }

  @override
  Future<void> logout() async {
    _cached = null;
    await _api.clearToken();
  }

  @override
  Future<StaffProfile> currentProfile() async {
    final data = await _api.get<Map<String, dynamic>>(
      '${AppConfig.authBase}/me',
      parse: (raw) => raw as Map<String, dynamic>,
    );
    final roles = (data['roles'] as List<dynamic>? ?? [])
        .map((e) => AppRole.fromWire(e.toString()))
        .whereType<AppRole>()
        .toList();
    return _cached = StaffProfile(
      id: (data['id'] as num?)?.toInt() ?? 0,
      fullName: data['fullName'] as String? ?? '',
      roles: roles,
      permissions:
          (data['permissions'] as List<dynamic>? ?? []).map((e) => '$e').toList(),
    );
  }

  @override
  Future<void> restoreSession() async {
    final token = await _api.getToken();
    if (token == null || token.isEmpty) {
      throw StateError('NO_SESSION');
    }
    await currentProfile();
  }
}