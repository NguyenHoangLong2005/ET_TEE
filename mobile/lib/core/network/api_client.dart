import 'dart:io';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../error/app_exception.dart';
import 'api_response.dart';

class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

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

  Future<T> upload<T>(
    String path, {
    required File file,
    required String field,
    T Function(dynamic raw)? parse,
    void Function(int sent, int total)? onSendProgress,
  }) async {
    final form = FormData.fromMap({
      field: await MultipartFile.fromFile(file.path),
    });
    return _send<T>(
      () => _dio.post<dynamic>(
        path,
        data: form,
        onSendProgress: onSendProgress,
      ),
      parse,
    );
  }

  Future<T> _send<T>(
    Future<Response<dynamic>> Function() call,
    T Function(dynamic raw)? parse,
  ) async {
    try {
      final res = await call();
      final body = res.data;
      if (body is Map<String, dynamic>) {
        // Endpoint bọc ApiResponse: { success, message, data, timestamp }.
        final success = body['success'];
        if (success is bool) {
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
        // Auth + staff endpoint tra JSON thô, khong bóc ApiResponse.
        final raw = parse != null ? parse(body) : body;
        return raw as T;
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

  Future<void> setToken(String token) async =>
      _dio.options.headers['Authorization'] = 'Bearer $token';

  Future<void> clearToken() async =>
      _dio.options.headers.remove('Authorization');

  bool get isMobile => Platform.isAndroid || Platform.isIOS;
}
