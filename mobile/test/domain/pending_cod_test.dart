import 'package:ettee_staff/domain/repositories/shipping_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('PendingCod parses the fields shown in COD reconciliation', () {
    final pending = PendingCod.fromJson({
      'id': 42,
      'trackingCode': 'GHN-3131426451',
      'carrierName': 'GHN',
      'codAmount': 577000,
      'deliveredAt': '2026-10-14T20:42:03',
      'order': {
        'orderCode': 'ET-DEMO-0101',
        'customerName': 'Nguyen Van An',
        'customerPhone': '0901110001',
      },
    });

    expect(pending.shipmentId, 42);
    expect(pending.trackingCode, 'GHN-3131426451');
    expect(pending.orderCode, 'ET-DEMO-0101');
    expect(pending.customerName, 'Nguyen Van An');
    expect(pending.customerPhone, '0901110001');
    expect(pending.carrierName, 'GHN');
    expect(pending.codAmount, 577000);
    expect(pending.deliveredAt, DateTime(2026, 10, 14, 20, 42, 3));
  });
}
