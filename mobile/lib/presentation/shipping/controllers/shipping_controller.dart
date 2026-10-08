import 'dart:io';

import '../../../core/state/base_controller.dart';
import '../../../domain/entities/order_status.dart';
import '../../../domain/repositories/shipping_repository.dart';

class ShippingController extends BaseController {
  ShippingController(this._repo);

  final ShippingRepository _repo;

  List<ReadyPackage> _ready = const [];
  List<Shipment> _shipments = const [];
  List<ShippingException> _exceptions = const [];
  List<PendingCod> _pendingCod = const [];
  List<CodReconciliation> _reconciliations = const [];
  final Set<int> _busyIds = {};

  List<ReadyPackage> get readyPackages => _ready;
  List<Shipment> get shipments => _shipments;
  List<ShippingException> get exceptions => _exceptions;
  List<PendingCod> get pendingCod => _pendingCod;
  List<CodReconciliation> get reconciliations => _reconciliations;

  List<ShippingException> get openExceptions =>
      _exceptions.where((e) => e.isOpen).toList();

  /// Van don dang di chuyen: da ban giao hoac dang giao.
  int get inTransitCount => _shipments
      .where((s) =>
          s.status == ShipmentStatus.handedOver ||
          s.status == ShipmentStatus.inTransit)
      .length;

  double get pendingCodTotal =>
      _pendingCod.fold(0, (sum, item) => sum + item.codAmount);

  bool isBusy(int shipmentId) => _busyIds.contains(shipmentId);

  // ─── Tai du lieu ───────────────────────────────────────────────────────────

  Future<void> loadReadyPackages() => run(() async {
        _ready = await _repo.getReadyPackages();
      });

  Future<void> loadShipments() => run(() async {
        _shipments = await _repo.getShipments();
      });

  Future<void> loadExceptions() => run(() async {
        _exceptions = await _repo.getExceptions();
      });

  Future<void> loadCod() async {
    await loadPendingCod();
    await loadReconciliations();
  }

  Future<void> loadPendingCod() => run(() async {
        _pendingCod = await _repo.getPendingCod();
      });

  Future<void> loadReconciliations() => run(() async {
        _reconciliations = await _repo.getReconciliations();
      });

  Future<void> refreshAll() async {
    await loadReadyPackages();
    await loadShipments();
  }

  // ─── Thao tac ──────────────────────────────────────────────────────────────

  Future<String?> createShipment({
    required int orderId,
    required String carrierName,
    String? trackingCode,
    double? codAmount,
  }) =>
      _guard(orderId, () async {
        await _repo.createShipment(
          orderId: orderId,
          carrierName: carrierName,
          trackingCode: trackingCode,
          codAmount: codAmount,
        );
        await refreshAll();
      }, 'Đã tạo vận đơn');

  Future<String?> attachTrackingCode(int shipmentId, String trackingCode) =>
      _guard(shipmentId, () async {
        await _repo.attachTrackingCode(shipmentId, trackingCode);
        await loadShipments();
      }, 'Đã gắn mã vận đơn');

  Future<String?> confirmHandover(int shipmentId) =>
      _guard(shipmentId, () async {
        await _repo.confirmHandover(shipmentId);
        await loadShipments();
        await loadReadyPackages();
      }, 'Đã xác nhận bàn giao');

  Future<String?> startShipping(int shipmentId) => _guard(shipmentId, () async {
        await _repo.startShipping(shipmentId);
        await loadShipments();
      }, 'Đã bắt đầu giao hàng');

  Future<String?> createException({
    required int shipmentId,
    required String type,
    required String description,
  }) =>
      _guard(shipmentId, () async {
        await _repo.createException(
          shipmentId: shipmentId,
          type: type,
          description: description,
        );
        await loadExceptions();
      }, 'Đã ghi nhận ngoại lệ');

  Future<String?> resolveException(
    int shipmentId,
    int exceptionId, {
    String? note,
    bool returnToSender = false,
  }) =>
      _guard(shipmentId, () async {
        await _repo.resolveException(
          exceptionId,
          note: note,
          returnToSender: returnToSender,
        );
        await loadExceptions();
      }, 'Đã xử lý ngoại lệ');

  Future<String?> submitPod(int shipmentId, PodProof proof) =>
      _guard(shipmentId, () async {
        await _repo.submitProofOfDelivery(shipmentId, proof);
        await loadShipments();
      }, 'Đã gửi bằng chứng giao hàng');

  Future<String> uploadPodImage(int shipmentId, File image) async {
    _busyIds.add(shipmentId);
    notifyListeners();
    try {
      return await _repo.uploadProofImage(image);
    } finally {
      _busyIds.remove(shipmentId);
      notifyListeners();
    }
  }

  Future<String?> reconcileCod(int shipmentId) => _guard(shipmentId, () async {
        await _repo.reconcileCod(shipmentId);
        await loadCod();
      }, 'Đã đối soát');

  Future<String?> _guard(
    int shipmentId,
    Future<void> Function() action,
    String? success,
  ) async {
    _busyIds.add(shipmentId);
    notifyListeners();

    try {
      await action();
      return success;
    } catch (e) {
      return e is Exception ? '$e' : 'Lỗi: $e';
    } finally {
      _busyIds.remove(shipmentId);
      notifyListeners();
    }
  }
}
