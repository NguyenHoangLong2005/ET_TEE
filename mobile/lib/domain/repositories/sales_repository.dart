import '../entities/order.dart';

abstract class SalesRepository {
  Future<List<Order>> getNewOrders();

  Future<List<Order>> getSlaWarningOrders();

  Future<Order> getOrderDetail(int orderId);

  Future<Order> verifyOrder(int orderId, Map<String, dynamic> payload);

  Future<Order> confirmOrder(int orderId);

  Future<void> cancelOrder(int orderId, String reason);

  Future<void> addNote(int orderId, String content);

  Future<List<OrderNote>> listNotes(int orderId);

  Future<void> requestHold(int orderId, Map<String, dynamic> payload);
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
        id: json['id'] as int,
        content: json['content'] as String? ?? '',
        createdByName: json['createdByName'] as String?,
        createdAt: json['createdAt'] == null
            ? null
            : DateTime.parse(json['createdAt'] as String),
      );
}