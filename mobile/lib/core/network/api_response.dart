import 'package:dio/dio.dart';

import '../error/app_exception.dart';

/// Backend wraps every response in ApiResponse<T>:
/// { success, message, data, timestamp }
class ApiResponse<T> {
  const ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.timestamp,
  });

  final bool success;
  final String message;
  final T? data;
  final String? timestamp;

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic raw) parse,
  ) {
    return ApiResponse<T>(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String? ?? '',
      data: json['data'] == null ? null : parse(json['data']),
      timestamp: json['timestamp']?.toString(),
    );
  }
}