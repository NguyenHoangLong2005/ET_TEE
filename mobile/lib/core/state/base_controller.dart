import 'package:flutter/foundation.dart';

import '../../core/error/app_exception.dart';

enum LoadStatus { idle, loading, ready, error }

/// Base cho cac controller cua 3 role. Moi man hinh co 1 controller,
/// cac thao tac ghi se giu nguyen ma hinh va hien loi bang SnackBar.
abstract class BaseController extends ChangeNotifier {
  LoadStatus _status = LoadStatus.idle;
  String? _errorMessage;

  LoadStatus get status => _status;
  String? get errorMessage => _errorMessage;
  bool get isLoading => _status == LoadStatus.loading;

  bool get hasError => _status == LoadStatus.error;

  @protected
  Future<void> run(Future<void> Function() action) async {
    _status = LoadStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      await action();
      _status = LoadStatus.ready;
    } on AppException catch (e) {
      _errorMessage = e.message;
      _status = LoadStatus.error;
    } catch (e) {
      _errorMessage = 'Lỗi không xác định: $e';
      _status = LoadStatus.error;
    }
    notifyListeners();
  }

  @protected
  void setError(String message) {
    _errorMessage = message;
    _status = LoadStatus.error;
    notifyListeners();
  }

  @protected
  void clearError() {
    if (_errorMessage == null && _status != LoadStatus.error) return;
    _errorMessage = null;
    _status = LoadStatus.idle;
    notifyListeners();
  }
}