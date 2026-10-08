import 'dart:io';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../domain/repositories/shipping_repository.dart';

class ShippingRemoteDataSource {
  ShippingRemoteDataSource(this._api);

  final ApiClient _api;

  String get _base => AppConfig.shippingBase;

  // ─── Kien da dong goi ──────────────────────────────────────────────────────

  Future<List<ReadyPackage>> getReadyPackages() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/ready-orders',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => ReadyPackage.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ─── Ma van don ───────────────────────────────────────────────────────────

  Future<List<Shipment>> getShipments() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/shipments',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => Shipment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Shipment> getShipment(int id) async {
    final data = await _api.get<Map<String, dynamic>>(
      '$_base/shipments/$id',
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Shipment.fromJson(data);
  }

  Future<Shipment> createShipment({
    required int orderId,
    required String carrierName,
    String? trackingCode,
    double? codAmount,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '$_base/shipments',
      body: {
        'orderId': orderId,
        'carrierName': carrierName,
        if (trackingCode != null) 'trackingCode': trackingCode,
        if (codAmount != null) 'codAmount': codAmount,
      },
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Shipment.fromJson(data);
  }

  Future<Shipment> attachTrackingCode(
      int shipmentId, String trackingCode) async {
    final data = await _api.put<Map<String, dynamic>>(
      '$_base/shipments/$shipmentId/tracking-code',
      body: {'trackingCode': trackingCode},
      parse: (raw) => raw as Map<String, dynamic>,
    );
    return Shipment.fromJson(data);
  }

  // ─── Ban giao ──────────────────────────────────────────────────────────────

  Future<void> confirmHandover(int shipmentId) async {
    await _api.post<dynamic>('$_base/shipments/$shipmentId/handover');
  }

  Future<void> startShipping(int shipmentId) async {
    await _api.post<dynamic>('$_base/shipments/$shipmentId/shipping');
  }

  // ─── Ngoai le giao hang ────────────────────────────────────────────────────

  Future<List<ShippingException>> getExceptions() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/exceptions',
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => ShippingException.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> createException({
    required int shipmentId,
    required String type,
    required String description,
  }) async {
    await _api.post<dynamic>(
      '$_base/exceptions',
      body: {
        'shipmentId': shipmentId,
        'type': type,
        'description': description,
      },
    );
  }

  Future<void> resolveException(
    int id, {
    String? note,
    bool returnToSender = false,
  }) async {
    await _api.put<dynamic>(
      '$_base/exceptions/$id/resolve',
      body: {'note': note, 'returnToSender': returnToSender},
    );
  }

  // ─── Bang chung giao hang ─────────────────────────────────────────────────

  Future<void> submitProofOfDelivery(int shipmentId, PodProof proof) async {
    await _api.post<dynamic>(
      '$_base/shipments/$shipmentId/proof',
      body: proof.toJson(),
    );
  }

  Future<String> uploadProofImage(File image) async {
    final data = await _api.upload<Map<String, dynamic>>(
      '$_base/proof-image',
      file: image,
      field: 'file',
      parse: (raw) => raw as Map<String, dynamic>,
    );
    final url = data['url'] as String?;
    if (url == null || url.isEmpty) {
      throw const FormatException('Máy chủ không trả về URL ảnh bằng chứng');
    }
    return url;
  }

  // ─── Doi soat COD ─────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getPendingCod() async {
    final data = await _api.get<List<dynamic>>(
      '$_base/cod',
      parse: (raw) => raw as List<dynamic>,
    );
    return data.cast<Map<String, dynamic>>();
  }

  Future<void> reconcileCod(int shipmentId) async {
    await _api.post<dynamic>('$_base/cod/$shipmentId/reconcile');
  }

  Future<List<CodReconciliation>> getReconciliations(
      {int page = 0, int size = 20}) async {
    final data = await _api.get<List<dynamic>>(
      '$_base/cod/reconciliations',
      query: {'page': page, 'size': size},
      parse: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => CodReconciliation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> getReconciliationDetail(int id) async {
    return _api.get<Map<String, dynamic>>(
      '$_base/cod/reconciliations/$id',
      parse: (raw) => raw as Map<String, dynamic>,
    );
  }
}
