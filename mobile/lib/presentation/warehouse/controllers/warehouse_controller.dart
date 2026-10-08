import '../../../core/state/base_controller.dart';
import '../../../domain/repositories/warehouse_repository.dart';

class WarehouseController extends BaseController {
  WarehouseController(this._repo);

  final WarehouseRepository _repo;

  List<InventoryItem> _inventory = const [];
  List<InboundOrder> _inboundHistory = const [];
  List<Map<String, dynamic>> _orders = const [];
  List<InventoryAdjustment> _adjustments = const [];
  List<StockReservation> _reservations = const [];
  List<Stocktake> _stocktakes = const [];
  List<ReplenishmentItem> _replenishment = const [];
  List<Map<String, dynamic>> _catalog = const [];
  List<ProductVariantOption> _productVariants = const [];

  List<InventoryItem> get inventory => _inventory;
  List<InboundOrder> get inboundHistory => _inboundHistory;
  List<Map<String, dynamic>> get orders => _orders;
  List<InventoryAdjustment> get adjustments => _adjustments;
  List<StockReservation> get reservations => _reservations;
  List<Stocktake> get stocktakes => _stocktakes;
  List<ReplenishmentItem> get replenishment => _replenishment;
  List<Map<String, dynamic>> get catalog => _catalog;
  List<ProductVariantOption> get productVariants => _productVariants;

  List<InventoryAdjustment> get pendingAdjustments =>
      _adjustments.where((a) => a.isPending).toList();

  List<StockReservation> get pendingReservations =>
      _reservations.where((r) => r.isPending).toList();

  int get lowStockCount => _replenishment.length;

  // ─── Tai du lieu ───────────────────────────────────────────────────────────

  Future<void> loadInventory() => run(() async {
        _inventory = await _repo.getInventory();
      });

  Future<void> loadInboundHistory() => run(() async {
        _inboundHistory = await _repo.getInboundHistory();
      });

  Future<void> loadOrders() => run(() async {
        _orders = await _repo.getWarehouseOrders();
      });

  Future<void> loadAdjustments() => run(() async {
        _adjustments = await _repo.getAdjustments();
      });

  Future<void> loadReservations() => run(() async {
        _reservations = await _repo.getReservations();
      });

  Future<void> loadStocktakes() => run(() async {
        _stocktakes = await _repo.getStocktakes();
      });

  Future<void> loadReplenishment() => run(() async {
        _replenishment = await _repo.getReplenishment();
      });

  Future<void> loadInboundData() => run(() async {
        _catalog = await _repo.getCatalogProducts();
        _inboundHistory = await _repo.getInboundHistory();
      });

  Future<void> loadProductVariants(int productId) => run(() async {
        _productVariants = const [];
        _productVariants = await _repo.getProductVariants(productId);
      });

  Future<void> loadAdjustmentData() => run(() async {
        _inventory = await _repo.getInventory();
        _adjustments = await _repo.getAdjustments();
      });

  Future<void> refreshAll() async {
    await loadOrders();
    await loadInventory();
    await loadReservations();
  }

  // ─── Thao tac ──────────────────────────────────────────────────────────────

  Future<String?> inbound({
    required int productId,
    required String productName,
    required int quantity,
    String? location,
    int? variantId,
  }) =>
      _guard(() async {
        await _repo.inbound(
          productId: productId,
          productName: productName,
          quantity: quantity,
          location: location,
          variantId: variantId,
        );
        await loadInventory();
      }, 'Đã nhập kho');

  Future<String?> countInbound(int inventoryId, int actualQuantity) =>
      _guard(() async {
        await _repo.countInbound(inventoryId, actualQuantity);
        await loadInventory();
      }, 'Đã cập nhật số kiểm đếm');

  Future<String?> updateLocation(int inventoryId, String location) =>
      _guard(() async {
        await _repo.updateLocation(inventoryId, location);
        await loadInventory();
      }, 'Đã cập nhật vị trí');

  Future<String?> createAdjustment(
    int inventoryId, {
    required int difference,
    required String reason,
  }) =>
      _guard(() async {
        await _repo.createAdjustment(
          inventoryId,
          difference: difference,
          reason: reason,
        );
        await loadAdjustments();
      }, 'Đã gửi phiếu điều chỉnh, cần duyệt');

  Future<String?> approveReservation(int id) => _guard(() async {
        await _repo.approveReservation('$id');
        await loadReservations();
      }, 'Đã duyệt giữ hàng');

  Future<String?> rejectReservation(int id, String reason) => _guard(() async {
        await _repo.rejectReservation('$id', reason);
        await loadReservations();
      }, 'Đã từ chối giữ hàng');

  Future<String?> startPicking(int orderId) => _guard(() async {
        await _repo.startPicking(orderId);
        await loadOrders();
      }, 'Đã bắt đầu lấy hàng');

  Future<String?> completePicking(int orderId) => _guard(() async {
        await _repo.completePicking(orderId);
        await loadOrders();
      }, 'Đã hoàn tất lấy hàng');

  Future<Map<String, dynamic>?> labelInfo(int orderId) async {
    Map<String, dynamic>? result;
    await _guard(() async {
      result = await _repo.getLabelInfo(orderId);
    }, null);
    return result;
  }

  Future<String?> handover(int orderId) => _guard(() async {
        await _repo.handover(orderId);
        await loadOrders();
      }, 'Đã bàn giao');

  Future<String?> createStocktake({
    required String warehouseLocation,
    required int createdBy,
  }) =>
      _guard(() async {
        await _repo.createStocktake(
          warehouseLocation: warehouseLocation,
          createdBy: createdBy,
        );
        await loadStocktakes();
      }, 'Đã tạo phiếu kiểm kê');

  Future<String?> submitStocktake(int id, int actualQuantity) =>
      _guard(() async {
        await _repo.submitStocktake(id, actualQuantity);
        await loadStocktakes();
      }, 'Đã ghi nhận kiểm kê');

  Future<String?> proposeRestock({
    required int inventoryId,
    required int quantity,
    String? note,
  }) =>
      _guard(() async {
        await _repo.proposeRestock(
          inventoryId: inventoryId,
          quantity: quantity,
          note: note,
        );
      }, 'Đã gửi đề xuất nhập thêm');

  /// Chay thao tac ghi, tra ve thong bao thanh cong hoac loi de hien SnackBar.
  Future<String?> _guard(
      Future<void> Function() action, String? success) async {
    try {
      await action();
      return success;
    } catch (e) {
      return e is Exception ? '$e' : 'Lỗi: $e';
    }
  }
}
