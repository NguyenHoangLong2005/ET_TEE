import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../domain/entities/order.dart';
import '../../../domain/repositories/sales_repository.dart';

class SalesRemoteDataSource {
  SalesRemoteDataSource(this._api);

  final ApiClient _api;

  String get _base => AppConfig.salesBase;

  Future<Map<String, dynamic>> getDashboard() async {
    return _api.get<Map<String, dynamic>>(
      '$_base/dashboard',
      parse: (raw) => raw as Map<String, dynamic>,
    );
  }

  Future<Map<String, dynamic>> getOrdersPage({
    int page = 0,
    int size = 15,
    String filter = 'all',
    String? q,
  }) async {
    return _api.get<Map<String, dynamic>>(
      '$_base/orders/page',
      query: {
        'page': page,
        'size': size,
        'filter': filter,
        if (q != null) 'q': q,
      },
      parse: (raw) => raw as Map<String, dynamic>,
    );
  }

  Future<List<Order>> getAllOrders() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/orders',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Order>> getNewOrders() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/orders/new',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Backend hien tai tra danh sach don moi thay vi canh bao SLA that
  /// (StaffSalesController.slaWarnings -> SalesOrderService.getNewOrders).
  Future<List<Order>> getSlaWarnings() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/sla',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Order> getOrderDetail(int orderId) async {
    final data = await _api.get<Map<String, dynamic>>(
      '$_base/orders/$orderId',
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Order.fromJson(data);
  }

  Future<Map<String, dynamic>> getOrderStatusInfo(int orderId) async {
    return _api.get<Map<String, dynamic>>(
      '$_base/orders/$orderId/status-info',
      parse: (raw) => raw as Map<String, dynamic>,
    );
  }

  Future<List<Map<String, dynamic>>> getOrderHistory(int orderId) async {
    final data = await _api.get<List<dynamic>>(
      '$_base/orders/$orderId/history',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.cast<Map<String, dynamic>>();
  }

  Future<Order> verifyOrder(
    int orderId, {
    required String customerName,
    required String phone,
    required String shippingAddress,
  }) async {
    final data = await _api.put<Map<String, dynamic>>(
      '$_base/orders/$orderId/verify',
      body: {
        'customerName': customerName,
        'phone': phone,
        'shippingAddress': shippingAddress,
      },
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Order.fromJson(data);
  }

  Future<Order> createOrder(Map<String, dynamic> payload) async {
    final data = await _api.post<Map<String, dynamic>>(
      '$_base/orders',
      body: payload,
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Order.fromJson(data);
  }

  Future<Order> confirmOrder(int orderId) async {
    final data = await _api.post<Map<String, dynamic>>(
      '$_base/orders/$orderId/confirm',
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Order.fromJson(data);
  }

  Future<void> confirmBankTransfer(int orderId) async {
    await _api.post<dynamic>('$_base/orders/$orderId/confirm-payment');
  }

  Future<void> cancelOrder(int orderId, String reason) async {
    await _api.post<dynamic>(
      '$_base/orders/$orderId/cancel',
      body: {'reason': reason},
    );
  }

  Future<void> addNote(int orderId, String content, String userId) async {
    await _api.post<dynamic>(
      '$_base/orders/$orderId/notes',
      body: {'content': content, 'userId': userId},
    );
  }

  Future<List<OrderNote>> listNotes(int orderId) async {
    final data = await _api.get<List<dynamic>>(
      '$_base/orders/$orderId/notes',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => OrderNote.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> requestHold(int orderId, int productId, int quantity) async {
    await _api.post<dynamic>(
      '$_base/orders/$orderId/reservations',
      body: {'productId': productId, 'quantity': quantity},
    );
  }

  Future<List<String>> allowedTransitions(int orderId) async {
    final data = await _api.get<List<dynamic>>(
      '$_base/orders/$orderId/transitions',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.map((e) => '$e').toList();
  }

  Future<List<Map<String, dynamic>>> getAllStatuses() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/statuses',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> getStatusDisplay(String status) async {
    return _api.get<Map<String, dynamic>>(
      '$_base/statuses/$status/display',
      parse: (raw) => raw as Map<String, dynamic>,
    );
  }
}