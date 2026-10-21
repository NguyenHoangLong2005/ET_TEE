import '../../domain/entities/order.dart';
import '../../domain/repositories/sales_repository.dart';
import '../datasources/remote/sales_remote_datasource.dart';

class SalesRepositoryImpl implements SalesRepository {
  SalesRepositoryImpl(this._remote);

  final SalesRemoteDataSource _remote;

  @override
  Future<List<Order>> getNewOrders() => _remote.getNewOrders();

  @override
  Future<List<Order>> getAllOrders() => _remote.getAllOrders();

  @override
  Future<Order> getOrderDetail(int orderId) => _remote.getOrderDetail(orderId);

  @override
  Future<List<Order>> getSlaWarnings() => _remote.getSlaWarnings();

  @override
  Future<Order> verifyOrder(
    int orderId, {
    required String customerName,
    required String phone,
    required String shippingAddress,
  }) =>
      _remote.verifyOrder(
        orderId,
        customerName: customerName,
        phone: phone,
        shippingAddress: shippingAddress,
      );

  @override
  Future<Order> confirmOrder(int orderId) => _remote.confirmOrder(orderId);

  @override
  Future<void> cancelOrder(int orderId, String reason) =>
      _remote.cancelOrder(orderId, reason);

  @override
  Future<void> addNote(int orderId, String content) {
    // Default userId - should be replaced with actual user ID from auth
    return _remote.addNote(orderId, content, 'staff');
  }

  @override
  Future<List<OrderNote>> listNotes(int orderId) => _remote.listNotes(orderId);

  @override
  Future<void> requestHold(int orderId, int productId, int quantity) =>
      _remote.requestHold(orderId, productId, quantity);

  @override
  Future<List<String>> allowedTransitions(int orderId) =>
      _remote.allowedTransitions(orderId);

  // New methods
  @override
  Future<Map<String, dynamic>> getDashboard() => _remote.getDashboard();

  @override
  Future<Map<String, dynamic>> getOrdersPage({
    int page = 0,
    int size = 15,
    String filter = 'all',
    String? q,
  }) =>
      _remote.getOrdersPage(page: page, size: size, filter: filter, q: q);

  @override
  Future<Map<String, dynamic>> getOrderStatusInfo(int orderId) =>
      _remote.getOrderStatusInfo(orderId);

  @override
  Future<List<Map<String, dynamic>>> getOrderHistory(int orderId) =>
      _remote.getOrderHistory(orderId);

  @override
  Future<Order> createOrder(Map<String, dynamic> payload) =>
      _remote.createOrder(payload);

  @override
  Future<void> confirmBankTransfer(int orderId) =>
      _remote.confirmBankTransfer(orderId);

  @override
  Future<void> addNoteWithUserId(int orderId, String content, String userId) =>
      _remote.addNote(orderId, content, userId);

  @override
  Future<List<Map<String, dynamic>>> getAllStatuses() =>
      _remote.getAllStatuses();

  @override
  Future<Map<String, dynamic>> getStatusDisplay(String status) =>
      _remote.getStatusDisplay(status);
}