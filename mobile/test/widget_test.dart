import 'package:ettee_staff/app.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('app boots to the role selection screen', (WidgetTester tester) async {
    await tester.pumpWidget(const EtteeStaffApp());
    await tester.pumpAndSettle();

    expect(find.text('ET Tee Staff'), findsOneWidget);
    expect(find.text('Chọn vai trò để bắt đầu ca làm việc'), findsOneWidget);
  });
}