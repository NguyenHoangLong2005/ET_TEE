import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/permission_gate.dart';
import '../../../../domain/repositories/auth_repository.dart';
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
  final _qtyCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();

  InventoryItem? _target;
  int? _selectedProductId;
  int? _selectedVariantId;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.mode == WarehouseMode.inbound) {
        _controller.loadInboundData();
      } else {
        _controller.loadInventory();
      }
    });
  }

  @override
  void dispose() {
    _controller.removeListener(_onChange);
    _controller.dispose();
    _qtyCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _inbound() async {
    final productId = _selectedProductId;
    final quantity = int.tryParse(_qtyCtrl.text.trim());
    if (productId == null || quantity == null || quantity <= 0) {
      _toast('Chọn sản phẩm và nhập số lượng lớn hơn 0');
      return;
    }
    if (_controller.productVariants.isNotEmpty && _selectedVariantId == null) {
      _toast('Chọn màu / kích cỡ cần nhập kho');
      return;
    }
    final product = _controller.catalog.firstWhere(
      (item) => (item['id'] as num?)?.toInt() == productId,
    );
    final result = await _controller.inbound(
      productId: productId,
      productName: product['name'] as String? ?? 'Sản phẩm #$productId',
      quantity: quantity,
      location:
          _locationCtrl.text.trim().isEmpty ? null : _locationCtrl.text.trim(),
      variantId: _selectedVariantId,
    );
    _toast(result ?? 'Đã nhập kho');
    if (result == null) {
      _qtyCtrl.clear();
      await _controller.loadInboundHistory();
    }
  }

  Future<void> _selectProduct(int? productId) async {
    setState(() {
      _selectedProductId = productId;
      _selectedVariantId = null;
    });
    if (productId != null) {
      await _controller.loadProductVariants(productId);
      if (mounted) setState(() {});
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
    if (!mounted) return;
    final difference = raw - expected;
    if (result != null) {
      _toast(result);
      return;
    }
    if (difference == 0) {
      _toast('Đã kiểm đếm: số lượng khớp hệ thống');
      return;
    }

    if (!(sl<AuthRepository>().cachedProfile?.has('ADJUST_STOCK') ?? false)) {
      _toast(
        'Đã kiểm đếm, chênh lệch ${difference > 0 ? '+' : ''}$difference. '
        'Cần quyền điều chỉnh kho để gửi duyệt.',
      );
      return;
    }

    final reason = await showDialog<String>(
      context: context,
      builder: (context) => _CountAdjustmentDialog(difference: difference),
    );
    if (!mounted) return;
    if (reason == null || reason.trim().isEmpty) {
      _toast(
        'Đã kiểm đếm, chênh lệch ${difference > 0 ? '+' : ''}$difference; '
        'chưa gửi yêu cầu điều chỉnh.',
      );
      return;
    }
    _toast(
      await _controller.createAdjustment(
            inventoryId,
            difference: difference,
            reason: reason.trim(),
          ) ??
          'Đã gửi phiếu điều chỉnh để chờ phê duyệt',
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _controller.inventory;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.mode == WarehouseMode.inbound
              ? 'Nhập kho'
              : 'Tồn kho & vị trí',
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
          if (_controller.errorMessage != null)
            MaterialBanner(
              content: Text(_controller.errorMessage!),
              leading: const Icon(Icons.error_outline),
              actions: [
                TextButton(
                  onPressed: widget.mode == WarehouseMode.inbound
                      ? _controller.loadInboundData
                      : _controller.loadInventory,
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (widget.mode == WarehouseMode.inbound) ...[
                    DropdownButtonFormField<int>(
                      initialValue: _selectedProductId,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Sản phẩm'),
                      items: _controller.catalog
                          .map((product) {
                            final id = (product['id'] as num?)?.toInt();
                            if (id == null) return null;
                            return DropdownMenuItem<int>(
                              value: id,
                              child: Text(
                                product['name'] as String? ?? 'Sản phẩm #$id',
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          })
                          .whereType<DropdownMenuItem<int>>()
                          .toList(),
                      onChanged: _selectProduct,
                    ),
                    if (_controller.productVariants.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      DropdownButtonFormField<int>(
                        initialValue: _selectedVariantId,
                        isExpanded: true,
                        decoration: const InputDecoration(
                          labelText: 'Màu / kích cỡ',
                        ),
                        items: _controller.productVariants
                            .map(
                              (variant) => DropdownMenuItem<int>(
                                value: variant.id,
                                child: Text(
                                  '${variant.label} · Tồn ${variant.availableQuantity ?? 0}',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (value) =>
                            setState(() => _selectedVariantId = value),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextField(
                      controller: _qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Số lượng nhập'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _locationCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Vị trí kho'),
                    ),
                    const SizedBox(height: 12),
                    PermissionGate(
                      permission: 'INBOUND_STOCK',
                      child: FilledButton.icon(
                        onPressed: _controller.isLoading ? null : _inbound,
                        icon: const Icon(Icons.move_to_inbox_outlined),
                        label: const Text('Ghi nhận nhập kho'),
                      ),
                    ),
                  ] else ...[
                    Text(
                      _target == null
                          ? 'Chọn một sản phẩm trong danh sách để cập nhật vị trí.'
                          : 'Đang chọn: ${_target!.productName}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _locationCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Vị trí lưu kho'),
                    ),
                    const SizedBox(height: 12),
                    PermissionGate(
                      permission: 'MANAGE_STOCK_LOCATION',
                      child: FilledButton.icon(
                        onPressed: _controller.isLoading ? null : _saveLocation,
                        icon: const Icon(Icons.place_outlined),
                        label: const Text('Lưu vị trí'),
                      ),
                    ),
                  ],
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
            child: widget.mode == WarehouseMode.inbound
                ? _inboundHistory()
                : _inventoryList(items),
          ),
        ],
      ),
    );
  }

  Widget _inboundHistory() {
    final receipts = _controller.inboundHistory;
    if (_controller.isLoading && receipts.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (receipts.isEmpty) {
      if (_controller.errorMessage != null) {
        return ErrorRetryView(
          message: _controller.errorMessage!,
          onRetry: () => _controller.loadInboundData(),
        );
      }
      return const EmptyState(message: 'Chưa có phiếu nhập kho nào.');
    }
    return RefreshIndicator(
      onRefresh: _controller.loadInboundHistory,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: receipts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final receipt = receipts[index];
          return Card(
            child: ListTile(
              leading: const CircleAvatar(
                child: Icon(Icons.move_to_inbox_outlined),
              ),
              title: Text(receipt.productName ?? 'Phiếu nhập #${receipt.id}'),
              subtitle: Text(
                'Nhập ${receipt.quantity ?? 0} · ${receipt.location ?? 'Chưa xếp vị trí'}\n'
                '${receipt.supplier == null ? '' : '${receipt.supplier} · '}${Formatters.dateTime(receipt.createdAt)}',
              ),
              isThreeLine: true,
            ),
          );
        },
      ),
    );
  }

  Widget _inventoryList(List<InventoryItem> items) {
    return _controller.isLoading && items.isEmpty
        ? const Center(child: CircularProgressIndicator())
        : items.isEmpty
            ? _controller.errorMessage == null
                ? const EmptyState(message: 'Kho đang trống.')
                : ErrorRetryView(
                    message: _controller.errorMessage!,
                    onRetry: () => _controller.loadInventory(),
                  )
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
                      trailing: PermissionGate(
                        permission: 'COUNT_STOCK',
                        child: IconButton(
                          tooltip: 'Kiểm đếm',
                          icon: const Icon(Icons.pin_outlined),
                          onPressed: () => _count(item.id, item.quantityOnHand),
                        ),
                      ),
                    ),
                  );
                },
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
        decoration: InputDecoration(
            labelText: 'Số lượng thực tế (dự kiến ${widget.expected})'),
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

class _CountAdjustmentDialog extends StatefulWidget {
  const _CountAdjustmentDialog({required this.difference});

  final int difference;

  @override
  State<_CountAdjustmentDialog> createState() => _CountAdjustmentDialogState();
}

class _CountAdjustmentDialogState extends State<_CountAdjustmentDialog> {
  late final _reasonCtrl = TextEditingController(
    text: 'Chênh lệch sau kiểm đếm',
  );

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: const Text('Gửi điều chỉnh chờ duyệt?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Chênh lệch: ${widget.difference > 0 ? '+' : ''}${widget.difference}',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _reasonCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Lý do'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Để sau'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(_reasonCtrl.text.trim()),
            child: const Text('Gửi duyệt'),
          ),
        ],
      );
}

/// Đề xuất nhập thêm: danh sách mã hàng dưới ngưỡng reorderLevel.
class WarehouseReplenishmentPage extends StatefulWidget {
  const WarehouseReplenishmentPage({super.key});

  @override
  State<WarehouseReplenishmentPage> createState() =>
      _WarehouseReplenishmentPageState();
}

class _WarehouseReplenishmentPageState
    extends State<WarehouseReplenishmentPage> {
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
                    ? _controller.errorMessage == null
                        ? const EmptyState(
                            message:
                                'Không có mã hàng nào dưới ngưỡng nhập lại.',
                            icon: Icons.check_circle_outline,
                          )
                        : ErrorRetryView(
                            message: _controller.errorMessage!,
                            onRetry: () => _controller.loadReplenishment(),
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
