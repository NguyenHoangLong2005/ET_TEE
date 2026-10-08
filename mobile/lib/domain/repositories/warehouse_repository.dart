abstract class WarehouseRepository {
  Future<List<InventoryItem>> getInventory();

  Future<List<InboundOrder>> getInboundHistory();

  Future<List<Map<String, dynamic>>> getWarehouseOrders();

  Future<List<Map<String, dynamic>>> getCatalogProducts();

  Future<List<ProductVariantOption>> getProductVariants(int productId);

  Future<InventoryItem> inbound({
    required int productId,
    required String productName,
    required int quantity,
    String? location,
    int? variantId,
  });

  Future<Map<String, dynamic>> countInbound(
    int inventoryId,
    int actualQuantity,
  );

  Future<InventoryItem> updateLocation(int inventoryId, String location);

  Future<List<InventoryAdjustment>> getAdjustments();

  Future<InventoryAdjustment> createAdjustment(
    int inventoryId, {
    required int difference,
    required String reason,
  });

  Future<List<StockReservation>> getReservations();

  Future<void> approveReservation(String reservationId);

  Future<void> rejectReservation(String reservationId, String reason);

  Future<void> startPicking(int orderId);

  Future<void> completePicking(int orderId);

  Future<Map<String, dynamic>> getLabelInfo(int orderId);

  Future<void> handover(int orderId);

  Future<List<Stocktake>> getStocktakes();

  Future<Stocktake> createStocktake({
    required String warehouseLocation,
    required int createdBy,
  });

  Future<Stocktake> submitStocktake(int id, int actualQuantity);

  Future<List<ReplenishmentItem>> getReplenishment();

  Future<void> proposeRestock({
    required int inventoryId,
    required int quantity,
    String? note,
  });

  Future<List<Map<String, dynamic>>> getRestockRequests();
}

class InventoryItem {
  const InventoryItem({
    required this.id,
    required this.productId,
    required this.productName,
    this.warehouseLocation,
    this.quantityOnHand = 0,
    this.quantityReserved = 0,
    this.reorderLevel = 10,
  });

  final int id;
  final int productId;
  final String productName;
  final String? warehouseLocation;
  final int quantityOnHand;
  final int quantityReserved;
  final int reorderLevel;

  int get available => quantityOnHand - quantityReserved;

  bool get isLowStock => available <= reorderLevel;

  factory InventoryItem.fromJson(Map<String, dynamic> json) => InventoryItem(
        id: (json['id'] as num?)?.toInt() ?? 0,
        productId: (json['productId'] as num?)?.toInt() ?? 0,
        productName: json['productName'] as String? ?? '',
        warehouseLocation: json['warehouseLocation'] as String?,
        quantityOnHand: (json['quantityOnHand'] as num?)?.toInt() ?? 0,
        quantityReserved: (json['quantityReserved'] as num?)?.toInt() ?? 0,
        reorderLevel: (json['reorderLevel'] as num?)?.toInt() ?? 10,
      );
}

class ProductVariantOption {
  const ProductVariantOption({
    required this.id,
    this.sku,
    this.color,
    this.size,
    this.availableQuantity,
  });

  final int id;
  final String? sku;
  final String? color;
  final String? size;
  final int? availableQuantity;

  String get label {
    final attributes =
        [color, size].whereType<String>().where((v) => v.isNotEmpty);
    final text = attributes.join(' / ');
    return text.isEmpty ? (sku ?? 'Biến thể #$id') : text;
  }

  factory ProductVariantOption.fromJson(Map<String, dynamic> json) =>
      ProductVariantOption(
        id: (json['id'] as num?)?.toInt() ?? 0,
        sku: json['sku'] as String?,
        color: json['color'] as String?,
        size: json['size'] as String?,
        availableQuantity: (json['availableQuantity'] as num?)?.toInt(),
      );
}

class InboundOrder {
  const InboundOrder({
    required this.id,
    required this.status,
    this.productName,
    this.quantity,
    this.location,
    this.supplier,
    this.note,
    this.createdAt,
  });

  final int id;
  final String status;
  final String? productName;
  final int? quantity;
  final String? location;
  final String? supplier;
  final String? note;
  final DateTime? createdAt;

  factory InboundOrder.fromJson(Map<String, dynamic> json) => InboundOrder(
        id: (json['id'] as num?)?.toInt() ?? 0,
        status: json['status'] as String? ?? '',
        productName: json['productName'] as String?,
        quantity: (json['quantity'] as num?)?.toInt(),
        location:
            json['location'] as String? ?? json['warehouseLocation'] as String?,
        supplier: json['supplier'] as String?,
        note: json['note'] as String?,
        createdAt: json['createdAt'] == null
            ? null
            : DateTime.tryParse('${json['createdAt']}'),
      );
}

class InventoryAdjustment {
  const InventoryAdjustment({
    required this.id,
    required this.status,
    required this.reason,
    this.difference = 0,
    this.requestedByName,
    this.approvedByName,
    this.createdAt,
  });

  final int id;
  final String status;
  final String reason;
  final int difference;
  final String? requestedByName;
  final String? approvedByName;
  final DateTime? createdAt;

  bool get isPending => status == 'PENDING';

  factory InventoryAdjustment.fromJson(Map<String, dynamic> json) =>
      InventoryAdjustment(
        id: (json['id'] as num?)?.toInt() ?? 0,
        status: json['status'] as String? ?? '',
        reason: json['reason'] as String? ?? '',
        difference: (json['difference'] as num?)?.toInt() ?? 0,
        requestedByName: json['requestedByName'] as String?,
        approvedByName: json['approvedByName'] as String?,
        createdAt: json['createdAt'] == null
            ? null
            : DateTime.tryParse('${json['createdAt']}'),
      );
}

class StockReservation {
  const StockReservation({
    required this.id,
    required this.orderId,
    required this.status,
    this.productName,
    this.quantity = 0,
    this.rejectReason,
  });

  final int id;
  final int orderId;
  final String status;
  final String? productName;
  final int quantity;
  final String? rejectReason;

  bool get isPending => status == 'PENDING';

  factory StockReservation.fromJson(Map<String, dynamic> json) =>
      StockReservation(
        id: (json['id'] as num?)?.toInt() ?? 0,
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
    this.warehouseLocation,
    this.createdAt,
  });

  final int id;
  final String status;
  final String? warehouseLocation;
  final DateTime? createdAt;

  factory Stocktake.fromJson(Map<String, dynamic> json) => Stocktake(
        id: (json['id'] as num?)?.toInt() ?? 0,
        status: json['status'] as String? ?? '',
        warehouseLocation: json['warehouseLocation'] as String?,
        createdAt: json['createdAt'] == null
            ? null
            : DateTime.tryParse('${json['createdAt']}'),
      );
}

class ReplenishmentItem {
  const ReplenishmentItem({
    required this.id,
    required this.productName,
    required this.available,
    required this.reorderLevel,
  });

  final int id;
  final String productName;
  final int available;
  final int reorderLevel;

  factory ReplenishmentItem.fromJson(Map<String, dynamic> json) =>
      ReplenishmentItem(
        id: (json['id'] as num?)?.toInt() ?? 0,
        productName: json['productName'] as String? ?? '',
        available: ((json['quantityOnHand'] as num?)?.toInt() ?? 0) -
            ((json['quantityReserved'] as num?)?.toInt() ?? 0),
        reorderLevel: (json['reorderLevel'] as num?)?.toInt() ?? 10,
      );
}
