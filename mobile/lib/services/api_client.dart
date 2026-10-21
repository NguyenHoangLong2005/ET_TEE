import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

const _tokenKey = 'ettee_access_token';
const _apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8080',
);

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._();

  static const _storage = FlutterSecureStorage();
  static final _client = http.Client();

  static String get baseUrl => _apiBaseUrl.replaceFirst(RegExp(r'/$'), '');

  static Future<dynamic> get(String path, {Map<String, String>? query}) =>
      _send('GET', path, query: query);

  static Future<dynamic> post(
    String path, {
    Object? body,
    Map<String, String>? query,
  }) => _send('POST', path, body: body, query: query);

  static Future<dynamic> put(
    String path, {
    Object? body,
    Map<String, String>? query,
  }) => _send('PUT', path, body: body, query: query);

  static Future<dynamic> patch(
    String path, {
    Object? body,
    Map<String, String>? query,
  }) => _send('PATCH', path, body: body, query: query);

  static Future<dynamic> delete(String path) => _send('DELETE', path);

  static Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
  }) async {
    final token = await _storage.read(key: _tokenKey);
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    late final http.Response response;
    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      final streamed = await _client
          .send(request)
          .timeout(const Duration(seconds: 25));
      response = await http.Response.fromStream(streamed);
    } on Exception catch (error) {
      throw ApiException(
        'Không kết nối được máy chủ ET.TEE. Kiểm tra địa chỉ API và kết nối mạng. ($error)',
      );
    }

    dynamic decoded;
    if (response.body.isNotEmpty) {
      try {
        decoded = jsonDecode(utf8.decode(response.bodyBytes));
      } on FormatException {
        decoded = response.body;
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map
          ? decoded['message'] ?? decoded['error'] ?? decoded['detail']
          : null;
      throw ApiException(
        message?.toString() ??
            'Yêu cầu thất bại (${response.statusCode}). Vui lòng thử lại.',
        statusCode: response.statusCode,
      );
    }
    if (decoded is Map && decoded['success'] == false) {
      throw ApiException(
        decoded['message']?.toString() ?? 'Máy chủ từ chối yêu cầu.',
      );
    }
    return decoded;
  }

  static Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  static Future<String?> readToken() => _storage.read(key: _tokenKey);

  static Future<void> clearToken() => _storage.delete(key: _tokenKey);
}

dynamic unwrapResponse(dynamic response) {
  if (response is Map && response.containsKey('data')) {
    return response['data'];
  }
  return response;
}

List<Map<String, dynamic>> extractItems(dynamic response) {
  dynamic value = unwrapResponse(response);
  for (var attempt = 0; attempt < 3; attempt++) {
    if (value is List) {
      return value
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }
    if (value is Map) {
      final map = Map<String, dynamic>.from(value);
      final key = [
        'items',
        'content',
        'results',
        'records',
      ].where(map.containsKey).firstOrNull;
      if (key == null) return [map];
      value = map[key];
      continue;
    }
    break;
  }
  return [];
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}
