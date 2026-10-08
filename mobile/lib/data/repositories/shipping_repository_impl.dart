import 'dart:io';

import '../../domain/repositories/shipping_repository.dart';
import '../datasources/remote/shipping_remote_datasource.dart';

class ShippingRepositoryImpl implements ShippingRepository {
  ShippingRepositoryImpl(this._remote);

  final ShippingRemoteDataSource _remote;

  @override
  Future<List<ReadyPackage>> getReadyPackages() => _remote.getReadyPackages();

  @override
  Future<List<Shipment>> getShipments() => _remote.getShipments();

  @override
  Future<Shipment> getShipment(int id) => _remote.getShipment(id);

  @override
  Future<Shipment> createShipment({
    required int orderId,
    required String carrierName,
    String? trackingCode,
    double? codAmount,
  }) =>
      _remote.createShipment(
        orderId: orderId,
        carrierName: carrierName,
        trackingCode: trackingCode,
        codAmount: codAmount,
      );

  @override
  Future<Shipment> attachTrackingCode(int shipmentId, String trackingCode) =>
      _remote.attachTrackingCode(shipmentId, trackingCode);

  @override
  Future<void> confirmHandover(int shipmentId) =>
      _remote.confirmHandover(shipmentId);

  @override
  Future<void> startShipping(int shipmentId) =>
      _remote.startShipping(shipmentId);

  @override
  Future<List<ShippingException>> getExceptions() => _remote.getExceptions();

  @override
  Future<void> createException({
    required int shipmentId,
    required String type,
    required String description,
  }) =>
      _remote.createException(
        shipmentId: shipmentId,
        type: type,
        description: description,
      );

  @override
  Future<void> resolveException(
    int id, {
    String? note,
    bool returnToSender = false,
  }) =>
      _remote.resolveException(
        id,
        note: note,
        returnToSender: returnToSender,
      );

  @override
  Future<void> submitProofOfDelivery(int shipmentId, PodProof proof) =>
      _remote.submitProofOfDelivery(shipmentId, proof);

  @override
  Future<String> uploadProofImage(File image) =>
      _remote.uploadProofImage(image);

  @override
  Future<List<PendingCod>> getPendingCod() async {
    final raw = await _remote.getPendingCod();
    return raw.map(PendingCod.fromJson).toList();
  }

  @override
  Future<void> reconcileCod(int shipmentId) => _remote.reconcileCod(shipmentId);

  @override
  Future<List<CodReconciliation>> getReconciliations({
    int page = 0,
    int size = 20,
  }) =>
      _remote.getReconciliations(page: page, size: size);

  @override
  Future<Map<String, dynamic>> getReconciliationDetail(int id) =>
      _remote.getReconciliationDetail(id);
}
