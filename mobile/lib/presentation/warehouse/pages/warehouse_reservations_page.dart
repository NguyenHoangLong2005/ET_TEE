import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../domain/repositories/warehouse_repository.dart';
import '../controllers/warehouse_controller.dart';

/// Duyệt yêu cầu giữ hàng cho đơn.
class WarehouseReservationsPage extends StatefulWidget {
  const WarehouseReservationsPage({super.key});

  @override
  State<WarehouseReservationsPage> createState() =>
      _WarehouseReservationsPageState();
}

class _WarehouseReservationsPageState extends State<WarehouseReservationsPage> {
  late final WarehouseController _controller = sl<WarehouseController>();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _controller.loadReservations(),
    );
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

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _approve(StockReservation r) async {
    _toast(await _controller.approveReservation(r.id) ?? 'Đã duyệt');
  }

  Future<void> _reject(StockReservation reservation) async {
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => const _RejectDialog(),
    );
    if (reason == null || reason.trim().isEmpty) return;
    _toast(
      await _controller.rejectReservation(reservation.id, reason.trim()) ??
          'Đã từ chối',
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _controller.reservations;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Giữ hàng cho đơn'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _controller.isLoading ? null : _controller.loadReservations,
          ),
        ],
      ),
      body: _controller.isLoading && items.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : items.isEmpty
              ? const EmptyState(message: 'Không có yêu cầu giữ hàng nào.')
              : RefreshIndicator(
                  onRefresh: _controller.loadReservations,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final r = items[i];
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
                                      'Đơn #${r.orderId}',
                                      style: Theme.of(context).textTheme.titleMedium,
                                    ),
                                  ),
                                  Chip(
                                    label: Text(r.status),
                                    visualDensity: VisualDensity.compact,
                                  ),
                                ],
                              ),
                              Text('Sản phẩm: ${r.productName ?? '—'}'),
                              Text('Số lượng giữ: ${r.quantity}'),
                              if (r.rejectReason != null)
                                Text(
                                  'Lý do từ chối: ${r.rejectReason}',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              if (r.isPending) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: FilledButton(
                                        onPressed: () => _approve(r),
                                        child: const Text('Duyệt'),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: () => _reject(r),
                                        child: const Text('Từ chối'),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
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

class _RejectDialog extends StatefulWidget {
  const _RejectDialog();

  @override
  State<_RejectDialog> createState() => _RejectDialogState();
}

class _RejectDialogState extends State<_RejectDialog> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Lý do từ chối'),
      content: TextField(
        controller: _ctrl,
        autofocus: true,
        maxLines: 3,
        decoration: const InputDecoration(labelText: 'Nêu rõ lý do'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_ctrl.text),
          child: const Text('Từ chối'),
        ),
      ],
    );
  }
}

/// Phiếu điều chỉnh tồn kho, cần duyệt trước khi áp dụng.
class WarehouseAdjustmentsPage extends StatefulWidget {
  const WarehouseAdjustmentsPage({super.key});

  @override
  State<WarehouseAdjustmentsPage> createState() =>
      _WarehouseAdjustmentsPageState();
}

class _WarehouseAdjustmentsPageState extends State<WarehouseAdjustmentsPage> {
  late final WarehouseController _controller = sl<WarehouseController>();
  final _differenceCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  int? _inventoryId;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _controller.loadAdjustments(),
    );
  }

  @override
  void dispose() {
    _controller.removeListener(_onChange);
    _controller.dispose();
    _differenceCtrl.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _approveAdjustment(InventoryAdjustment a) async {
    _toast(await _controller.approveAdjustment(a.id) ?? 'Đã duyệt');
  }

  Future<void> _create() async {
    final id = _inventoryId;
    final difference = int.tryParse(_differenceCtrl.text.trim());
    final reason = _reasonCtrl.text.trim();
    if (id == null || difference == null || difference == 0) {
      _toast('Chọn mã tồn kho và nhập chênh lệch khác 0');
      return;
    }
    if (reason.isEmpty) {
      _toast('Cần nhập lý do điều chỉnh');
      return;
    }
    _toast(
      await _controller.createAdjustment(
        id,
        difference: difference,
        reason: reason,
      ) ??
          'Đã gửi phiếu điều chỉnh',
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _controller.adjustments;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Điều chỉnh chênh lệch'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _controller.isLoading ? null : _controller.loadAdjustments,
          ),
        ],
      ),
      body: Column(
        children: [
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<int>(
                    initialValue: _inventoryId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Mã tồn kho'),
                    items: _controller.inventory
                        .map(
                          (i) => DropdownMenuItem(
                            value: i.id,
                            child: Text('${i.productName} (#${i.id})'),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _inventoryId = v),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _differenceCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Chênh lệch (+/-)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _reasonCtrl,
                    decoration: const InputDecoration(labelText: 'Lý do'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _create,
                    icon: const Icon(Icons.send_outlined),
                    label: const Text('Gửi phiếu điều chỉnh'),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _controller.isLoading && items.isEmpty
                ? const ListSkeleton(itemCount: 4)
                : items.isEmpty
                    ? const EmptyState(message: 'Chưa có phiếu điều chỉnh nào.')
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final a = items[i];
                          return Card(
                            child: ListTile(
                              title: Text(a.reason),
                              subtitle: Text(
                                'Chênh lệch ${a.difference} · ${a.status}\n'
                                'Người tạo: ${a.requestedByName ?? '—'}\n'
                                '${Formatters.dateTime(a.createdAt)}',
                              ),
                              isThreeLine: true,
                              trailing: a.isPending
                                  ? FilledButton.tonal(
                                      onPressed: () => _approveAdjustment(a),
                                      child: const Text('Duyệt'),
                                    )
                                  : null,
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}