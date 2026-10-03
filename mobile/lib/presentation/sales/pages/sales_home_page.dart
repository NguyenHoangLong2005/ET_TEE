import 'package:flutter/material.dart';

import '../widgets/sla_badge.dart';

/// Bán hàng: Đơn mới, Xác minh, Xác nhận/Hủy, Ghi chú, Giữ hàng, SLA.
class SalesHomePage extends StatefulWidget {
  const SalesHomePage({super.key});

  @override
  State<SalesHomePage> createState() => _SalesHomePageState();
}

class _SalesHomePageState extends State<SalesHomePage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 4, vsync: this);

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bán hàng'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Đơn mới'),
            Tab(text: 'Giữ hàng'),
            Tab(text: 'Ghi chú'),
            Tab(text: 'SLA'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _SalesPlaceholder(title: 'Đơn mới', hint: 'new_orders'),
          _SalesPlaceholder(title: 'Yêu cầu giữ hàng', hint: 'hold_request'),
          _SalesPlaceholder(title: 'Ghi chú xử lý', hint: 'order_notes'),
          _SlaTab(),
        ],
      ),
    );
  }
}

class _SlaTab extends StatelessWidget {
  const _SlaTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        SlaBadge(
          orderCode: 'ET2409-0001',
          label: 'Sắp hết hạn',
          isBreached: false,
        ),
        SlaBadge(
          orderCode: 'ET2409-0002',
          label: 'Quá hạn 42 phút',
          isBreached: true,
        ),
      ],
    );
  }
}

class _SalesPlaceholder extends StatelessWidget {
  const _SalesPlaceholder({required this.title, required this.hint});

  final String title;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text('TODO: features/$hint', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}