import '../entities/app_role.dart';

abstract class AuthRepository {
  StaffProfile? get cachedProfile;

  Future<void> login(String email, String password);

  Future<void> logout();

  /// Fetches /api/auth/me and caches role + permissions.
  Future<StaffProfile> currentProfile();

  Future<void> restoreSession();
}

class StaffProfile {
  const StaffProfile({
    required this.id,
    required this.fullName,
    required this.roles,
    required this.permissions,
  });

  final int id;
  final String fullName;
  final List<AppRole> roles;
  final List<String> permissions;

  bool has(String permission) => permissions.contains(permission);

  AppRole? get primaryRole => roles.isEmpty ? null : roles.first;
}
