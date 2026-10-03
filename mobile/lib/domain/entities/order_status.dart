/// Mirrors com.nguyenhoanglong.entity.OrderStatus
enum OrderStatus {
  draft('DRAFT', 'Nháp'),
  pendingPayment('PENDING_PAYMENT', 'Chờ thanh toán'),
  pendingConfirmation('PENDING_CONFIRMATION', 'Chờ xác nhận'),
  confirmed('CONFIRMED', 'Đã xác nhận'),
  picking('PICKING', 'Đang soạn hàng'),
  packed('PACKED', 'Đã đóng gói'),
  handedToCarrier('HANDED_TO_CARRIER', 'Đã bàn giao'),
  shipping('SHIPPING', 'Đang vận chuyển'),
  delivered('DELIVERED', 'Đã giao'),
  cancelled('CANCELLED', 'Đã hủy'),
  returnRequested('RETURN_REQUESTED', 'Yêu cầu trả hàng'),
  returned('RETURNED', 'Đã trả hàng'),
  refunded('REFUNDED', 'Đã hoàn tiền');

  const OrderStatus(this.wireName, this.label);

  final String wireName;
  final String label;

  static OrderStatus fromWire(String value) =>
      OrderStatus.values.firstWhere(
        (s) => s.wireName == value,
        orElse: () => OrderStatus.draft,
      );
}

/// Mirrors ShipmentStatus
enum ShipmentStatus {
  pending('PENDING', 'Chờ lấy'),
  handedOver('HANDED_OVER', 'Đã bàn giao'),
  inTransit('IN_TRANSIT', 'Đang giao'),
  delivered('DELIVERED', 'Đã giao'),
  exception('EXCEPTION', 'Ngoại lệ'),
  returned('RETURNED', 'Trả lại');

  const ShipmentStatus(this.wireName, this.label);

  final String wireName;
  final String label;

  static ShipmentStatus fromWire(String value) =>
      ShipmentStatus.values.firstWhere(
        (s) => s.wireName == value,
        orElse: () => ShipmentStatus.pending,
      );
}

/// Mirrors ReservationStatus
enum ReservationStatus {
  pending('PENDING', 'Chờ duyệt'),
  approved('APPROVED', 'Đã duyệt'),
  rejected('REJECTED', 'Đã từ chối'),
  released('RELEASED', 'Đã giải phóng'),
  expired('EXPIRED', 'Đã hết hạn');

  const ReservationStatus(this.wireName, this.label);

  final String wireName;
  final String label;

  static ReservationStatus fromWire(String value) =>
      ReservationStatus.values.firstWhere(
        (s) => s.wireName == value,
        orElse: () => ReservationStatus.pending,
      );
}