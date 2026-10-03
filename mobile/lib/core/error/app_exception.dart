class AppException implements Exception {
  const AppException(this.message, {this.code, this.statusCode});

  final String message;
  final String? code;
  final int? statusCode;

  @override
  String toString() => 'AppException($code/$statusCode): $message';
}

class NetworkException extends AppException {
  const NetworkException(super.message) : super(code: 'NETWORK');
}

class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'Phiên đăng nhập đã hết hạn'])
      : super(code: 'UNAUTHORIZED', statusCode: 401);
}

class ForbiddenException extends AppException {
  const ForbiddenException([super.message = 'Bạn không có quyền thực hiện'])
      : super(code: 'FORBIDDEN', statusCode: 403);
}

class NotFoundException extends AppException {
  const NotFoundException([super.message = 'Không tìm thấy dữ liệu'])
      : super(code: 'NOT_FOUND', statusCode: 404);
}

class ValidationException extends AppException {
  const ValidationException(super.message, {this.fieldErrors})
      : super(code: 'VALIDATION', statusCode: 422);

  final Map<String, String>? fieldErrors;
}