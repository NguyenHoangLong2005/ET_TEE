import 'package:ettee_app/core/format.dart';
import 'package:ettee_app/models/product.dart';
import 'package:ettee_app/services/product_service.dart';
import 'package:ettee_app/screens/staff/content_screens.dart';
import 'package:ettee_app/services/auth_service.dart';
import 'package:ettee_app/services/recommendation_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('VND formatting matches the storefront', () {
    expect(formatVnd(52794.36), '53.000');
    expect(formatNumber(1234567), '1.234.567');
    expect(roundVnd(299400), 299000);
  });

  test('role normalisation', () {
    expect(normalizeRole('ROLE_marketing_staff'), 'MARKETING_STAFF');
    expect(normalizeRole(null), 'USER');
  });

  test('segment label and slug', () {
    expect(segmentLabel('men:pants'), 'Quần dài nam');
    expect(generateSlug('Xu hướng Thu Đông 2026!'), 'xu-huong-thu-dong-2026');
  });

  test('home sections never repeat a product further down the page', () {
    Product p(int id) => Product.fromJson({'id': id, 'name': 'P$id', 'slug': 'p-$id', 'price': 100000});
    final seen = <int>{};
    final forYou = unseenProducts([p(1), p(2), p(3)], seen, 2);
    final because = unseenProducts([p(2), p(3), p(4), p(5)], seen, 12);
    expect(forYou.map((x) => x.id), [1, 2]);
    expect(because.map((x) => x.id), [3, 4, 5], reason: 'product 2 was already shown in "Dành riêng cho bạn"');
  });

  test('a recommendation click tags only the view it opens, once and only soon after', () {
    BehaviorTracking.markNextViewSource(7, 'recommendation');
    expect(BehaviorTracking.takeViewSource(8), isNull, reason: 'a different product page');
    BehaviorTracking.markNextViewSource(7, 'recommendation');
    expect(BehaviorTracking.takeViewSource(7), 'recommendation');
    expect(BehaviorTracking.takeViewSource(7), isNull, reason: 'consumed by the first view');
    BehaviorTracking.markNextViewSource(9, 'recommendation');
    expect(BehaviorTracking.takeViewSource(9, now: DateTime.now().add(const Duration(minutes: 6))), isNull,
        reason: 'opened too long after the click');
  });
}
