import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_config.dart';
import '../error/app_exception.dart';
import 'api_response.dart';

class ApiClient {
  ApiClient(this._dio, this._storage);

  final Dio _dio;
  final FlutterSecureStorage _storage;

  static const _tokenKey = 'access_token';

  Future<T> get<T>(
    String path, {
    T Function(dynamic raw)? parse,
    Map<String, dynamic>? query,
  }) =>
      _send<T>(() => _dio.get<dynamic>(path, queryParameters: query), parse);

  Future<T> post<T>(
    String path, {
    Object? body,
    T Function(dynamic raw)? parse,
  }) =>
      _send<T>(() => _dio.post<dynamic>(path, data: body), parse);

  Future<T> put<T>(
    String path, {
    Object? body,
    T Function(dynamic raw)? parse,
  }) =>
      _send<T>(() => _dio.put<dynamic>(path, data: body), parse);

  Future<T> _send<T>(
    Future<Response<dynamic>> Function() call,
    T Function(dynamic raw)? parse,
  ) async {
    try {
      final res = await call();
      final body = res.data;
      if (body is Map<String, dynamic>) {
        final parsed = ApiResponse<dynamic>.fromJson(
          body,
          parse ?? (dynamic raw) => raw,
        );
        if (!parsed.success) {
          throw AppException(
            parsed.message,
            statusCode: res.statusCode,
          );
        }
        return parsed.data as T;
      }
      return body as T;
    } on DioException catch (e) {
      throw _map(e);
    }
  }

  AppException _map(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.connectionError:
        return const NetworkException('Không kết nối được tới máy chủ');
      case DioExceptionType.badResponse:
        final status = e.response?.statusCode ?? 0;
        final msg = e.response?.data is Map
            ? (e.response!.data as Map)['message']?.toString()
            : null;
        if (status == 401) return UnauthorizedException(msg ?? '');
        if (status == 403) return ForbiddenException(msg ?? '');
        if (status == 404) return NotFoundException(msg ?? '');
        return AppException(msg ?? 'Lỗi $status', statusCode: status);
      case DioExceptionType.cancel:
        return const AppException('Yêu cầu đã bị hủy');
      default:
        return AppException(e.message ?? 'Lỗi không xác định');
    }
  }

  static Dio createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Content-Type': 'application/json'},
      ),
    );
    return dio;
  }

  Future<void> setToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  bool get isMobile => Platform.isAndroid || Platform.isIOS;
}