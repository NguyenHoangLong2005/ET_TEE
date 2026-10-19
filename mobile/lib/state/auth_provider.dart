import 'package:flutter/foundation.dart';

import '../core/api.dart';
import '../core/storage.dart';
import '../services/auth_service.dart';

class AppUser {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final List<String> permissions;
  final String phone;
  final bool isEmailVerified;

  AppUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.permissions = const [],
    this.phone = '',
    this.isEmailVerified = false,
  });

  factory AppUser.fromMap(Map<String, dynamic> m) => AppUser(
        id: '${m['id'] ?? ''}',
        email: '${m['email'] ?? ''}',
        fullName: '${m['fullName'] ?? ''}',
        role: normalizeRole(m['role'] as String? ?? ((m['roles'] is List && (m['roles'] as List).isNotEmpty) ? '${(m['roles'] as List).first}' : null)),
        permissions: (m['permissions'] is List ? m['permissions'] as List : const []).map((e) => '$e').toList(),
        phone: '${m['phone'] ?? ''}',
        isEmailVerified: m['status'] == 'ACTIVE' || m['isEmailVerified'] == true,
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'email': email,
        'fullName': fullName,
        'role': role,
        'roles': [role],
        'permissions': permissions,
        'phone': phone,
        'status': isEmailVerified ? 'ACTIVE' : null,
      };

  AppUser copyWith({String? fullName, String? phone}) => AppUser(
        id: id,
        email: email,
        fullName: fullName ?? this.fullName,
        role: role,
        permissions: permissions,
        phone: phone ?? this.phone,
        isEmailVerified: isEmailVerified,
      );

  bool get isStaff => staffRoles.contains(role);
  bool get isMarketing => role == 'MARKETING_STAFF';
}

/// Port of web AuthContext: restores the session, logs in / out, keeps the stored user in sync.
class AuthProvider extends ChangeNotifier {
  AppUser? _user;
  bool _loading = true;
  bool passwordChangeRequired = false;

  AppUser? get user => _user;
  bool get isLoading => _loading;
  bool get isLoggedIn => _user != null;

  AuthProvider() {
    Api.instance.onUnauthorized = () {
      if (_user == null) return;
      AppStorage.instance.clearSession();
      _user = null;
      notifyListeners();
    };
    Api.instance.onPasswordChangeRequired = () {
      if (passwordChangeRequired) return;
      passwordChangeRequired = true;
      notifyListeners();
    };
    final stored = AppStorage.instance.user;
    if (stored != null && AppStorage.instance.token != null) _user = AppUser.fromMap(stored);
  }

  Future<void> init() async {
    if (AppStorage.instance.token == null) {
      await AppStorage.instance.clearSession();
      _user = null;
      _loading = false;
      notifyListeners();
      return;
    }
    try {
      final me = await AuthService.getMe();
      _user = AppUser.fromMap(me);
      await AppStorage.instance.setUser(_user!.toMap());
    } on ApiException catch (e) {
      if (e.message == 'Unauthorized') {
        await AppStorage.instance.clearSession();
        _user = null;
      }
      // network / server error: keep the stored user
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Stores the token, loads the profile and merges the guest cart into the account
  /// before the cart is refetched (same order as the web AuthContext.login).
  Future<AppUser> login(String token, {bool remember = true}) async {
    await AppStorage.instance.setToken(token, remember: remember);
    final me = await AuthService.getMe();
    final user = AppUser.fromMap(me);
    final guest = AppStorage.instance.existingGuestToken;
    if (guest != null) {
      try {
        await Api.instance.send('POST', '/api/cart/merge', guest: true);
        await AppStorage.instance.clearGuestToken();
      } catch (_) {}
    }
    await AppStorage.instance.setUser(user.toMap());
    _user = user;
    passwordChangeRequired = false;
    notifyListeners();
    return user;
  }

  Future<void> logout() async {
    await AppStorage.instance.clearSession();
    _user = null;
    passwordChangeRequired = false;
    notifyListeners();
  }

  void updateUser({String? fullName, String? phone}) {
    if (_user == null) return;
    _user = _user!.copyWith(fullName: fullName, phone: phone);
    AppStorage.instance.setUser(_user!.toMap());
    notifyListeners();
  }
}
