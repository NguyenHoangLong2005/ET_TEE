import '../../../core/state/base_controller.dart';
import '../../../domain/entities/order.dart';
import '../../../domain/repositories/sales_repository.dart';

class SalesController extends BaseController {
  SalesController(this._repo);

  final SalesRepository _repo;

  List<Order> _newOrders = const [];
  List<Order> _slaWarnings = const [];
  List<Order> _allOrders = const [];
  Order? _selected;
  List<OrderNote> _notes = const [];
  final Set<int> _busyIds = {};

  List<Order> get newOrders => _newOrders;
  List<Order> get slaWarnings => _slaWarnings;
  List<Order> get allOrders => _allOrders;
  Order? get selected => _selected;
  List<OrderNote> get notes => _notes;

  Map<String, dynamic>? _dashboard;
  Map<String, dynamic>? _orderStatusInfo;
  List<Map<String, dynamic>>? _orderHistory;
  List<Map<String, dynamic>>? _allStatuses;
  Map<String, dynamic>? _statusDisplay;

  Map<String, dynamic>? get dashboard => _dashboard;
  Map<String, dynamic>? get orderStatusInfo => _orderStatusInfo;
  List<Map<String, dynamic>>? get orderHistory => _orderHistory;
  List<Map<String, dynamic>>? get allStatuses => _allStatuses;
  Map<String, dynamic>? get statusDisplay => _statusDisplay;

  /// Order dang xu ly (xac minh / xac nhan / huy) de hien loading cuc bo.
  bool isBusy(int orderId) => _busyIds.contains(orderId);

  Future<void> loadNewOrders() => run(() async {
        _newOrders = await _repo.getNewOrders();
      });

  Future<void> loadAllOrders() => run(() async {
        _allOrders = await _repo.getAllOrders();
      });

  Future<void> loadSlaWarnings() => run(() async {
        _slaWarnings = await _repo.getSlaWarnings();
      });

  Future<void> loadDashboard() => run(() async {
        _dashboard = await _repo.getDashboard();
      });

  Future<Map<String, dynamic>> loadOrdersPage({
    int page = 0,
    int size = 15,
    String filter = 'all',
    String? q,
  }) async {
    return _repo.getOrdersPage(page: page, size: size, filter: filter, q: q);
  }

  Future<void> loadOrderStatusInfo(int orderId) => run(() async {
        _orderStatusInfo = await _repo.getOrderStatusInfo(orderId);
      });

  Future<void> loadOrderHistory(int orderId) => run(() async {
        _orderHistory = await _repo.getOrderHistory(orderId);
      });

  Future<void> loadAllStatuses() => run(() async {
        _allStatuses = await _repo.getAllStatuses();
      });

  Future<void> loadStatusDisplay(String status) => run(() async {
        _statusDisplay = await _repo.getStatusDisplay(status);
      });

  Future<void> refreshAll() async {
    await loadNewOrders();
    await loadSlaWarnings();
  }

  Future<void> openOrder(int orderId) async {
    _selected = null;
    await run(() async {
      _selected = await _repo.getOrderDetail(orderId);
      _notes = await _repo.listNotes(orderId);
    });
  }

  /// Trả về null khi thanh cong, hoac thong bao loi de hien bang SnackBar.
  Future<String?> verifyOrder({
    required int orderId,
    required String customerName,
    required String phone,
    required String shippingAddress,
  }) =>
      _mutate(
        orderId,
        () => _repo.verifyOrder(
          orderId,
          customerName: customerName,
          phone: phone,
          shippingAddress: shippingAddress,
        ),
        order: true,
      );

  Future<String?> confirmOrder(int orderId) =>
      _mutate(orderId, () => _repo.confirmOrder(orderId), order: true);

  Future<String?> confirmBankTransfer(int orderId) =>
      _mutate(orderId, () => _repo.confirmBankTransfer(orderId), order: true);

  Future<String?> cancelOrder(int orderId, String reason) => _mutate(
        orderId,
        () => _repo.cancelOrder(orderId, reason),
        order: false,
        message: 'Đã hủy đơn',
      );

  Future<String?> addNote(int orderId, String content) => _mutate(
        orderId,
        () async {
          await _repo.addNote(orderId, content);
          _notes = await _repo.listNotes(orderId);
        },
        order: false,
        message: 'Đã ghi chú',
      );

  Future<String?> addNoteWithUserId(int orderId, String content, String userId) => _mutate(
        orderId,
        () async {
          await _repo.addNoteWithUserId(orderId, content, userId);
          _notes = await _repo.listNotes(orderId);
        },
        order: false,
        message: 'Đã ghi chú',
      );

  Future<String?> requestHold(int orderId, int productId, int quantity) =>
      _mutate(
        orderId,
        () => _repo.requestHold(orderId, productId, quantity),
        order: false,
        message: 'Đã gửi yêu cầu giữ hàng',
      );

  Future<Order?> createOrder(Map<String, dynamic> payload) async {
    Order? result;
    await _mutate(
      0,
      () async {
        result = await _repo.createOrder(payload);
      },
      order: false,
    );
    return result;
  }

  Future<void> loadNotes(int orderId) => run(() async {
        _notes = await _repo.listNotes(orderId);
      });

  /// Giu man hinh trong luc ghi; tra ve thong bao loi neu that bai.
  Future<String?> _mutate(
    int orderId,
    Future<void> Function() action, {
    required bool order,
    String? message,
  }) async {
    _busyIds.add(orderId);
    notifyListeners();

    try {
      await action();
      if (order) {
        await loadNewOrders();
        await loadSlaWarnings();
        if (_selected?.id == orderId) {
          _selected = await _repo.getOrderDetail(orderId);
        }
      }
      return message;
    } catch (e) {
      return e is Exception ? _messageOf(e) : 'Lỗi: $e';
    } finally {
      _busyIds.remove(orderId);
      notifyListeners();
    }
  }

  String _messageOf(Object e) {
    if (e.toString().isNotEmpty) {
      return '$e';
    }
    return 'Lỗi không xác định';
  }
}