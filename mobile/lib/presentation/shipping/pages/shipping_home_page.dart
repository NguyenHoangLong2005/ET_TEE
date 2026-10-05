import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/role_shell.dart';
import '../../../../core/widgets/stat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../domain/entities/order_status.dart';
import '../../../../domain/repositories/shipping_repository.dart';
import '../controllers/shipping_controller.dart';

/// Vận chuyển: Kiện đã đóng gói · Vận đơn · Ngoại lệ · COD
class ShippingHomePage extends StatefulWidget {
  const ShippingHomePage({super.key});

  @override
  State<ShippingHomePage> createState() => _ShippingHomePageState();
}

class _ShippingHomePageState extends State<ShippingHomePage>
    with SingleTickerProviderStateMixin {
  late final ShippingController _controller = sl<ShippingController>();
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

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  /// Tai ca 4 nhom du lieu o mot lan: kien sang sang, van don, ngoai le, COD.
  Future<void> _loadEverything() async {
    await _controller.loadReadyPackages();
    await _controller.loadShipments();
    await _controller.loadExceptions();
    await _controller.loadCod();
  }

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      title: 'Vận chuyển',
      controller: _controller,
      onRefresh: _loadEverything,
      stats: [
        StatCard(
          label: 'Kiện chờ giao',
          value: '${_controller.readyPackages.length}',
          icon: Icons.inventory_2_outlined,
          onTap: () => _tabs.animateTo(0),
        ),
        StatCard(
          label: 'Đang vận chuyển',
          value: '${_controller.inTransitCount}',
          icon: Icons.local_shipping_outlined,
          onTap: () => _tabs.animateTo(1),
        ),
        StatCard(
          label: 'Ngoại lệ',
          value: '${_controller.openExceptions.length}',
          icon: Icons.report_problem_outlined,
          color: _controller.openExceptions.isEmpty
              ? null
              : AppColors.statusCancelled,
          onTap: () => _tabs.animateTo(2),
        ),
        StatCard(
          label: 'COD chờ đối soát',
          value: Formatters.currency(_controller.pendingCodTotal),
          icon: Icons.payments_outlined,
          color:
              _controller.pendingCodTotal > 0 ? AppColors.statusPicking : null,
          onTap: () => _tabs.animateTo(3),
        ),
      ],
      bottom: TabBar(
        controller: _tabs,
        isScrollable: true,
        tabs: [
          Tab(text: 'Kiện sẵn sàng (${_controller.readyPackages.length})'),
          Tab(text: 'Vận đơn (${_controller.shipments.length})'),
          Tab(text: 'Ngoại lệ (${_controller.openExceptions.length})'),
          Tab(text: 'COD (${_controller.pendingCod.length})'),
        ],
      ),
      body: _controller.isLoading && _controller.shipments.isEmpty
          ? const ListSkeleton(itemCount: 5)
          : TabBarView(
              controller: _tabs,
              children: [
                _ReadyTab(controller: _controller, onToast: _toast),
                _ShipmentsTab(controller: _controller, onToast: _toast),
                _ExceptionsTab(controller: _controller, onToast: _toast),
                _CodTab(controller: _controller, onToast: _toast),
              ],
            ),
    );
  }
}

typedef ToastFn = void Function(String message);

class _ReadyTab extends StatelessWidget {
  const _ReadyTab({required this.controller, required this.onToast});

  final ShippingController controller;
  final ToastFn onToast;

  Future<void> _createShipment(
    BuildContext context,
    ReadyPackage item,
  ) async {
    final carrier = await showDialog<String>(
      context: context,
      builder: (ctx) => const _CarrierDialog(),
    );
    if (carrier == null || carrier.trim().isEmpty) return;
    if (!context.mounted) return;

    final tracking = await showDialog<String>(
      context: context,
      builder: (ctx) => const _TrackingDialog(),
    );

    final result = await controller.createShipment(
      orderId: item.orderId,
      carrierName: carrier.trim(),
      trackingCode: tracking?.trim(),
      codAmount: item.isCod ? item.codAmount : null,
    );
    onToast(result ?? 'Đã tạo vận đơn');
  }

