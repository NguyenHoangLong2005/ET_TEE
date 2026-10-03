import 'package:flutter/material.dart';

/// Kho: Nhập kho, Kiểm đếm, Vị trí, Điều chỉnh, Giữ hàng,
/// Picking, Packing, Tem, Bàn giao, Kiểm kê, Đề xuất nhập thêm.
class WarehouseHomePage extends StatelessWidget {
  const WarehouseHomePage({super.key});

  static const _sections = <_WarehouseSection>[
    _WarehouseSection('Nhập kho', Icons.move_to_inbox_outlined, 'inbound'),
    _WarehouseSection('Kiểm đếm', Icons.pin_outlined, 'counting'),
    _WarehouseSection('Quản lý vị trí', Icons.warehouse_outlined, 'locations'),
    _WarehouseSection('Điều chỉnh tồn kho', Icons.tune, 'adjustments'),
    _WarehouseSection('Giữ hàng cho đơn', Icons.lock_outline, 'reservations'),
    _WarehouseSection('Picking', Icons.checklist_outlined, 'picking'),
    _WarehouseSection('Packing', Icons.inventory_2_outlined, 'packing'),
    _WarehouseSection('In tem', Icons.qr_code_2_outlined, 'label_printing'),
    _WarehouseSection('Bàn giao hãng vận chuyển', Icons.local_shipping_outlined, 'handover'),
    _WarehouseSection('Kiểm kê', Icons.fact_check_outlined, 'stocktake'),
    _WarehouseSection('Đề xuất nhập thêm', Icons.trending_up, 'replenishment'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kho')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _sections.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final s = _sections[index];
          return Card(
            child: ListTile(
              leading: Icon(s.icon),
              title: Text(s.title),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          );
        },
      ),
    );
  }
}

class _WarehouseSection {
  const _WarehouseSection(this.title, this.icon, this.route);

  final String title;
  final IconData icon;
  final String route;
}