import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../domain/repositories/warehouse_repository.dart';
import '../controllers/warehouse_controller.dart';

/// Kiểm kê tồn kho: tạo phiếu theo vị trí rồi ghi số đếm thực tế.
class WarehouseStocktakePage extends StatefulWidget {
  const WarehouseStocktakePage({super.key});

  @override
  State<WarehouseStocktakePage> createState() => _WarehouseStocktakePageState();
}

class _WarehouseStocktakePageState extends State<WarehouseStocktakePage> {
  late final WarehouseController _controller = sl<WarehouseController>();
  final _locationCtrl = TextEditingController();
  int _createdBy = 0;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _controller.loadStocktakes();
      _controller.loadInventory();
    });
  }

  @override
  void dispose() {
    _controller.removeListener(_onChange);
    _controller.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _create() async {
    final location = _locationCtrl.text.trim();
    if (location.isEmpty) {
      _toast('Cần nhập vị trí cần kiểm kê');
      return;
    }
    _toast(
      await _controller.createStocktake(
        warehouseLocation: location,
        createdBy: _createdBy,
      ) ??
          'Đã tạo phiếu kiểm kê',
    );
  }

  Future<void> _submitCount(Stocktake item) async {
    final raw = await showDialog<int>(
      context: context,
      builder: (ctx) => const _ActualDialog(),
    );
    if (raw == null) return;
    _toast(
      await _controller.submitStocktake(item.id, raw) ?? 'Đã ghi nhận kiểm kê',
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _controller.stocktakes;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kiểm kê tồn kho'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _controller.isLoading ? null : _controller.loadStocktakes,
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
                    controller: _locationCtrl,
                    decoration: const InputDecoration(labelText: 'Vị trí kiểm kê'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    initialValue: '0',
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'ID người kiểm kê',
                    ),
                    onChanged: (v) => _createdBy = int.tryParse(v.trim()) ?? 0,
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _create,
                    icon: const Icon(Icons.add_task),
                    label: const Text('Tạo phiếu kiểm kê'),
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
                    ? const EmptyState(message: 'Chưa có phiếu kiểm kê nào.')
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final s = items[i];
                          return Card(
                            child: ListTile(
                              title: Text(s.warehouseLocation ?? '—'),
                              subtitle: Text(
                                'Trạng thái: ${s.status}\n${Formatters.dateTime(s.createdAt)}',
                              ),
                              isThreeLine: true,
                              trailing: s.status != 'COMPLETED'
                                  ? OutlinedButton(
                                      onPressed: () => _submitCount(s),
                                      child: const Text('Nhập số'),
                                    )
                                  : const Icon(Icons.check, size: 18),
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

class _ActualDialog extends StatefulWidget {
  const _ActualDialog();

  @override
  State<_ActualDialog> createState() => _ActualDialogState();
}

class _ActualDialogState extends State<_ActualDialog> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Số lượng thực tế'),
      content: TextField(
        controller: _ctrl,
        keyboardType: TextInputType.number,
        autofocus: true,
        decoration: const InputDecoration(labelText: 'Số đếm được'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(int.tryParse(_ctrl.text.trim())),
          child: const Text('Lưu'),
        ),
      ],
    );
  }
}