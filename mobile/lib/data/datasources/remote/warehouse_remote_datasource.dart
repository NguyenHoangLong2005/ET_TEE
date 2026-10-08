import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../domain/repositories/warehouse_repository.dart';

class WarehouseRemoteDataSource {
  WarehouseRemoteDataSource(this._api);

  final ApiClient _api;

  String get _base => AppConfig.warehouseBase;

  // ─── Ton kho ────────────────────────────────────────────────────────────────

  Future<List<InventoryItem>> getInventory() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/inventory',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => InventoryItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<InboundOrder>> getInboundHistory() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/inbound',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => InboundOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ─── Don can xu ly ──────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getWarehouseOrders() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/orders',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.cast<Map<String, dynamic>>();
  }

  // ─── Nhap kho / kiem dem / vi tri ──────────────────────────────────────────

  Future<InventoryItem> inbound({
    required int productId,
    required String productName,
    required int quantity,
    String? location,
    int? variantId,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '$_base/inbound',
      body: {
        'productId': productId,
        'productName': productName,
        'quantity': quantity,
        'location': location,
        if (variantId != null) 'variantId': variantId,
      },
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return InventoryItem.fromJson(data);
  }

  Future<List<Map<String, dynamic>>> getCatalogProducts() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/products',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.cast<Map<String, dynamic>>();
  }

  Future<List<ProductVariantOption>> getProductVariants(int productId) async {
    final data = await _api.get<List<dynamic>>(
      '$_base/products/$productId/variants',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => ProductVariantOption.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> countInbound(
    int inventoryId,
    int actualQuantity,
  ) async {
    return _api.post<Map<String, dynamic>>(
      '$_base/inbound/$inventoryId/count',
      body: {'actualQuantity': actualQuantity},
      parse: (raw) => raw as Map<String, dynamic>,
    );
  }

  Future<InventoryItem> updateLocation(int inventoryId, String location) async {
    final data = await _api.put<Map<String, dynamic>>(
      '$_base/inventory/$inventoryId/location',
      body: {'location': location},
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return InventoryItem.fromJson(data);
  }

  // ─── Dieu chinh ton kho (can duyet) ────────────────────────────────────────

  Future<List<InventoryAdjustment>> getAdjustments() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/adjustments',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => InventoryAdjustment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<InventoryAdjustment> createAdjustment(
    int inventoryId, {
    required int difference,
    required String reason,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '$_base/inventory/$inventoryId/adjustments',
      body: {'difference': difference, 'reason': reason},
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return InventoryAdjustment.fromJson(data);
  }

  // ─── Giu hang cho don ──────────────────────────────────────────────────────

  Future<List<StockReservation>> getReservations() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/reservations',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => StockReservation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> approveReservation(String reservationId) async {
    await _api.post<dynamic>('$_base/reservations/$reservationId/approve');
  }

  Future<void> rejectReservation(String reservationId, String reason) async {
    await _api.post<dynamic>(
      '$_base/reservations/$reservationId/reject',
      body: {'reason': reason},
    );
  }

  // ─── Picking / Packing / Tem ──────────────────────────────────────────────

  Future<void> startPicking(int orderId) async {
    await _api.post<dynamic>('$_base/orders/$orderId/picking');
  }

  Future<void> completePicking(int orderId) async {
    await _api.post<dynamic>('$_base/orders/$orderId/picking/complete');
  }

  Future<Map<String, dynamic>> getLabelInfo(int orderId) async {
    return _api.get<Map<String, dynamic>>(
      '$_base/orders/$orderId/label',
      parse: (raw) => raw as Map<String, dynamic>,
    );
  }

  Future<void> handover(int orderId) async {
    await _api.post<dynamic>('$_base/orders/$orderId/handover');
  }

  // ─── Kiem ke ──────────────────────────────────────────────────────────────

  Future<List<Stocktake>> getStocktakes() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/stocktakes',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => Stocktake.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Stocktake> createStocktake({
    required String warehouseLocation,
    required int createdBy,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '$_base/stocktakes',
      body: {'warehouseLocation': warehouseLocation, 'createdBy': createdBy},
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Stocktake.fromJson(data);
  }

  Future<Stocktake> submitStocktake(int id, int actualQuantity) async {
    final data = await _api.put<Map<String, dynamic>>(
      '$_base/stocktakes/$id',
      body: {'actualQuantity': actualQuantity},
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Stocktake.fromJson(data);
  }

  // ─── De xuat nhap them ─────────────────────────────────────────────────────

  Future<List<ReplenishmentItem>> getReplenishment() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/replenishment',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => ReplenishmentItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> proposeRestock({
    required int inventoryId,
    required int quantity,
    String? note,
  }) async {
    await _api.post<dynamic>(
      '$_base/replenishment',
      body: {'inventoryId': inventoryId, 'quantity': quantity, 'note': note},
    );
  }

  Future<List<Map<String, dynamic>>> getRestockRequests() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/replenishment/requests',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.cast<Map<String, dynamic>>();
  }
}
