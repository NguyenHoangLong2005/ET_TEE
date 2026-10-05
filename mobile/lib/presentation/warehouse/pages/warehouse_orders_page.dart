import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../domain/entities/order_status.dart';
import '../controllers/warehouse_controller.dart';

/// Đơn kho cần xử lý: picking, đóng gói, in tem, bàn giao.
class WarehouseOrdersPage extends StatefulWidget {
  const WarehouseOrdersPage({super.key});

  @override
  State<WarehouseOrdersPage> createState() => _WarehouseOrdersPageState();
}

class _WarehouseOrdersPageState extends State<WarehouseOrdersPage> {
  late final WarehouseController _controller = sl<WarehouseController>();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback((_) => _controller.loadOrders());
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

  int _idOf(Map<String, dynamic> order) =>
      (order['id'] as num?)?.toInt() ?? 0;

  OrderStatus _statusOf(Map<String, dynamic> order) =>
      OrderStatus.fromWire('${order['status'] ?? ''}');

  Future<void> _run(Future<String?> Function() action, String fallback) async {
    final result = await action();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(result ?? fallback)),
    );
  }

  Future<void> _showLabel(int orderId) async {
    final info = await _controller.labelInfo(orderId);
    if (!mounted) return;
    if (info == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không lấy được thông tin tem')),
      );
      return;
    }
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Thông tin tem vận chuyển'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: info.entries
                .map((e) => Text('${e.key}: ${e.value}',
                    style: const TextStyle(fontSize: 13)))
                .toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orders = _controller.orders;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Đơn cần xử lý'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _controller.isLoading ? null : _controller.loadOrders,
          ),
        ],
      ),
      body: _controller.isLoading && orders.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : orders.isEmpty
              ? const EmptyState(message: 'Không có đơn nào cần xử lý.')
              : RefreshIndicator(
                  onRefresh: _controller.loadOrders,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: orders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final order = orders[i];
                      final status = _statusOf(order);
                      final orderId = _idOf(order);

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
                                      '${order['orderCode'] ?? '#$orderId'}',
                                      style: Theme.of(context).textTheme.titleMedium,
                                    ),
                                  ),
                                  Chip(
                                    label: Text(status.label),
                                    visualDensity: VisualDensity.compact,
                                  ),
                                ],
                              ),
                              Text(
                                'KH: ${order['customerName'] ?? '—'} · '
                                '${order['phone'] ?? '—'}',
                                style: const TextStyle(fontSize: 13),
                              ),
                              Text(
                                'Tổng: ${Formatters.currency((order['totalAmount'] as num?)?.toDouble())}',
                                style: const TextStyle(fontSize: 13),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  if (status == OrderStatus.confirmed)
                                    FilledButton.tonal(
                                      onPressed: () => _run(
                                        () => _controller.startPicking(orderId),
                                        'Đã bắt đầu lấy hàng',
                                      ),
                                      child: const Text('Bắt đầu lấy hàng'),
                                    ),
                                  if (status == OrderStatus.picking)
                                    FilledButton.tonal(
                                      onPressed: () => _run(
                                        () => _controller.completePicking(orderId),
                                        'Đã hoàn tất lấy hàng',
                                      ),
                                      child: const Text('Xác nhận lấy xong'),
                                    ),
                                  if (status == OrderStatus.picking ||
                                      status == OrderStatus.confirmed)
                                    OutlinedButton(
                                      onPressed: () => _run(
                                        () => _controller.pack(orderId),
                                        'Đã đóng gói',
                                      ),
                                      child: const Text('Đóng gói'),
                                    ),
                                  if (status == OrderStatus.packed)
                                    OutlinedButton.icon(
                                      onPressed: () => _showLabel(orderId),
                                      icon: const Icon(Icons.qr_code_2_outlined),
                                      label: const Text('In tem'),
                                    ),
                                  if (status == OrderStatus.packed)
                                    FilledButton.icon(
                                      onPressed: () => _run(
                                        () => _controller.handover(orderId),
                                        'Đã bàn giao',
                                      ),
                                      icon: const Icon(Icons.local_shipping_outlined),
                                      label: const Text('Bàn giao'),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}