  @override
  Widget build(BuildContext context) {
    final items = controller.readyPackages;
    if (items.isEmpty) {
      return const EmptyState(
        message: 'Chưa có kiện nào đã đóng gói.',
        icon: Icons.local_shipping_outlined,
      );
    }

    return RefreshIndicator(
      onRefresh: controller.loadReadyPackages,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final p = items[i];
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
                          p.orderCode,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      if (p.isCod)
                        Chip(
                          label: Text('COD ${Formatters.currency(p.codAmount)}'),
                          visualDensity: VisualDensity.compact,
                        ),
                    ],
                  ),
                  Text('KH: ${p.customerName ?? '—'} · ${p.phone ?? '—'}'),
                  Text('Địa chỉ: ${p.shippingAddress ?? '—'}'),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: controller.isBusy(p.orderId)
                              ? null
                              : () => _createShipment(context, p),
                          icon: const Icon(Icons.qr_code_2_outlined),
                          label: const Text('Tạo vận đơn'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ShipmentsTab extends StatelessWidget {
  const _ShipmentsTab({required this.controller, required this.onToast});

  final ShippingController controller;
  final ToastFn onToast;

  Future<void> _confirmHandover(Shipment s) async {
    onToast(
      await controller.confirmHandover(s.id) ?? 'Đã xác nhận bàn giao',
    );
  }

  Future<void> _startShipping(Shipment s) async {
    onToast(await controller.startShipping(s.id) ?? 'Đã bắt đầu giao hàng');
  }

  Future<void> _attachTracking(BuildContext context, Shipment s) async {
    final code = await showDialog<String>(
      context: context,
      builder: (ctx) => const _TrackingDialog(),
    );
    if (code == null || code.trim().isEmpty) return;
    onToast(
      await controller.attachTrackingCode(s.id, code.trim()) ??
          'Đã gắn mã vận đơn',
    );
  }

  Future<void> _submitPod(BuildContext context, Shipment s) async {
    final proof = await showDialog<PodProof>(
      context: context,
      builder: (ctx) => const _PodDialog(),
    );
    if (proof == null) return;
    onToast(
      await controller.submitPod(s.id, proof) ?? 'Đã gửi bằng chứng giao hàng',
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = controller.shipments;
    if (items.isEmpty) {
      return const EmptyState(message: 'Chưa có vận đơn nào.');
    }

    return RefreshIndicator(
      onRefresh: controller.loadShipments,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final s = items[i];
          final busy = controller.isBusy(s.id);
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
                          s.orderCode ?? '#${s.orderId ?? s.id}',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      StatusBadge.shipment(s.status),
                    ],
                  ),
                  Text('Hãng: ${s.carrierName ?? '—'}'),
                  Text('Mã vận đơn: ${s.trackingCode ?? '—'}'),
                  if (s.isCod)
                    Text('COD: ${Formatters.currency(s.codAmount)}'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (s.trackingCode == null)
                        OutlinedButton(
                          onPressed: busy ? null : () => _attachTracking(context, s),
                          child: const Text('Gắn mã vận đơn'),
                        ),
                      if (s.status == ShipmentStatus.pending ||
                          s.status == ShipmentStatus.handedOver)
                        FilledButton.tonal(
                          onPressed: busy ? null : () => _confirmHandover(s),
                          child: const Text('Xác nhận bàn giao'),
                        ),
                      if (s.status == ShipmentStatus.handedOver)
                        FilledButton.tonal(
                          onPressed: busy ? null : () => _startShipping(s),
                          child: const Text('Bắt đầu giao'),
                        ),
                      if (s.status == ShipmentStatus.inTransit ||
                          s.status == ShipmentStatus.handedOver)
                        OutlinedButton.icon(
                          onPressed: busy ? null : () => _submitPod(context, s),
                          icon: const Icon(Icons.photo_camera_outlined),
                          label: const Text('Bằng chứng giao hàng'),
                        ),
                      if (s.status == ShipmentStatus.inTransit ||
                          s.status == ShipmentStatus.handedOver)
                        TextButton.icon(
                          onPressed: busy
                              ? null
                              : () => _createException(context, s),
                          icon: const Icon(Icons.report_problem_outlined),
                          label: const Text('Báo ngoại lệ'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _createException(BuildContext context, Shipment s) async {
    final result = await showDialog<(String, String)>(
      context: context,
      builder: (ctx) => const _ExceptionDialog(),
    );
    if (result == null) return;
    onToast(
      await controller.createException(
        shipmentId: s.id,
        type: result.$1,
        description: result.$2,
      ) ??
          'Đã ghi nhận ngoại lệ',
    );
  }
}

class _ExceptionsTab extends StatelessWidget {
  const _ExceptionsTab({required this.controller, required this.onToast});

  final ShippingController controller;
  final ToastFn onToast;

  Future<void> _resolve(ShippingException e, int shipmentId) async {
    onToast(
      await controller.resolveException(shipmentId, e.id) ?? 'Đã xử lý ngoại lệ',
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = controller.exceptions;
    if (items.isEmpty) {
      return const EmptyState(
        message: 'Không có ngoại lệ giao hàng nào.',
        icon: Icons.check_circle_outline,
      );
    }

    return RefreshIndicator(
      onRefresh: controller.loadExceptions,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final e = items[i];
          final shipmentId = e.shipmentId ?? 0;
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text('Loại: ${e.type}')),
                      Chip(
                        label: Text(e.status),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                  Text('Đơn: ${e.orderCode ?? '—'}'),
                  if (e.description != null) Text('Mô tả: ${e.description}'),
                  Text('Thời điểm: ${Formatters.dateTime(e.occurredAt)}'),
                  if (e.isOpen && e.shipmentId != null)
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => _resolve(e, shipmentId),
                        child: const Text('Đánh dấu đã xử lý'),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _CodTab extends StatelessWidget {
  const _CodTab({required this.controller, required this.onToast});

  final ShippingController controller;
  final ToastFn onToast;

  Future<void> _reconcile(PendingCod c) async {
    onToast(await controller.reconcileCod(c.shipmentId) ?? 'Đã đối soát');
  }

  @override
  Widget build(BuildContext context) {
    final pending = controller.pendingCod;

    return RefreshIndicator(
      onRefresh: controller.loadCod,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.payments_outlined),
              title: const Text('Tổng COD chờ đối soát'),
              subtitle: Text(
                '${pending.length} kiện · '
                '${Formatters.currency(controller.pendingCodTotal)}',
                style: const TextStyle(fontSize: 15),
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (pending.isEmpty)
            const EmptyState(
              message: 'Không có COD nào chờ đối soát.',
              icon: Icons.receipt_long_outlined,
            )
          else
            ...pending.map(
              (c) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(c.orderCode ?? 'Kiện #${c.shipmentId}'),
                  subtitle: Text(
                    'Hãng: ${c.carrierName ?? '—'}\n'
                    '${Formatters.currency(c.codAmount)}',
                  ),
                  isThreeLine: true,
                  trailing: FilledButton.tonal(
                    onPressed: controller.isBusy(c.shipmentId)
                        ? null
                        : () => _reconcile(c),
                    child: const Text('Đối soát'),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 24),
          Text('Lịch sử đối soát', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (controller.reconciliations.isEmpty)
            const Text('Chưa có phiếu đối soát nào.')
          else
            ...controller.reconciliations.map(
              (r) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(r.reconciliationCode),
                  subtitle: Text(
                    '${Formatters.currency(r.totalCodAmount)} · '
                    '${r.reconciledByName ?? '—'} · '
                    '${Formatters.dateTime(r.reconciledAt)}',
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────

class _CarrierDialog extends StatefulWidget {
  const _CarrierDialog();

  @override
  State<_CarrierDialog> createState() => _CarrierDialogState();
}

class _CarrierDialogState extends State<_CarrierDialog> {
  final _ctrl = TextEditingController(text: 'Giao Hàng Nhanh');

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Chọn hãng vận chuyển'),
      content: TextField(
        controller: _ctrl,
        autofocus: true,
        decoration: const InputDecoration(labelText: 'Tên hãng'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_ctrl.text),
          child: const Text('Tiếp tục'),
        ),
      ],
    );
  }
}

class _TrackingDialog extends StatefulWidget {
  const _TrackingDialog();

  @override
  State<_TrackingDialog> createState() => _TrackingDialogState();
}

class _TrackingDialogState extends State<_TrackingDialog> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Mã vận đơn'),
      content: TextField(
        controller: _ctrl,
        autofocus: true,
        decoration: const InputDecoration(
          labelText: 'Mã vận đơn (để trống nếu chưa có)',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Bỏ qua'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_ctrl.text),
          child: const Text('Lưu'),
        ),
      ],
    );
  }
}

class _PodDialog extends StatefulWidget {
  const _PodDialog();

  @override
  State<_PodDialog> createState() => _PodDialogState();
}

class _PodDialogState extends State<_PodDialog> {
  final _nameCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    _urlCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Bằng chứng giao hàng'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Tên người nhận'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _urlCtrl,
              decoration: const InputDecoration(
                labelText: 'Ảnh chụp (URL)',
                helperText: 'Nhập URL ảnh sau khi tải lên',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Ghi chú'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () {
            if (_nameCtrl.text.trim().isEmpty) return;
            Navigator.of(context).pop(
              PodProof(
                receiverName: _nameCtrl.text.trim(),
                imageUrl: _urlCtrl.text.trim().isEmpty
                    ? null
                    : _urlCtrl.text.trim(),
                note: _noteCtrl.text.trim().isEmpty
                    ? null
                    : _noteCtrl.text.trim(),
              ),
            );
          },
          child: const Text('Gửi'),
        ),
      ],
    );
  }
}

class _ExceptionDialog extends StatefulWidget {
  const _ExceptionDialog();

  @override
  State<_ExceptionDialog> createState() => _ExceptionDialogState();
}

class _ExceptionDialogState extends State<_ExceptionDialog> {
  static const _types = ['KHONG_NHAN', 'SAI_DIA_CHI', 'HANG_HONG', 'KHONG_THANH_TOAN'];

  String _type = _types.first;
  final _descCtrl = TextEditingController();

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Báo ngoại lệ giao hàng'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Loại ngoại lệ'),
            items: _types
                .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                .toList(),
            onChanged: (v) => setState(() => _type = v ?? _type),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descCtrl,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Mô tả'),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop((_type, _descCtrl.text.trim())),
          child: const Text('Gửi'),
        ),
      ],
    );
  }
}