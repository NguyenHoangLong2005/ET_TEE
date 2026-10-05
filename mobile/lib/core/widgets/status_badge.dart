import 'package:flutter/material.dart';

import '../../domain/entities/order_status.dart';

/// Badge trạng thái dùng chung cho OrderStatus và ShipmentStatus.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, required this.color});

  StatusBadge.order(OrderStatus status, {super.key})
      : label = status.label,
        color = _fromOrder(status);

  StatusBadge.shipment(ShipmentStatus status, {super.key})
      : label = status.label,
        color = _fromShipment(status);

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  static Color _fromOrder(OrderStatus s) => switch (s) {
        OrderStatus.draft => Colors.grey,
        OrderStatus.pendingPayment => Colors.orange,
        OrderStatus.pendingConfirmation => Colors.blue,
        OrderStatus.confirmed => Colors.indigo,
        OrderStatus.picking => Colors.amber,
        OrderStatus.packed => Colors.purple,
        OrderStatus.handedToCarrier => Colors.teal,
        OrderStatus.shipping => Colors.cyan,
        OrderStatus.delivered => Colors.green,
        OrderStatus.cancelled ||
        OrderStatus.returnRequested ||
        OrderStatus.returned ||
        OrderStatus.refunded =>
          Colors.red,
      };

  static Color _fromShipment(ShipmentStatus s) => switch (s) {
        ShipmentStatus.pending => Colors.grey,
        ShipmentStatus.handedOver => Colors.teal,
        ShipmentStatus.inTransit => Colors.cyan,
        ShipmentStatus.delivered => Colors.green,
        ShipmentStatus.exception => Colors.red,
        ShipmentStatus.returned => Colors.orange,
      };
}