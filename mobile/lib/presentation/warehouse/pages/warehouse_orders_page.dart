import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/permission_gate.dart';
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
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _controller.loadOrders());
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

  int _idOf(Map<String, dynamic> order) => (order['id'] as num?)?.toInt() ?? 0;

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
          FilledButton.icon(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await _printLabel(info, orderId);
            },
            icon: const Icon(Icons.print_outlined),
            label: const Text('In tem'),
          ),
        ],
      ),
    );
  }

  Future<void> _printLabel(Map<String, dynamic> info, int orderId) async {
    try {
      var font = pw.Font.helvetica();
      const androidFontPath = '/system/fonts/Roboto-Regular.ttf';
      final androidFont = File(androidFontPath);
      if (Platform.isAndroid && await androidFont.exists()) {
        font =
            pw.Font.ttf(ByteData.sublistView(await androidFont.readAsBytes()));
      }

      final document = pw.Document();
      final orderCode = info['orderCode']?.toString() ?? '#$orderId';
      document.addPage(
        pw.Page(
          pageFormat: const PdfPageFormat(
              100 * PdfPageFormat.mm, 150 * PdfPageFormat.mm),
          theme: pw.ThemeData.withFont(base: font),
          build: (context) => pw.Padding(
            padding: const pw.EdgeInsets.all(8),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                pw.Text(
                  'ET TEE  |  SHIPPING LABEL',
                  style: const pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.Divider(),
                pw.Text(
                  orderCode,
                  style: const pw.TextStyle(
                    fontSize: 19,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 8),
                pw.BarcodeWidget(
                  barcode: pw.Barcode.qrCode(),
                  data: orderCode,
                  width: 76,
                  height: 76,
                ),
                pw.SizedBox(height: 8),
                _labelLine('NGƯỜI NHẬN', info['receiver']),
                _labelLine('ĐIỆN THOẠI', info['phone']),
                _labelLine('ĐỊA CHỈ', info['address']),
                _labelLine('THANH TOÁN', info['paymentMethod']),
                _labelLine('COD', '${info['codAmount'] ?? 0} VND'),
                _labelLine('SỐ SẢN PHẨM', info['itemCount']),
              ],
            ),
          ),
        ),
      );

      await Printing.layoutPdf(
        name: 'ET-TEE-$orderCode',
        onLayout: (_) => document.save(),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Không thể in tem: $error')),
      );
    }
  }

  pw.Widget _labelLine(String label, Object? value) => pw.Padding(
        padding: const pw.EdgeInsets.symmetric(vertical: 3),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              label,
              style: const pw.TextStyle(
                fontSize: 8,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            pw.Text(value?.toString() ?? '—',
                style: const pw.TextStyle(fontSize: 10)),
          ],
        ),
      );

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
              ? _controller.errorMessage == null
                  ? const EmptyState(message: 'Không có đơn nào cần xử lý.')
                  : ErrorRetryView(
                      message: _controller.errorMessage!,
                      onRetry: () => _controller.loadOrders(),
                    )
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
                      final orderItems =
                          order['items'] as List<dynamic>? ?? const [];

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
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium,
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
                              if (order['shippingAddress'] != null)
                                Text(
                                  'Giao tới: ${order['shippingAddress']}',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              Text(
                                'Tổng: ${Formatters.currency(((order['total'] ?? order['totalAmount']) as num?)?.toDouble())}',
                                style: const TextStyle(fontSize: 13),
                              ),
                              if (orderItems.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                const Divider(height: 1),
                                ...orderItems.map((rawItem) {
                                  final item = rawItem as Map<String, dynamic>;
                                  final variant = [
                                    item['color'],
                                    item['size'],
                                  ]
                                      .where((value) =>
                                          value != null &&
                                          value.toString().isNotEmpty)
                                      .join(' · ');
                                  final location =
                                      item['warehouseLocation'] as String?;
                                  final available =
                                      (item['availableQuantity'] as num?)
                                          ?.toInt();
                                  return Padding(
                                    padding:
                                        const EdgeInsets.symmetric(vertical: 6),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Icon(
                                          Icons.inventory_2_outlined,
                                          size: 18,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                item['productName']
                                                        as String? ??
                                                    'Sản phẩm',
                                                style: const TextStyle(
                                                    fontWeight:
                                                        FontWeight.w600),
                                              ),
                                              Text(
                                                [
                                                  if (variant.isNotEmpty)
                                                    variant,
                                                  'Vị trí ${location ?? 'chưa xếp'}',
                                                  if (available != null)
                                                    'Khả dụng $available',
                                                ].join(' · '),
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .bodySmall,
                                              ),
                                            ],
                                          ),
                                        ),
                                        Text(
                                          '×${(item['quantity'] as num?)?.toInt() ?? 0}',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w700),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                              ],
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  if (status == OrderStatus.confirmed)
                                    PermissionGate(
                                      permission: 'PICK_PACK_LABEL',
                                      child: FilledButton.tonal(
                                        onPressed: () => _run(
                                          () =>
                                              _controller.startPicking(orderId),
                                          'Đã bắt đầu lấy hàng',
                                        ),
                                        child: const Text('Bắt đầu lấy hàng'),
                                      ),
                                    ),
                                  if (status == OrderStatus.picking)
                                    PermissionGate(
                                      permission: 'PICK_PACK_LABEL',
                                      child: FilledButton.tonal(
                                        onPressed: () => _run(
                                          () => _controller
                                              .completePicking(orderId),
                                          'Đã lấy hàng và đóng gói',
                                        ),
                                        child: const Text(
                                          'Hoàn tất lấy hàng & đóng gói',
                                        ),
                                      ),
                                    ),
                                  if (status == OrderStatus.packed)
                                    PermissionGate(
                                      permission: 'PICK_PACK_LABEL',
                                      child: OutlinedButton.icon(
                                        onPressed: () => _showLabel(orderId),
                                        icon: const Icon(
                                            Icons.qr_code_2_outlined),
                                        label: const Text('Xem tem'),
                                      ),
                                    ),
                                  if (status == OrderStatus.packed)
                                    PermissionGate(
                                      permission: 'HANDOVER_SHIPPING',
                                      child: FilledButton.icon(
                                        onPressed: () => _run(
                                          () => _controller.handover(orderId),
                                          'Đã bàn giao',
                                        ),
                                        icon: const Icon(
                                            Icons.local_shipping_outlined),
                                        label: const Text('Bàn giao'),
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
                ),
    );
  }
}
