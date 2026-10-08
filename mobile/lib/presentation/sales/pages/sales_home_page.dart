import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/permission_gate.dart';
import '../../../../core/widgets/role_shell.dart';
import '../../../../core/widgets/stat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../domain/entities/order.dart';
import '../../../../domain/entities/order_status.dart';
import '../../../../domain/repositories/auth_repository.dart';
import '../controllers/sales_controller.dart';
import '../widgets/sla_badge.dart';
import 'order_detail_page.dart';

/// Bán hàng: Đơn mới · Giữ hàng · Ghi chú · SLA
class SalesHomePage extends StatefulWidget {
  const SalesHomePage({super.key});

  @override
  State<SalesHomePage> createState() => _SalesHomePageState();
}

class _SalesHomePageState extends State<SalesHomePage>
    with SingleTickerProviderStateMixin {
  late final SalesController _controller = sl<SalesController>();
  late final TabController _tabs = TabController(length: 4, vsync: this);

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
    _tabs.dispose();
    super.dispose();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  /// Tai ca 3 danh sach o mot lan: don moi, SLA va tat ca don.
  Future<void> _loadEverything() async {
    await _controller.loadNewOrders();
    await _controller.loadAllOrders();
    if (sl<AuthRepository>().cachedProfile?.has('MONITOR_ORDER_SLA') ?? false) {
      await _controller.loadSlaWarnings();
    }
  }

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      title: 'Bán hàng',
      controller: _controller,
      onRefresh: _loadEverything,
      stats: [
        StatCard(
          label: 'Đơn mới',
          value: '${_controller.newOrders.length}',
          icon: Icons.inbox_outlined,
          onTap: () => _tabs.animateTo(0),
        ),
        PermissionGate(
          permission: 'MONITOR_ORDER_SLA',
          child: StatCard(
            label: 'Cảnh báo SLA',
            value: '${_controller.slaWarnings.length}',
            icon: Icons.schedule,
            color: _controller.slaWarnings.isEmpty
                ? null
                : AppColors.statusCancelled,
            onTap: () => _tabs.animateTo(3),
          ),
        ),
      ],
      bottom: TabBar(
        controller: _tabs,
        isScrollable: true,
        tabs: [
          Tab(text: 'Đơn mới (${_controller.newOrders.length})'),
          Tab(text: 'Tất cả đơn (${_controller.allOrders.length})'),
          const Tab(text: 'Ghi chú'),
          Tab(text: 'SLA (${_controller.slaWarnings.length})'),
        ],
      ),
      body: _controller.isLoading && _controller.newOrders.isEmpty
          ? const ListSkeleton(itemCount: 5)
          : TabBarView(
              controller: _tabs,
              children: [
                _NewOrdersTab(controller: _controller),
                _AllOrdersTab(controller: _controller),
                PermissionGate(
                  permission: 'PROCESS_ORDER_NOTE',
                  child: _NotesTab(controller: _controller),
                ),
                PermissionGate(
                  permission: 'MONITOR_ORDER_SLA',
                  child: _SlaTab(controller: _controller),
                ),
              ],
            ),
    );
  }
}

class _NewOrdersTab extends StatelessWidget {
  const _NewOrdersTab({required this.controller});

  final SalesController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.newOrders.isEmpty) {
      return const EmptyState(
        message: 'Không có đơn mới cần xác nhận.',
        icon: Icons.inbox_outlined,
      );
    }
    return RefreshIndicator(
      onRefresh: controller.loadNewOrders,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: controller.newOrders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) =>
            _OrderCard(order: controller.newOrders[i], controller: controller),
      ),
    );
  }
}

class _AllOrdersTab extends StatelessWidget {
  const _AllOrdersTab({required this.controller});

  final SalesController controller;

