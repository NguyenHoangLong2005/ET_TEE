import 'package:ettee_staff/app.dart';
import 'package:ettee_staff/core/format.dart';
import 'package:ettee_staff/models/product.dart';
import 'package:ettee_staff/screens/staff/content_screens.dart';
import 'package:ettee_staff/screens/staff/marketing_shell.dart';
import 'package:ettee_staff/screens/staff/owner_extra_screens.dart';
import 'package:ettee_staff/services/auth_service.dart';
import 'package:ettee_staff/services/product_service.dart';
import 'package:ettee_staff/services/recommendation_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('app boots to the role selection screen', (WidgetTester tester) async {
    await tester.pumpWidget(const EtteeStaffApp());
    await tester.pumpAndSettle();

    expect(find.text('ET Tee Staff'), findsOneWidget);
    expect(find.text('Chọn vai trò để bắt đầu ca làm việc'), findsOneWidget);
  });

  test('VND formatting matches the storefront', () {
    expect(formatVnd(52794.36), '53.000');
    expect(formatNumber(1234567), '1.234.567');
    expect(roundVnd(299400), 299000);
  });

  test('size pickers list sizes in size order', () {
    expect(sortSizes(['42', '43', '40', '41']), ['40', '41', '42', '43']);
    expect(sortSizes(['XL', 'S', '2XL', 'M', 'L']), ['S', 'M', 'L', 'XL', '2XL']);
    expect(sortSizes(['110', '90', '100']), ['90', '100', '110']);
    expect(sortSizes(['Free size', 'M', '38']), ['M', '38', 'Free size']);
  });

  test('category slugs drop Vietnamese diacritics', () {
    expect(slugify('Áo thun Nam'), 'ao-thun-nam');
    expect(slugify('Đầm dự tiệc — Mùa hè 2026!'), 'dam-du-tiec-mua-he-2026');
    expect(slugify('Quần ống suông ỹ ữ ợ'), 'quan-ong-suong-y-u-o');
  });

  test('staff routes stay inside the role workspace', () {
    expect(staffMayOpen('WAREHOUSE_STAFF', '/staff/warehouse/inventory'), isTrue);
    expect(staffMayOpen('WAREHOUSE_STAFF', '/owner/products'), isFalse);
    expect(staffMayOpen('SHOP_OWNER', '/staff/cskh/tickets/abc'), isTrue);
    expect(staffMayOpen('SALES_STAFF', '/staff/profile'), isTrue);
    expect(workspaceFor('ADMIN').nav.map((n) => n.$2), contains('/admin/backup'));
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
    expect(
      BehaviorTracking.takeViewSource(9, now: DateTime.now().add(const Duration(minutes: 6))),
      isNull,
      reason: 'opened too long after the click',
    );
  });
}
