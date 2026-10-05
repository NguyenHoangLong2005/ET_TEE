import '../entities/order.dart';

abstract class SalesRepository {
  Future<List<Order>> getNewOrders();

  Future<List<Order>> getAllOrders();

  Future<Order> getOrderDetail(int orderId);

  /// Backend hien tai tra danh sach don moi cho /sla, khong phai canh bao SLA.
  Future<List<Order>> getSlaWarnings();

  Future<Order> verifyOrder(
    int orderId, {
    required String customerName,
    required String phone,
    required String shippingAddress,
  });

  Future<Order> confirmOrder(int orderId);

  Future<void> cancelOrder(int orderId, String reason);

  Future<void> addNote(int orderId, String content);

  Future<List<OrderNote>> listNotes(int orderId);

  Future<void> requestHold(int orderId, int productId, int quantity);

  Future<List<String>> allowedTransitions(int orderId);
}

class OrderNote {
  const OrderNote({
    required this.id,
    required this.content,
    this.createdByName,
    this.createdAt,
  });

  final int id;
  final String content;
  final String? createdByName;
  final DateTime? createdAt;

  factory OrderNote.fromJson(Map<String, dynamic> json) => OrderNote(
        id: (json['id'] as num?)?.toInt() ?? 0,
        content: json['content'] as String? ?? '',
        createdByName: json['createdByName'] as String?,
        createdAt: json['createdAt'] == null
            ? null
            : DateTime.tryParse('${json['createdAt']}'),
      );
}