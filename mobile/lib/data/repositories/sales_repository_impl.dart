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
  Future<void> addNote(int orderId, String content) =>
      _remote.addNote(orderId, content);

  @override
  Future<List<OrderNote>> listNotes(int orderId) => _remote.listNotes(orderId);

  @override
  Future<void> requestHold(int orderId, int productId, int quantity) =>
      _remote.requestHold(orderId, productId, quantity);

  @override
  Future<List<String>> allowedTransitions(int orderId) =>
      _remote.allowedTransitions(orderId);
}