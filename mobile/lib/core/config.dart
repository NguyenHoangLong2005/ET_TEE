import 'package:flutter/foundation.dart';

/// Where the app finds the backend and the storefront's static images.
///
/// The web storefront proxies `/api/*` to Spring Boot and serves product photos from
/// `web/public/images`, so by default both point at the Next.js server (port 3000).
/// Override at build time:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000 \
///               --dart-define=ASSET_BASE_URL=http://192.168.1.10:3000
class AppConfig {
  static const _apiOverride = String.fromEnvironment('API_BASE_URL');
  static const _assetOverride = String.fromEnvironment('ASSET_BASE_URL');

  /// Android emulators reach the host machine through 10.0.2.2, not localhost.
  static String get _hostDefault {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  /// In a browser the app runs on its own origin; the backend allows localhost:3001 directly
  /// (CorsConfig), so Flutter web talks to Spring Boot without going through Next.
  static String get apiBase {
    if (_apiOverride.isNotEmpty) return _trim(_apiOverride);
    if (kIsWeb) return 'http://localhost:8081';
    return _hostDefault;
  }

  static String get assetBase {
    if (_assetOverride.isNotEmpty) return _trim(_assetOverride);
    return _hostDefault;
  }

  static String _trim(String v) => v.endsWith('/') ? v.substring(0, v.length - 1) : v;
}

const _placeholderHosts = [
  'picsum.photos',
  'placehold.co',
  'placeholder.com',
  'via.placeholder.com',
  'dummyimage.com',
  'loremflickr.com',
];

/// Mirrors web `sanitizeImageUrl`: absolute http(s) URLs pass, root-relative paths are served
/// by the storefront, anything else (blank, javascript:, data:) is dropped.
String? resolveImageUrl(dynamic raw) {
  if (raw is! String) return null;
  var url = raw.trim();
  if (url.isEmpty) return null;
  if (url.startsWith('//')) url = 'https:$url';
  if (RegExp(r'^https?://', caseSensitive: false).hasMatch(url)) {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;
    final host = uri.host.toLowerCase();
    if (_placeholderHosts.any((h) => host == h || host.endsWith('.$h'))) return null;
    return url;
  }
  if (RegExp(r'^[a-z][a-z0-9+.-]*:', caseSensitive: false).hasMatch(url)) return null;
  return '${AppConfig.assetBase}${url.startsWith('/') ? url : '/$url'}';
}
