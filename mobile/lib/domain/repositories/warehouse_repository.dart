import '../entities/order.dart';

abstract class WarehouseRepository {
  Future<List<InventoryItem>> getInventory({String? query});

  Future<List<InboundOrder>> getInboundOrders();

  Future<InboundOrder> getInboundDetail(int id);

  Future<void> confirmInbound(int id, Map<String, dynamic> countPayload);

  Future<void> updateLocation(int inventoryId, String locationCode);

  Future<List<InventoryAdjustment>> getAdjustments({String? status});

  Future<void> createAdjustment(int inventoryId, Map<String, dynamic> payload);

  Future<void> approveAdjustment(int id);

  Future<List<StockReservation>> getReservations();

  Future<void> approveReservation(int id);

  Future<void> rejectReservation(int id, String reason);

  Future<void> startPicking(int orderId);

  Future<void> completePicking(int orderId);

  Future<void> pack(int orderId, Map<String, dynamic> payload);

  Future<void> saveLabel(int orderId);

  Future<String> labelUrl(int orderId);

  Future<void> handover(int orderId, Map<String, dynamic> payload);

  Future<List<Stocktake>> getStocktakes();

  Future<List<ReplenishmentItem>> getReplenishment();
}

class InventoryItem {
  const InventoryItem({
    required this.id,
    required this.productName,
    this.variantName,
    this.sku,
    this.locationCode,
    this.quantity = 0,
    this.reservedQuantity = 0,
  });

  final int id;
  final String productName;
  final String? variantName;
  final String? sku;
  final String? locationCode;
  final int quantity;
  final int reservedQuantity;

  int get available => quantity - reservedQuantity;

  factory InventoryItem.fromJson(Map<String, dynamic> json) => InventoryItem(
        id: json['id'] as int,
        productName: json['productName'] as String? ?? '',
        variantName: json['variantName'] as String?,
        sku: json['sku'] as String?,
        locationCode: json['locationCode'] as String?,
        quantity: (json['quantity'] as num?)?.toInt() ?? 0,
        reservedQuantity: (json['reservedQuantity'] as num?)?.toInt() ?? 0,
      );
}

class InboundOrder {
  const InboundOrder({
    required this.id,
    required this.inboundCode,
    required this.status,
    this.supplierName,
    this.expectedDate,
    this.lines = const [],
  });

  final int id;
  final String inboundCode;
  final String status;
  final String? supplierName;
  final DateTime? expectedDate;
  final List<InboundLine> lines;

  factory InboundOrder.fromJson(Map<String, dynamic> json) => InboundOrder(
        id: json['id'] as int,
        inboundCode: json['inboundCode'] as String? ?? '',
        status: json['status'] as String? ?? '',
        supplierName: json['supplierName'] as String?,
        expectedDate: json['expectedDate'] == null
            ? null
            : DateTime.parse(json['expectedDate'] as String),
        lines: (json['lines'] as List<dynamic>? ?? [])
            .map((e) => InboundLine.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class InboundLine {
  const InboundLine({
    required this.productName,
    required this.expectedQuantity,
    this.actualQuantity,
  });

  final String productName;
  final int expectedQuantity;
  final int? actualQuantity;

  int? get difference =>
      actualQuantity == null ? null : actualQuantity! - expectedQuantity;

  factory InboundLine.fromJson(Map<String, dynamic> json) => InboundLine(
        productName: json['productName'] as String? ?? '',
        expectedQuantity: (json['expectedQuantity'] as num?)?.toInt() ?? 0,
        actualQuantity: (json['actualQuantity'] as num?)?.toInt(),
      );
}

class InventoryAdjustment {
  const InventoryAdjustment({
    required this.id,
    required this.status,
    required this.reason,
    this.quantityDelta = 0,
    this.requestedByName,
    this.approvedByName,
  });

  final int id;
  final String status;
  final String reason;
  final int quantityDelta;
  final String? requestedByName;
  final String? approvedByName;

  factory InventoryAdjustment.fromJson(Map<String, dynamic> json) =>
      InventoryAdjustment(
        id: json['id'] as int,
        status: json['status'] as String? ?? '',
        reason: json['reason'] as String? ?? '',
        quantityDelta: (json['quantityDelta'] as num?)?.toInt() ?? 0,
        requestedByName: json['requestedByName'] as String?,
        approvedByName: json['approvedByName'] as String?,
      );
}

class StockReservation {
  const StockReservation({
    required this.reservationId,
    required this.orderId,
    required this.status,
    this.productName,
    this.quantity = 0,
    this.rejectReason,
  });

  final String reservationId;
  final int orderId;
  final String status;
  final String? productName;
  final int quantity;
  final String? rejectReason;

  factory StockReservation.fromJson(Map<String, dynamic> json) =>
      StockReservation(
        reservationId: json['reservationId']?.toString() ?? '',
        orderId: (json['orderId'] as num?)?.toInt() ?? 0,
        status: json['status'] as String? ?? '',
        productName: json['productName'] as String?,
        quantity: (json['quantity'] as num?)?.toInt() ?? 0,
        rejectReason: json['rejectReason'] as String?,
      );
}

class Stocktake {
  const Stocktake({
    required this.id,
    required this.status,
    this.locationCode,
    this.countedAt,
  });

  final int id;
  final String status;
  final String? locationCode;
  final DateTime? countedAt;

  factory Stocktake.fromJson(Map<String, dynamic> json) => Stocktake(
        id: json['id'] as int,
        status: json['status'] as String? ?? '',
        locationCode: json['locationCode'] as String?,
        countedAt: json['countedAt'] == null
            ? null
            : DateTime.parse(json['countedAt'] as String),
      );
}

class ReplenishmentItem {
  const ReplenishmentItem({
    required this.productName,
    required this.currentQuantity,
    required this.suggestedQuantity,
  });

  final String productName;
  final int currentQuantity;
  final int suggestedQuantity;

  factory ReplenishmentItem.fromJson(Map<String, dynamic> json) =>
      ReplenishmentItem(
        productName: json['productName'] as String? ?? '',
        currentQuantity: (json['currentQuantity'] as num?)?.toInt() ?? 0,
        suggestedQuantity: (json['suggestedQuantity'] as num?)?.toInt() ?? 0,
      );
}