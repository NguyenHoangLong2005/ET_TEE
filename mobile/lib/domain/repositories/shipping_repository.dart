import '../entities/order_status.dart';

abstract class ShippingRepository {
  Future<List<ReadyPackage>> getReadyPackages();

  Future<List<Shipment>> getShipments();

  Future<Shipment> getShipment(int id);

  Future<Shipment> createShipment({
    required int orderId,
    required String carrierName,
    String? trackingCode,
    double? codAmount,
  });

  Future<Shipment> attachTrackingCode(int shipmentId, String trackingCode);

  Future<void> confirmHandover(int shipmentId);

  Future<void> startShipping(int shipmentId);

  Future<List<ShippingException>> getExceptions();

  Future<void> createException({
    required int shipmentId,
    required String type,
    required String description,
  });

  Future<void> resolveException(
    int id, {
    String? note,
    bool returnToSender = false,
  });

  Future<void> submitProofOfDelivery(int shipmentId, PodProof proof);

  Future<List<PendingCod>> getPendingCod();

  Future<void> reconcileCod(int shipmentId);

  Future<List<CodReconciliation>> getReconciliations({int page = 0, int size = 20});

  Future<Map<String, dynamic>> getReconciliationDetail(int id);
}

class ReadyPackage {
  const ReadyPackage({
    required this.orderId,
    required this.orderCode,
    this.customerName,
    this.phone,
    this.shippingAddress,
    this.totalAmount,
    this.isCod = false,
    this.codAmount,
  });

  final int orderId;
  final String orderCode;
  final String? customerName;
  final String? phone;
  final String? shippingAddress;
  final double? totalAmount;
  final bool isCod;
  final double? codAmount;

  factory ReadyPackage.fromJson(Map<String, dynamic> json) {
    final payment = json['paymentMethod'] as String?;
    final isCod = json['isCod'] == true ||
        (payment != null && payment.toUpperCase() == 'COD');
    return ReadyPackage(
      orderId: (json['orderId'] as num?)?.toInt() ??
          (json['id'] as num?)?.toInt() ??
          0,
      orderCode: json['orderCode'] as String? ?? '',
      customerName: json['customerName'] as String?,
      phone: (json['phone'] ?? json['customerPhone']) as String?,
      shippingAddress: (json['shippingAddress'] ??
          json['shippingAddressSnapshot']) as String?,
      totalAmount: (json['totalAmount'] as num?)?.toDouble(),
      isCod: isCod,
      codAmount: (json['codAmount'] as num?)?.toDouble(),
    );
  }
}

class Shipment {
  const Shipment({
    required this.id,
    required this.status,
    this.orderId,
    this.orderCode,
    this.trackingCode,
    this.carrierName,
    this.codAmount,
    this.handoverAt,
    this.deliveredAt,
  });

  final int id;
  final ShipmentStatus status;
  final int? orderId;
  final String? orderCode;
  final String? trackingCode;
  final String? carrierName;
  final double? codAmount;
  final DateTime? handoverAt;
  final DateTime? deliveredAt;

  bool get isCod => (codAmount ?? 0) > 0;

  factory Shipment.fromJson(Map<String, dynamic> json) {
    final order = json['order'];
    return Shipment(
      id: (json['id'] as num?)?.toInt() ??
          (json['shipmentId'] as num?)?.toInt() ??
          0,
      status: ShipmentStatus.fromWire('${json['status'] ?? ''}'),
      orderId: order is Map
          ? (order['id'] as num?)?.toInt()
          : (json['orderId'] as num?)?.toInt(),
      orderCode: order is Map ? order['orderCode'] as String? : null,
      trackingCode: json['trackingCode'] as String?,
      carrierName: (json['carrierName'] ?? json['carrier']) as String?,
      codAmount: (json['codAmount'] as num?)?.toDouble(),
      handoverAt: json['handoverAt'] == null
          ? null
          : DateTime.tryParse('${json['handoverAt']}'),
      deliveredAt: json['deliveredAt'] == null
          ? null
          : DateTime.tryParse('${json['deliveredAt']}'),
    );
  }
}

class ShippingException {
  const ShippingException({
    required this.id,
    required this.type,
    required this.status,
    this.shipmentId,
    this.orderCode,
    this.description,
    this.occurredAt,
  });

  final int id;
  final String type;
  final String status;
  final int? shipmentId;
  final String? orderCode;
  final String? description;
  final DateTime? occurredAt;

  bool get isOpen => status != 'RESOLVED';

  factory ShippingException.fromJson(Map<String, dynamic> json) {
    final shipment = json['shipment'];
    return ShippingException(
      id: (json['id'] as num?)?.toInt() ?? 0,
      type: json['type'] as String? ?? '',
      status: json['status'] as String? ?? '',
      shipmentId: shipment is Map
          ? (shipment['id'] as num?)?.toInt()
          : (json['shipmentId'] as num?)?.toInt(),
      orderCode: json['orderCode'] as String?,
      description: (json['description'] ?? json['note']) as String?,
      occurredAt: (json['occurredAt'] ?? json['createdAt']) == null
          ? null
          : DateTime.tryParse('${json['occurredAt'] ?? json['createdAt']}'),
    );
  }
}

class PodProof {
  const PodProof({
    required this.receiverName,
    this.imageUrl,
    this.note,
  });

  final String receiverName;
  final String? imageUrl;
  final String? note;

  Map<String, dynamic> toJson() => {
        'receiverName': receiverName,
        if (imageUrl != null) 'imageUrl': imageUrl,
        if (note != null) 'note': note,
      };
}

class PendingCod {
  const PendingCod({
    required this.shipmentId,
    required this.codAmount,
    this.orderCode,
    this.carrierName,
    this.customerName,
  });

  final int shipmentId;
  final double codAmount;
  final String? orderCode;
  final String? carrierName;
  final String? customerName;

  factory PendingCod.fromJson(Map<String, dynamic> json) {
    final order = json['order'];
    return PendingCod(
      shipmentId: (json['shipmentId'] as num?)?.toInt() ??
          (json['id'] as num?)?.toInt() ??
          0,
      codAmount: (json['codAmount'] as num?)?.toDouble() ?? 0,
      orderCode: order is Map ? order['orderCode'] as String? : null,
      carrierName: (json['carrierName'] ?? json['carrier']) as String?,
      customerName: json['customerName'] as String?,
    );
  }
}

class CodReconciliation {
  const CodReconciliation({
    required this.id,
    required this.reconciliationCode,
    required this.totalCodAmount,
    this.status,
    this.reconciledByName,
    this.reconciledAt,
  });

  final int id;
  final String reconciliationCode;
  final double totalCodAmount;
  final String? status;
  final String? reconciledByName;
  final DateTime? reconciledAt;

  factory CodReconciliation.fromJson(Map<String, dynamic> json) =>
      CodReconciliation(
        id: (json['id'] as num?)?.toInt() ?? 0,
        reconciliationCode: json['reconciliationCode'] as String? ?? '',
        totalCodAmount: (json['totalCodAmount'] as num?)?.toDouble() ?? 0,
        status: json['status'] as String?,
        reconciledByName: json['reconciledByName'] as String?,
        reconciledAt: json['reconciledAt'] == null
            ? null
            : DateTime.tryParse('${json['reconciledAt']}'),
      );
}