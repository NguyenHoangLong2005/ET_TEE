import 'package:equatable/equatable.dart';

class Order extends Equatable {
  const Order({
    required this.id,
    required this.orderCode,
    required this.status,
    this.customerName,
    this.phone,
    this.address,
    this.totalAmount,
    this.slaDeadline,
    this.note,
    this.isCod = false,
    this.items = const [],
  });

  final int id;
  final String orderCode;
  final String status;
  final String? customerName;
  final String? phone;
  final String? address;
  final double? totalAmount;
  final DateTime? slaDeadline;
  final String? note;
  final bool isCod;
  final List<OrderLine> items;

  bool get isSlaBreached {
    final deadline = slaDeadline;
    if (deadline == null) return false;
    return DateTime.now().isAfter(deadline);
  }

  Duration? get slaRemaining {
    final deadline = slaDeadline;
    if (deadline == null) return null;
    return deadline.difference(DateTime.now());
  }

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: (json['id'] as num).toInt(),
        orderCode: json['orderCode'] as String? ?? '',
        status: json['status'] as String? ?? '',
        customerName: json['customerName'] as String?,
        phone: (json['customerPhone'] ?? json['phone']) as String?,
        address: (json['shippingAddressSnapshot'] ??
            json['shippingAddress'] ??
            json['address']) as String?,
        totalAmount: (json['totalAmount'] as num?)?.toDouble(),
        slaDeadline: json['slaDeadline'] == null
            ? null
            : DateTime.parse(json['slaDeadline'] as String),
        note: json['note'] as String?,
        isCod: json['paymentMethod'] == 'COD' || json['isCod'] == true,
        items: (json['items'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(OrderLine.fromJson)
            .toList(),
      );

  @override
  List<Object?> get props => [id, orderCode, status, totalAmount, items];
}

class OrderLine {
  const OrderLine({
    required this.productId,
    required this.productName,
    required this.quantity,
    this.variantId,
    this.color,
    this.size,
  });

  final int productId;
  final String productName;
  final int quantity;
  final int? variantId;
  final String? color;
  final String? size;

  factory OrderLine.fromJson(Map<String, dynamic> json) {
    final product = json['product'];
    final productId = (json['productId'] as num?)?.toInt() ??
        (product is Map ? (product['id'] as num?)?.toInt() : null) ??
        0;
    return OrderLine(
      productId: productId,
      productName: (json['productNameSnapshot'] ??
              json['productName'] ??
              (product is Map ? product['name'] : null)) as String? ??
          'Sản phẩm #$productId',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      variantId: (json['variantId'] as num?)?.toInt(),
      color: (json['colorSnapshot'] ?? json['color']) as String?,
      size: (json['sizeSnapshot'] ?? json['size']) as String?,
    );
  }
}
