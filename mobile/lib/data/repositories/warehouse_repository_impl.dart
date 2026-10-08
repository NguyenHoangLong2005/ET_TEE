import '../../domain/repositories/warehouse_repository.dart';
import '../datasources/remote/warehouse_remote_datasource.dart';

class WarehouseRepositoryImpl implements WarehouseRepository {
  WarehouseRepositoryImpl(this._remote);

  final WarehouseRemoteDataSource _remote;

  @override
  Future<List<InventoryItem>> getInventory() => _remote.getInventory();

  @override
  Future<List<InboundOrder>> getInboundHistory() => _remote.getInboundHistory();

  @override
  Future<List<Map<String, dynamic>>> getWarehouseOrders() =>
      _remote.getWarehouseOrders();

  @override
  Future<List<Map<String, dynamic>>> getCatalogProducts() =>
      _remote.getCatalogProducts();

  @override
  Future<List<ProductVariantOption>> getProductVariants(int productId) =>
      _remote.getProductVariants(productId);

  @override
  Future<InventoryItem> inbound({
    required int productId,
    required String productName,
    required int quantity,
    String? location,
    int? variantId,
  }) =>
      _remote.inbound(
        productId: productId,
        productName: productName,
        quantity: quantity,
        location: location,
        variantId: variantId,
      );

  @override
  Future<Map<String, dynamic>> countInbound(
          int inventoryId, int actualQuantity) =>
      _remote.countInbound(inventoryId, actualQuantity);

  @override
  Future<InventoryItem> updateLocation(int inventoryId, String location) =>
      _remote.updateLocation(inventoryId, location);

  @override
  Future<List<InventoryAdjustment>> getAdjustments() =>
      _remote.getAdjustments();

  @override
  Future<InventoryAdjustment> createAdjustment(
    int inventoryId, {
    required int difference,
    required String reason,
  }) =>
      _remote.createAdjustment(
        inventoryId,
        difference: difference,
        reason: reason,
      );

  @override
  Future<List<StockReservation>> getReservations() => _remote.getReservations();

  @override
  Future<void> approveReservation(String reservationId) =>
      _remote.approveReservation(reservationId);

  @override
  Future<void> rejectReservation(String reservationId, String reason) =>
      _remote.rejectReservation(reservationId, reason);

  @override
  Future<void> startPicking(int orderId) => _remote.startPicking(orderId);

  @override
  Future<void> completePicking(int orderId) => _remote.completePicking(orderId);

  @override
  Future<Map<String, dynamic>> getLabelInfo(int orderId) =>
      _remote.getLabelInfo(orderId);

  @override
  Future<void> handover(int orderId) => _remote.handover(orderId);

  @override
  Future<List<Stocktake>> getStocktakes() => _remote.getStocktakes();

  @override
  Future<Stocktake> createStocktake({
    required String warehouseLocation,
    required int createdBy,
  }) =>
      _remote.createStocktake(
        warehouseLocation: warehouseLocation,
        createdBy: createdBy,
      );

  @override
  Future<Stocktake> submitStocktake(int id, int actualQuantity) =>
      _remote.submitStocktake(id, actualQuantity);

  @override
  Future<List<ReplenishmentItem>> getReplenishment() =>
      _remote.getReplenishment();

  @override
  Future<void> proposeRestock({
    required int inventoryId,
    required int quantity,
    String? note,
  }) =>
      _remote.proposeRestock(
        inventoryId: inventoryId,
        quantity: quantity,
        note: note,
      );

  @override
  Future<List<Map<String, dynamic>>> getRestockRequests() =>
      _remote.getRestockRequests();
}
