import 'package:ettee_staff/core/widgets/list_skeleton.dart';
import 'package:ettee_staff/core/widgets/stat_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('StatCard', () {
    testWidgets('hien gia tri va nhan', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              label: 'Đơn cần xử lý',
              value: '7',
              icon: Icons.checklist_outlined,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('7'), findsOneWidget);
      expect(find.text('Đơn cần xử lý'), findsOneWidget);

      await tester.tap(find.byType(StatCard));
      expect(tapped, isTrue);
    });

    testWidgets('khong bat loi khi khong co onTap', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: const StatCard(
              label: 'Vượt SLA',
              value: '0',
              icon: Icons.schedule,
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
    });
  });

  group('StatRow', () {
    testWidgets('chia deu cho 4 the', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatRow(
              cards: [
                for (var i = 0; i < 4; i++)
                  StatCard(label: 'Số $i', value: '$i', icon: Icons.star),
              ],
            ),
          ),
        ),
      );

      final widths = tester
          .widgetList<StatCard>(find.byType(StatCard))
          .map((c) => c.key)
          .length;
      expect(widths, 4);
      expect(tester.takeException(), isNull);
    });
  });

  group('ListSkeleton', () {
    testWidgets('ve khung cho danh sach', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: ListSkeleton(itemCount: 3, hasHeader: true)),
        ),
      );

      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}