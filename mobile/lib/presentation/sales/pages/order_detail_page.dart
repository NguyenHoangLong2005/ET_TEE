import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../domain/entities/order_status.dart';
import '../controllers/sales_controller.dart';

/// Chi tiết đơn: xác minh thông tin nhận hàng, ghi chú, yêu cầu giữ hàng,
/// xác nhận hoặc hủy.
class OrderDetailPage extends StatefulWidget {
  const OrderDetailPage({super.key, required this.orderId});

  final int orderId;

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  late final SalesController _controller = sl<SalesController>();

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  final _productCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController();
  final _cancelCtrl = TextEditingController();

  bool _prefilled = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
    WidgetsBinding.instance.addPostFrameCallback((_) => _controller.openOrder(widget.orderId));
  }

  @override
  void dispose() {
    _controller.removeListener(_onChange);
    _controller.dispose();
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _noteCtrl.dispose();
    _productCtrl.dispose();
    _qtyCtrl.dispose();
    _cancelCtrl.dispose();
    super.dispose();
  }

  void _onChange() {
    if (!mounted) return;
    setState(() => _prefillIfNeeded());
  }

  void _prefillIfNeeded() {
    if (_prefilled) return;
    final order = _controller.selected;
    if (order == null) return;
    _nameCtrl.text = order.customerName ?? '';
    _phoneCtrl.text = order.phone ?? '';
    _addressCtrl.text = order.address ?? '';
    _prefilled = true;
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _verify() async {
    final result = await _controller.verifyOrder(
      orderId: widget.orderId,
      customerName: _nameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
      shippingAddress: _addressCtrl.text.trim(),
    );
    if (!mounted) return;
    _toast(result ?? 'Đã xác minh thông tin nhận hàng');
  }

  Future<void> _addNote() async {
    final content = _noteCtrl.text.trim();
    if (content.isEmpty) {
      _toast('Nội dung ghi chú không được để trống');
      return;
    }
    final result = await _controller.addNote(widget.orderId, content);
    if (!mounted) return;
    _toast(result ?? 'Đã ghi chú');
    if (result == null) _noteCtrl.clear();
  }

  Future<void> _requestHold() async {
    final productId = int.tryParse(_productCtrl.text.trim());
    final qty = int.tryParse(_qtyCtrl.text.trim());
    if (productId == null || qty == null || qty <= 0) {
      _toast('Cần nhập mã sản phẩm và số lượng hợp lệ');
      return;
    }
    final result = await _controller.requestHold(widget.orderId, productId, qty);
    if (!mounted) return;
    _toast(result ?? 'Đã gửi yêu cầu giữ hàng');
  }

  Future<void> _cancel() async {
    final reason = _cancelCtrl.text.trim();
    if (reason.isEmpty) {
      _toast('Cần nhập lý do hủy đơn');
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy đơn hàng?'),
        content: Text('Lý do: $reason'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Quay lại'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Hủy đơn'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final result = await _controller.cancelOrder(widget.orderId, reason);
    if (!mounted) return;
    _toast(result ?? 'Đã hủy đơn');
  }

  Future<void> _confirm() async {
    final result = await _controller.confirmOrder(widget.orderId);
    if (!mounted) return;
    _toast(result ?? 'Đã xác nhận đơn');
  }

  @override
  Widget build(BuildContext context) {
    final order = _controller.selected;

    if (_controller.isLoading && order == null) {
      return Scaffold(
        appBar: AppBar(title: Text('Đơn #${widget.orderId}')),
        body: const ListSkeleton(itemCount: 5),
      );
    }

    if (order == null) {
      return Scaffold(
        appBar: AppBar(title: Text('Đơn #${widget.orderId}')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_controller.errorMessage ?? 'Không tải được đơn hàng'),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => _controller.openOrder(widget.orderId),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final busy = _controller.isBusy(order.id);

    return Scaffold(
      appBar: AppBar(
        title: Text(order.orderCode),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: busy ? null : () => _controller.openOrder(order.id),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _Section(
            title: 'Thông tin đơn',
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(child: Text(order.orderCode)),
                    StatusBadge.order(OrderStatus.fromWire(order.status)),
                  ],
                ),
                const SizedBox(height: 6),
                Text('Tổng: ${Formatters.currency(order.totalAmount)}'),
                Text('Thanh toán: ${order.isCod ? 'COD' : 'Chuyển khoản'}'),
                if (order.slaDeadline != null)
                  Text('Hạn SLA: ${Formatters.dateTime(order.slaDeadline)}'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Section(
            title: 'Xác minh thông tin nhận hàng',
            child: Column(
              children: [
                TextField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(labelText: 'Tên người nhận'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Số điện thoại'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _addressCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Địa chỉ nhận hàng'),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: busy ? null : _verify,
                  icon: const Icon(Icons.verified_outlined),
                  label: const Text('Lưu thông tin đã xác minh'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Section(
            title: 'Xác nhận / Hủy đơn',
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: busy ? null : _confirm,
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('Xác nhận'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _cancelCtrl,
                  decoration: const InputDecoration(labelText: 'Lý do hủy đơn'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: busy ? null : _cancel,
                  icon: const Icon(Icons.cancel_outlined),
                  label: const Text('Hủy đơn hàng'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Section(
            title: 'Yêu cầu giữ hàng',
            child: Column(
              children: [
                TextField(
                  controller: _productCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Mã sản phẩm',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _qtyCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Số lượng giữ'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: busy ? null : _requestHold,
                  icon: const Icon(Icons.lock_outline),
                  label: const Text('Gửi yêu cầu giữ hàng'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Section(
            title: 'Ghi chú xử lý',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _noteCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Nội dung ghi chú'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: busy ? null : _addNote,
                  icon: const Icon(Icons.note_add_outlined),
                  label: const Text('Thêm ghi chú'),
                ),
                const SizedBox(height: 12),
                if (_controller.notes.isEmpty)
                  const Text(
                    'Chưa có ghi chú nào.',
                    style: TextStyle(fontSize: 13),
                  )
                else
                  ..._controller.notes.map(
                    (n) => ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(n.content, style: const TextStyle(fontSize: 13)),
                      subtitle: Text(
                        '${n.createdByName ?? ''} · '
                        '${Formatters.dateTime(n.createdAt)}',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}