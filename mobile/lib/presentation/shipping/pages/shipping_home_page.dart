import 'package:flutter/material.dart';

/// Vận chuyển: Kiện đã đóng gói, Mã vận đơn, Bàn giao,
/// Ngoại lệ giao hàng, Bằng chứng giao hàng, Đối soát COD.
class ShippingHomePage extends StatefulWidget {
  const ShippingHomePage({super.key});

  @override
  State<ShippingHomePage> createState() => _ShippingHomePageState();
}

class _ShippingHomePageState extends State<ShippingHomePage>
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
        title: const Text('Vận chuyển'),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Kiện sẵn sàng'),
            Tab(text: 'Chuyến giao'),
            Tab(text: 'Ngoại lệ'),
            Tab(text: 'COD'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _ShippingPlaceholder('Danh sách kiện đã đóng gói', 'ready_packages'),
          _ShippingPlaceholder('Mã vận đơn & bàn giao', 'tracking_code'),
          _ShippingPlaceholder('Cập nhật ngoại lệ giao hàng', 'delivery_exceptions'),
          _ShippingPlaceholder('Đối soát COD', 'cod_reconciliation'),
        ],
      ),
    );
  }
}

class _ShippingPlaceholder extends StatelessWidget {
  const _ShippingPlaceholder(this.title, this.route);

  final String title;
  final String route;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text('TODO: features/$route', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}