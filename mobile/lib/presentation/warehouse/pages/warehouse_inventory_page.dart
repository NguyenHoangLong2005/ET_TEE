import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../domain/repositories/warehouse_repository.dart';
import '../controllers/warehouse_controller.dart';
import 'warehouse_home_page.dart';

/// Tồn kho + vị trí, và đề xuất nhập thêm.
class WarehouseInventoryPage extends StatefulWidget {
  const WarehouseInventoryPage({super.key, required this.mode});

  final WarehouseMode mode;

  @override
  State<WarehouseInventoryPage> createState() => _WarehouseInventoryPageState();
}

class _WarehouseInventoryPageState extends State<WarehouseInventoryPage> {
  late final WarehouseController _controller = sl<WarehouseController>();
  final _productIdCtrl = TextEditingController();
  final _productNameCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();

  InventoryItem? _target;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback((_) => _controller.loadInventory());
  }

  @override
  void dispose() {
    _controller.removeListener(_onChange);
    _controller.dispose();
    _productIdCtrl.dispose();
    _productNameCtrl.dispose();
    _qtyCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _inbound() async {
    final productId = int.tryParse(_productIdCtrl.text.trim());
    final quantity = int.tryParse(_qtyCtrl.text.trim());
    if (productId == null || quantity == null || quantity <= 0) {
      _toast('Cần nhập mã sản phẩm và số lượng > 0');
      return;
    }
    final result = await _controller.inbound(
      productId: productId,
      productName: _productNameCtrl.text.trim().isEmpty
          ? 'Sản phẩm #$productId'
          : _productNameCtrl.text.trim(),
      quantity: quantity,
      location: _locationCtrl.text.trim().isEmpty
          ? null
          : _locationCtrl.text.trim(),
    );
    _toast(result ?? 'Đã nhập kho');
    if (result == null) {
      _qtyCtrl.clear();
      _target = null;
    }
  }

  Future<void> _saveLocation() async {
    final target = _target;
    if (target == null) {
      _toast('Chọn một dòng tồn kho trước');
      return;
    }
    final location = _locationCtrl.text.trim();
    if (location.isEmpty) {
      _toast('Vị trí không được để trống');
      return;
    }
    final result = await _controller.updateLocation(target.id, location);
    _toast(result ?? 'Đã cập nhật vị trí');
    if (result == null) {
      _target = null;
      _locationCtrl.clear();
    }
  }

  Future<void> _count(int inventoryId, int expected) async {
    final raw = await showDialog<int>(
      context: context,
      builder: (ctx) => _CountDialog(expected: expected),
    );
    if (raw == null) return;
    final result = await _controller.countInbound(inventoryId, raw);
    _toast(result ?? 'Đã cập nhật kiểm đếm');
  }

  @override
  Widget build(BuildContext context) {
    final items = _controller.inventory;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.mode == WarehouseMode.inbound ? 'Nhập kho' : 'Tồn kho & vị trí',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _controller.isLoading ? null : _controller.loadInventory,
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
                  TextField(
                    controller: _productIdCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Mã sản phẩm'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _productNameCtrl,
                    decoration: const InputDecoration(labelText: 'Tên sản phẩm'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _qtyCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Số lượng nhập'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _locationCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Vị trí kho',
                      helperText: 'Dùng chung cho nhập kho và cập nhật vị trí',
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _inbound,
                          icon: const Icon(Icons.move_to_inbox_outlined),
                          label: const Text('Nhập kho'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _saveLocation,
                          icon: const Icon(Icons.place_outlined),
                          label: const Text('Lưu vị trí'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (_target != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Đang chọn: ${_target!.productName}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _target = null),
                  ),
                ],
              ),
            ),
          const Divider(height: 1),
          Expanded(
            child: _controller.isLoading && items.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : items.isEmpty
                    ? const EmptyState(message: 'Kho đang trống.')
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final item = items[i];
                          final selected = _target?.id == item.id;
                          return Card(
                            child: ListTile(
                              selected: selected,
                              title: Text(item.productName),
                              subtitle: Text(
                                'Có ${item.quantityOnHand} · Giữ ${item.quantityReserved} · '
                                'Khả dụng ${item.available}\n'
                                'Vị trí: ${item.warehouseLocation ?? '—'}',
                              ),
                              isThreeLine: true,
                              onTap: () => setState(() {
                                _target = item;
                                _locationCtrl.text = item.warehouseLocation ?? '';
                              }),
                              trailing: IconButton(
                                tooltip: 'Kiểm đếm',
                                icon: const Icon(Icons.pin_outlined),
                                onPressed: () => _count(item.id, item.quantityOnHand),
                              ),
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

class _CountDialog extends StatefulWidget {
  const _CountDialog({required this.expected});

  final int expected;

  @override
  State<_CountDialog> createState() => _CountDialogState();
}

class _CountDialogState extends State<_CountDialog> {
  late final _ctrl = TextEditingController(text: '${widget.expected}');

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Kiểm đếm'),
      content: TextField(
        controller: _ctrl,
        keyboardType: TextInputType.number,
        autofocus: true,
        decoration: InputDecoration(labelText: 'Số lượng thực tế (dự kiến ${widget.expected})'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () =>
              Navigator.of(context).pop(int.tryParse(_ctrl.text.trim())),
          child: const Text('Lưu'),
        ),
      ],
    );
  }
}

/// Đề xuất nhập thêm: danh sách mã hàng dưới ngưỡng reorderLevel.
class WarehouseReplenishmentPage extends StatefulWidget {
  const WarehouseReplenishmentPage({super.key});

  @override
  State<WarehouseReplenishmentPage> createState() =>
      _WarehouseReplenishmentPageState();
}

class _WarehouseReplenishmentPageState extends State<WarehouseReplenishmentPage> {
  late final WarehouseController _controller = sl<WarehouseController>();
  final _qtyCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _controller.loadReplenishment(),
    );
  }

  @override
  void dispose() {
    _controller.removeListener(_onChange);
    _controller.dispose();
    _qtyCtrl.dispose();
    super.dispose();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  Future<void> _propose(ReplenishmentItem item) async {
    final quantity = int.tryParse(_qtyCtrl.text.trim());
    if (quantity == null || quantity <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cần nhập số lượng đề xuất > 0')),
      );
      return;
    }
    final result = await _controller.proposeRestock(
      inventoryId: item.id,
      quantity: quantity,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(result ?? 'Đã gửi đề xuất')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _controller.replenishment;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Đề xuất nhập thêm'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed:
                _controller.isLoading ? null : _controller.loadReplenishment,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _qtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Số lượng đề xuất nhập',
              ),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _controller.isLoading && items.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : items.isEmpty
                    ? const EmptyState(
                        message: 'Không có mã hàng nào dưới ngưỡng nhập lại.',
                        icon: Icons.check_circle_outline,
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final item = items[i];
                          return Card(
                            child: ListTile(
                              title: Text(item.productName),
                              subtitle: Text(
                                'Khả dụng ${item.available} · Ngưỡng nhập lại ${item.reorderLevel}',
                              ),
                              trailing: OutlinedButton(
                                onPressed: () => _propose(item),
                                child: const Text('Đề xuất'),
                              ),
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