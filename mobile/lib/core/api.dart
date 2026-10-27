import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import 'config.dart';
import 'storage.dart';

class ApiException implements Exception {
  final String message;
  final int status;
  final String? code;
  ApiException(this.message, {this.status = 0, this.code});
  @override
  String toString() => message;
}

class ApiResponse {
  final int status;
  final dynamic body;
  ApiResponse(this.status, this.body);

  bool get ok => status >= 200 && status < 300;

  /// `{success, data}` envelopes are unwrapped; raw DTOs (cart, reviews) are returned as-is.
  dynamic get data {
    final b = body;
    if (b is Map && b.containsKey('data') && (b.containsKey('success') || b.containsKey('message'))) {
      return b['data'];
    }
    return b;
  }

  bool get success => ok && !(body is Map && body['success'] == false);

  String errorMessage([String? fallback]) {
    final b = body;
    if (b is Map) {
      final m = b['message'] ?? b['error'];
      if (m is String && m.isNotEmpty) return m;
    }
    return fallback ?? 'Yêu cầu thất bại ($status)';
  }
}

/// HTTP layer shared by every service; the Dart side of web `getAuthHeaders` + `apiRequest`.
class Api {
  Api._();
  static final Api instance = Api._();

  /// Set by AuthProvider: a 401 means the token is gone, the session must be cleared.
  void Function()? onUnauthorized;

  /// Set by AuthProvider: a temporary password has to be changed before anything else works.
  void Function()? onPasswordChangeRequired;

  Map<String, String> headers({bool guest = false, Map<String, String> extra = const {}}) {
    final h = <String, String>{'Content-Type': 'application/json', 'Accept': 'application/json', ...extra};
    final token = AppStorage.instance.token;
    if (token != null) h['Authorization'] = 'Bearer $token';
    // Same rule as the web: a signed-in shopper only sends the guest token where the backend
    // needs it to merge (cart, wishlist, behavior); a guest always sends it.
    if (guest || token == null) h['X-Guest-Cart-Token'] = AppStorage.instance.guestToken;
    return h;
  }

  Uri uri(String path, [Map<String, dynamic>? query]) {
    final base = Uri.parse('${AppConfig.apiBase}$path');
    if (query == null || query.isEmpty) return base;
    final q = <String, List<String>>{...base.queryParametersAll.map((k, v) => MapEntry(k, List.of(v)))};
    query.forEach((k, v) {
      if (v == null || v == '') return;
      if (v is Iterable) {
        final items = v.where((e) => e != null && e != '').map((e) => '$e').toList();
        if (items.isNotEmpty) q[k] = items;
      } else {
        q[k] = ['$v'];
      }
    });
    return base.replace(queryParameters: q);
  }

  /// Never throws for HTTP errors, only when the server cannot be reached.
  Future<ApiResponse> send(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    bool guest = false,
    Map<String, String> extraHeaders = const {},
  }) async {
    final req = http.Request(method, uri(path, query));
    req.headers.addAll(headers(guest: guest, extra: extraHeaders));
    if (body != null) req.body = jsonEncode(body);
    http.Response res;
    try {
      res = await http.Response.fromStream(await req.send()).timeout(const Duration(seconds: 30));
    } catch (_) {
      throw ApiException('Không kết nối được tới máy chủ. Vui lòng kiểm tra kết nối.');
    }
    dynamic decoded;
    if (res.bodyBytes.isNotEmpty) {
      try {
        decoded = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {
        decoded = null;
      }
    }
    final out = ApiResponse(res.statusCode, decoded);
    if (res.statusCode == 401 && AppStorage.instance.token != null) onUnauthorized?.call();
    if (res.statusCode == 403 && decoded is Map && decoded['code'] == 'PASSWORD_CHANGE_REQUIRED') {
      onPasswordChangeRequired?.call();
    }
    return out;
  }

  /// Throws [ApiException] with the server's reason when the call fails; returns unwrapped data.
  Future<dynamic> call(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    bool guest = false,
    Map<String, String> extraHeaders = const {},
    String? fallbackError,
  }) async {
    final res = await send(method, path, body: body, query: query, guest: guest, extraHeaders: extraHeaders);
    if (!res.success) {
      if (res.status == 403 && !(res.body is Map && (res.body as Map)['message'] != null)) {
        throw ApiException('Bạn không có quyền thực hiện thao tác này.', status: 403);
      }
      throw ApiException(res.errorMessage(fallbackError), status: res.status);
    }
    return res.data;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query, bool guest = false}) =>
      call('GET', path, query: query, guest: guest);
  Future<dynamic> post(String path, [Object? body]) => call('POST', path, body: body);
  Future<dynamic> put(String path, [Object? body]) => call('PUT', path, body: body);
  Future<dynamic> patch(String path, [Object? body]) => call('PATCH', path, body: body);
  Future<dynamic> delete(String path) => call('DELETE', path);

  /// Multipart upload (search by image).
  Future<ApiResponse> upload(String path, String field, List<int> bytes, String filename,
      {Map<String, dynamic>? query, String? contentType}) async {
    final req = http.MultipartRequest('POST', uri(path, query));
    final h = headers()..remove('Content-Type');
    req.headers.addAll(h);
    // Without an explicit type the part goes out as application/octet-stream, which the backend's
    // image search rejects ("Chỉ nhận ảnh JPG, PNG hoặc WEBP"): search by photo never worked here.
    final type = contentType ?? _imageTypeFor(filename);
    req.files.add(http.MultipartFile.fromBytes(field, bytes, filename: filename,
        contentType: type == null ? null : MediaType.parse(type)));
    try {
      final res = await http.Response.fromStream(await req.send());
      dynamic decoded;
      try {
        decoded = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {}
      return ApiResponse(res.statusCode, decoded);
    } catch (_) {
      throw ApiException('Không kết nối được tới máy chủ. Vui lòng kiểm tra kết nối.');
    }
  }
}

/// `toList(d)` of the web marketing pages: accepts a bare list or `{data|content|items: [...]}`.
List<dynamic> asList(dynamic d) {
  if (d is List) return d;
  if (d is Map) {
    for (final k in ['data', 'items', 'content']) {
      final v = d[k];
      if (v is List) return v;
      if (v is Map) {
        final inner = asList(v);
        if (inner.isNotEmpty) return inner;
      }
    }
  }
  return const [];
}

num toNum(dynamic v, [num fallback = 0]) {
  if (v is num) return v;
  if (v is String) return num.tryParse(v) ?? fallback;
  return fallback;
}

int toInt(dynamic v, [int fallback = 0]) => toNum(v, fallback).round();

String? str(dynamic v) => v == null ? null : '$v';

String? _imageTypeFor(String filename) {
  final f = filename.toLowerCase();
  if (f.endsWith('.jpg') || f.endsWith('.jpeg')) return 'image/jpeg';
  if (f.endsWith('.png')) return 'image/png';
  if (f.endsWith('.webp')) return 'image/webp';
  return null;
}
