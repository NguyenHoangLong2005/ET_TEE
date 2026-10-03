import '../entities/order_status.dart';

abstract class ShippingRepository {
  Future<List<ReadyPackage>> getReadyOrders();

  Future<List<Shipment>> getShipments({String? status});

  Future<Shipment> createShipment(Map<String, dynamic> payload);

  Future<Shipment> attachTrackingCode(int shipmentId, String trackingCode);

  Future<void> confirmHandover(int shipmentId, Map<String, dynamic> payload);

  Future<void> markShipping(int shipmentId);

  Future<List<ShippingException>> getExceptions({String? status});

  Future<void> createException(Map<String, dynamic> payload);

  Future<void> resolveException(int id, Map<String, dynamic> payload);

  Future<void> submitProofOfDelivery(int shipmentId, PodProof proof);

  Future<List<CodSummary>> getCodSummary();

  Future<CodReconciliation> reconcile(Map<String, dynamic> payload);

  Future<List<CodReconciliation>> listReconciliations({int page = 0, int size = 20});
}

class ReadyPackage {
  const ReadyPackage({
    required this.orderId,
    required this.orderCode,
    this.customerName,
    this.phone,
    this.address,
    this.itemCount = 0,
    this.isCod = false,
    this.codAmount,
  });

  final int orderId;
  final String orderCode;
  final String? customerName;
  final String? phone;
  final String? address;
  final int itemCount;
  final bool isCod;
  final double? codAmount;

  factory ReadyPackage.fromJson(Map<String, dynamic> json) => ReadyPackage(
        orderId: (json['orderId'] as num?)?.toInt() ?? 0,
        orderCode: json['orderCode'] as String? ?? '',
        customerName: json['customerName'] as String?,
        phone: json['phone'] as String?,
        address: json['address'] as String?,
        itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
        isCod: json['isCod'] == true || json['paymentMethod'] == 'COD',
        codAmount: (json['codAmount'] as num?)?.toDouble(),
      );
}

class Shipment {
  const Shipment({
    required this.id,
    required this.status,
    this.orderId,
    this.trackingCode,
    this.carrierName,
    this.codAmount,
  });

  final int id;
  final ShipmentStatus status;
  final int? orderId;
  final String? trackingCode;
  final String? carrierName;
  final double? codAmount;

  factory Shipment.fromJson(Map<String, dynamic> json) => Shipment(
        id: json['id'] as int,
        status: ShipmentStatus.fromWire(json['status'] as String? ?? ''),
        orderId: (json['orderId'] as num?)?.toInt(),
        trackingCode: json['trackingCode'] as String?,
        carrierName: json['carrierName'] as String?,
        codAmount: (json['codAmount'] as num?)?.toDouble(),
      );
}

class ShippingException {
  const ShippingException({
    required this.id,
    required this.type,
    required this.status,
    this.shipmentId,
    this.note,
    this.occurredAt,
  });

  final int id;
  final String type;
  final String status;
  final int? shipmentId;
  final String? note;
  final DateTime? occurredAt;

  factory ShippingException.fromJson(Map<String, dynamic> json) =>
      ShippingException(
        id: json['id'] as int,
        type: json['type'] as String? ?? '',
        status: json['status'] as String? ?? '',
        shipmentId: (json['shipmentId'] as num?)?.toInt(),
        note: json['note'] as String?,
        occurredAt: json['occurredAt'] == null
            ? null
            : DateTime.parse(json['occurredAt'] as String),
      );
}

class PodProof {
  const PodProof({
    required this.receiverName,
    required this.imagePaths,
    this.note,
    this.latitude,
    this.longitude,
  });

  final String receiverName;
  final List<String> imagePaths;
  final String? note;
  final double? latitude;
  final double? longitude;

  Map<String, dynamic> toJson() => {
        'receiverName': receiverName,
        if (imagePaths.isNotEmpty) 'imagePaths': imagePaths,
        if (note != null) 'note': note,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      };
}

class CodSummary {
  const CodSummary({
    required this.totalAmount,
    required this.itemCount,
    this.byStatus = const {},
  });

  final double totalAmount;
  final int itemCount;
  final Map<String, int> byStatus;

  factory CodSummary.fromJson(Map<String, dynamic> json) => CodSummary(
        totalAmount: (json['totalCodAmount'] as num?)?.toDouble() ?? 0,
        itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
        byStatus: (json['byStatus'] as Map<String, dynamic>? ?? {})
            .map((k, v) => MapEntry(k, (v as num).toInt())),
      );
}

class CodReconciliation {
  const CodReconciliation({
    required this.id,
    required this.reconciliationCode,
    required this.totalCodAmount,
    required this.reconciledAt,
    this.reconciledByName,
    this.status,
  });

  final int id;
  final String reconciliationCode;
  final double totalCodAmount;
  final DateTime? reconciledAt;
  final String? reconciledByName;
  final String? status;

  factory CodReconciliation.fromJson(Map<String, dynamic> json) =>
      CodReconciliation(
        id: json['id'] as int,
        reconciliationCode: json['reconciliationCode'] as String? ?? '',
        totalCodAmount: (json['totalCodAmount'] as num?)?.toDouble() ?? 0,
        reconciledAt: json['reconciledAt'] == null
            ? null
            : DateTime.parse(json['reconciledAt'] as String),
        reconciledByName: json['reconciledByName'] as String?,
        status: json['status'] as String?,
      );
}