  @override
  Widget build(BuildContext context) {
    final orders = controller.allOrders;
    if (orders.isEmpty) {
      return const EmptyState(message: 'Chưa có đơn nào.');
    }
    return RefreshIndicator(
      onRefresh: controller.loadAllOrders,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) => Card(
          child: ListTile(
            title: Text(orders[i].orderCode),
            subtitle: Text(
              '${orders[i].customerName ?? '—'} · '
              '${Formatters.currency(orders[i].totalAmount)}',
            ),
            trailing: StatusBadge.order(OrderStatus.fromWire(orders[i].status)),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => OrderDetailPage(orderId: orders[i].id),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NotesTab extends StatefulWidget {
  const _NotesTab({required this.controller});

  final SalesController controller;

  @override
  State<_NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends State<_NotesTab> {
  final _contentCtrl = TextEditingController();
  int? _selectedOrderId;

  @override
  void dispose() {
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<void> _selectOrder(int? id) async {
    setState(() => _selectedOrderId = id);
    if (id != null) await widget.controller.loadNotes(id);
  }

  Future<void> _add() async {
    final id = _selectedOrderId;
    final content = _contentCtrl.text.trim();
    if (id == null || content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chọn đơn hàng và nhập nội dung ghi chú')),
      );
      return;
    }

    final result = await widget.controller.addNote(id, content);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(result ?? 'Đã ghi chú')),
    );
    if (result == null) {
      _contentCtrl.clear();
      await widget.controller.loadNotes(id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final notes = widget.controller.notes;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              DropdownButtonFormField<int>(
                initialValue: _selectedOrderId,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Chọn đơn hàng',
                  prefixIcon: Icon(Icons.receipt_long_outlined),
                ),
                items: widget.controller.allOrders
                    .map(
                      (order) => DropdownMenuItem<int>(
                        value: order.id,
                        child: Text(
                          '${order.orderCode} · ${order.customerName ?? 'Khách hàng'}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: _selectOrder,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _contentCtrl,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Nội dung xử lý',
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _add,
                icon: const Icon(Icons.note_add_outlined),
                label: const Text('Ghi chú'),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: notes.isEmpty
              ? const EmptyState(
                  message: 'Chọn đơn rồi ghi chú để xem lịch sử tại đây.',
                  icon: Icons.sticky_note_2_outlined,
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: notes.length,
                  itemBuilder: (context, i) => Card(
                    child: ListTile(
                      title: Text(notes[i].content),
                      subtitle: Text(
                        '${notes[i].createdByName ?? ''} · '
                        '${Formatters.dateTime(notes[i].createdAt)}',
                      ),
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}

class _SlaTab extends StatelessWidget {
  const _SlaTab({required this.controller});

  final SalesController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.slaWarnings.isEmpty) {
      return const EmptyState(
        message: 'Không có đơn nào vượt SLA.',
        icon: Icons.schedule,
      );
    }
    return RefreshIndicator(
      onRefresh: controller.loadSlaWarnings,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: controller.slaWarnings.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final order = controller.slaWarnings[i];
          return SlaBadge(
            orderCode: order.orderCode,
            label: order.isSlaBreached
                ? 'Quá hạn ${Formatters.duration(order.slaRemaining)}'
                : 'Còn ${Formatters.duration(order.slaRemaining)}',
            isBreached: order.isSlaBreached,
          );
        },
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.controller});

  final Order order;
  final SalesController controller;

  @override
  Widget build(BuildContext context) {
    final busy = controller.isBusy(order.id);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    order.orderCode,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                StatusBadge.order(OrderStatus.fromWire(order.status)),
              ],
            ),
            const SizedBox(height: 6),
            Text('KH: ${order.customerName ?? '—'} · ${order.phone ?? '—'}'),
            Text('Tổng: ${Formatters.currency(order.totalAmount)}'),
            if (order.slaDeadline != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    order.isSlaBreached ? Icons.error_outline : Icons.schedule,
                    size: 14,
                    color: order.isSlaBreached
                        ? AppColors.statusCancelled
                        : AppColors.statusSlaWarning,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Hạn SLA: ${Formatters.dateTime(order.slaDeadline)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: order.isSlaBreached
                          ? AppColors.statusCancelled
                          : AppColors.statusSlaWarning,
                      fontWeight: order.isSlaBreached
                          ? FontWeight.w700
                          : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: busy
                        ? null
                        : () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    OrderDetailPage(orderId: order.id),
                              ),
                            ),
                    child: const Text('Xem'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: PermissionGate(
                    permission: 'VERIFY_ORDER',
                    child: FilledButton(
                      onPressed: busy
                          ? null
                          : () async {
                              final result =
                                  await controller.confirmOrder(order.id);
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(result ?? 'Đã xác nhận đơn'),
                                ),
                              );
                            },
                      child: busy
                          ? const SizedBox(
                              height: 16,
                              width: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Xác nhận'),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
