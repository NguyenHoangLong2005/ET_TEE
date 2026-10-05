import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/role_shell.dart';
import '../../../../core/widgets/stat_card.dart';
import '../controllers/warehouse_controller.dart';
import 'warehouse_inventory_page.dart';
import 'warehouse_orders_page.dart';
import 'warehouse_reservations_page.dart';
import 'warehouse_stocktake_page.dart';

/// Kho: Nhập kho · Kiểm đếm · Vị trí · Điều chỉnh · Giữ hàng ·
/// Picking · Packing · Tem · Bàn giao · Kiểm kê · Đề xuất nhập thêm
class WarehouseHomePage extends StatefulWidget {
  const WarehouseHomePage({super.key});

  @override
  State<WarehouseHomePage> createState() => _WarehouseHomePageState();
}

class _WarehouseHomePageState extends State<WarehouseHomePage> {
  late final WarehouseController _controller = sl<WarehouseController>();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadEverything());
  }

  @override
  void dispose() {
    _controller.removeListener(_onChange);
    _controller.dispose();
    super.dispose();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  /// Tai tat ca con so badge canh o 4 lan: don can xu ly, yeu cau giu hang,
  /// phieu dieu chinh cho duyet va ma hang duoi nguong.
  Future<void> _loadEverything() async {
    await _controller.loadOrders();
    await _controller.loadReservations();
    await _controller.loadAdjustments();
    await _controller.loadReplenishment();
  }

  void _open(Widget page) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
  }

  @override
  Widget build(BuildContext context) {
    final pendingHolds = _controller.pendingReservations.length;
    final pendingAdjust = _controller.pendingAdjustments.length;

    return RoleShell(
      title: 'Kho',
      controller: _controller,
      onRefresh: _loadEverything,
      stats: [
        StatCard(
          label: 'Đơn cần xử lý',
          value: '${_controller.orders.length}',
          icon: Icons.checklist_outlined,
          onTap: () => _open(const WarehouseOrdersPage()),
        ),
        StatCard(
          label: 'Chờ duyệt giữ hàng',
          value: '$pendingHolds',
          icon: Icons.lock_outline,
          color: pendingHolds > 0 ? AppColors.statusSlaWarning : null,
          onTap: () => _open(const WarehouseReservationsPage()),
        ),
        StatCard(
          label: 'Chờ duyệt chênh lệch',
          value: '$pendingAdjust',
          icon: Icons.tune,
          color: pendingAdjust > 0 ? AppColors.statusPicking : null,
          onTap: () => _open(const WarehouseAdjustmentsPage()),
        ),
        StatCard(
          label: 'Cần nhập thêm',
          value: '${_controller.lowStockCount}',
          icon: Icons.trending_up,
          color:
              _controller.lowStockCount > 0 ? AppColors.statusCancelled : null,
          onTap: () => _open(const WarehouseReplenishmentPage()),
        ),
      ],
      body: RefreshIndicator(
        onRefresh: _loadEverything,
        child: _controller.isLoading && _controller.orders.isEmpty
            ? const ListSkeleton(itemCount: 6, hasHeader: true)
            : _menu(pendingHolds, pendingAdjust),
      ),
    );
  }

  /// Menu dang load lai khong phai danh sach cuon: dung ListView thong thuong
  /// de do keo len lam moi khong gay xung dot voi cuon trong tung muc.
  Widget _menu(int pendingHolds, int pendingAdjust) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      children: [
          const _SectionTitle('Vận hành'),
          _tile(
            icon: Icons.checklist_outlined,
            title: 'Đơn cần xử lý',
            subtitle: 'Lấy hàng, đóng gói, in tem, bàn giao',
            badge: _controller.orders.isEmpty ? null : '${_controller.orders.length}',
            onTap: () => _open(const WarehouseOrdersPage()),
          ),
          _tile(
            icon: Icons.move_to_inbox_outlined,
            title: 'Nhập kho & kiểm đếm',
            subtitle: 'Ghi nhận hàng nhập, đếm số lượng thực tế',
            onTap: () => _open(
              const WarehouseInventoryPage(mode: WarehouseMode.inbound),
            ),
          ),
          _tile(
            icon: Icons.inventory_2_outlined,
            title: 'Tồn kho & vị trí',
            subtitle: 'Xem tồn kho, đổi vị trí lưu hàng',
            onTap: () => _open(
              const WarehouseInventoryPage(mode: WarehouseMode.location),
            ),
          ),
          const SizedBox(height: 16),
          const _SectionTitle('Duyệt & kiểm kê'),
          _tile(
            icon: Icons.lock_outline,
            title: 'Giữ hàng cho đơn',
            subtitle: 'Duyệt hoặc từ chối yêu cầu giữ hàng',
            badge: pendingHolds == 0 ? null : '$pendingHolds',
            onTap: () => _open(const WarehouseReservationsPage()),
          ),
          _tile(
            icon: Icons.tune,
            title: 'Điều chỉnh chênh lệch',
            subtitle: 'Tạo phiếu điều chỉnh, cần được duyệt',
            badge: pendingAdjust == 0 ? null : '$pendingAdjust',
            onTap: () => _open(const WarehouseAdjustmentsPage()),
          ),
          _tile(
            icon: Icons.fact_check_outlined,
            title: 'Kiểm kê tồn kho',
            subtitle: 'Tạo phiếu kiểm kê và ghi nhận số thực tế',
            onTap: () => _open(const WarehouseStocktakePage()),
          ),
          _tile(
            icon: Icons.trending_up,
            title: 'Đề xuất nhập thêm',
            subtitle: 'Danh sách mã hàng cần nhập thêm',
            badge: _controller.lowStockCount == 0
                ? null
                : '${_controller.lowStockCount}',
            onTap: () => _open(const WarehouseReplenishmentPage()),
          ),
      ],
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    String? badge,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: badge == null
            ? const Icon(Icons.chevron_right)
            : Badge(label: Text(badge)),
        onTap: onTap,
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 8),
      child: Text(
        text.toUpperCase(),
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              letterSpacing: 0.8,
            ),
      ),
    );
  }
}

enum WarehouseMode { inbound, location }