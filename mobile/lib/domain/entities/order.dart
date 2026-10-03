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
        id: json['id'] as int,
        orderCode: json['orderCode'] as String? ?? '',
        status: json['status'] as String? ?? '',
        customerName: json['customerName'] as String?,
        phone: json['phone'] as String?,
        address: json['address'] as String?,
        totalAmount: (json['totalAmount'] as num?)?.toDouble(),
        slaDeadline: json['slaDeadline'] == null
            ? null
            : DateTime.parse(json['slaDeadline'] as String),
        note: json['note'] as String?,
        isCod: json['paymentMethod'] == 'COD' ||
            json['isCod'] == true,
      );

  @override
  List<Object?> get props => [id, orderCode, status, status];
}