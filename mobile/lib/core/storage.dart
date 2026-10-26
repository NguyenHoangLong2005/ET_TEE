import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

/// Device storage, the app's counterpart of the web's localStorage / sessionStorage.
///
/// "Ghi nhớ đăng nhập" off keeps the token in memory only, like sessionStorage on the web:
/// closing the app logs the user out.
class AppStorage {
  AppStorage._();
  static final AppStorage instance = AppStorage._();

  static const _kToken = 'auth_token';
  static const _kUser = 'ettee_user';
  static const _kGuest = 'guest_cart_token';
  static const _kBehavior = 'behavior_session';
  static const _kSizeProfile = 'size_profile';

  late SharedPreferences _prefs;
  String? _sessionToken;
  String? _sessionUser;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  String? get token => _prefs.getString(_kToken) ?? _sessionToken;
  bool get tokenRemembered => _prefs.getString(_kToken) != null;

  Future<void> setToken(String token, {required bool remember}) async {
    if (remember) {
      await _prefs.setString(_kToken, token);
      _sessionToken = null;
    } else {
      await _prefs.remove(_kToken);
      _sessionToken = token;
    }
  }

  Map<String, dynamic>? get user {
    final raw = _prefs.getString(_kUser) ?? _sessionUser;
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> setUser(Map<String, dynamic> user) async {
    final raw = jsonEncode(user);
    if (tokenRemembered) {
      await _prefs.setString(_kUser, raw);
    } else {
      _sessionUser = raw;
    }
  }

  Future<void> clearSession() async {
    _sessionToken = null;
    _sessionUser = null;
    await _prefs.remove(_kToken);
    await _prefs.remove(_kUser);
  }

  /// Guest cart / wishlist identity (X-Guest-Cart-Token), created on first use.
  String get guestToken {
    var t = _prefs.getString(_kGuest);
    if (t == null) {
      t = _uuid();
      _prefs.setString(_kGuest, t);
    }
    return t;
  }

  String? get existingGuestToken => _prefs.getString(_kGuest);
  Future<void> clearGuestToken() => _prefs.remove(_kGuest);

  /// Behavior session for the session-based recommender: rolls over after 30 idle minutes.
  String behaviorSessionId() {
    final now = DateTime.now().millisecondsSinceEpoch;
    String id;
    try {
      final stored = jsonDecode(_prefs.getString(_kBehavior) ?? 'null');
      id = stored is Map && now - (stored['at'] as num) < 30 * 60 * 1000 ? stored['id'] as String : _uuid();
    } catch (_) {
      id = _uuid();
    }
    _prefs.setString(_kBehavior, jsonEncode({'id': id, 'at': now}));
    return id;
  }

  Map<String, dynamic>? get sizeProfile {
    try {
      final v = jsonDecode(_prefs.getString(_kSizeProfile) ?? 'null');
      return v is Map<String, dynamic> ? v : null;
    } catch (_) {
      return null;
    }
  }

  Future<void> setSizeProfile(Map<String, dynamic> body) => _prefs.setString(_kSizeProfile, jsonEncode(body));

  static String _uuid() {
    final r = Random.secure();
    final b = List<int>.generate(16, (_) => r.nextInt(256));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
    return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
  }
}
