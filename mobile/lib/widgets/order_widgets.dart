import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../core/toast.dart';
import '../models/voucher.dart';
import 'common.dart';

/// One voucher; `onApply` shows an "Áp dụng" button (checkout).
class VoucherCard extends StatelessWidget {
  final VoucherOption voucher;
  final ValueChanged<String>? onApply;
  final bool highlight;
  const VoucherCard({super.key, required this.voucher, this.onApply, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    final v = voucher;
    return Opacity(
      opacity: v.usable ? 1 : 0.7,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: highlight ? AppColors.emerald50 : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: highlight ? const Color(0xFF6EE7B7) : AppColors.slate200),
        ),
        child: Row(children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.confirmation_number_outlined, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 6, children: [
                Text(v.headline, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                if (v.personal)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(color: AppColors.amber100, borderRadius: BorderRadius.circular(4)),
                    child: const Text('CỦA RIÊNG BẠN', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.amber800)),
                  ),
              ]),
              const SizedBox(height: 2),
              Text.rich(
                TextSpan(style: const TextStyle(fontSize: 12, color: AppColors.slate500), children: [
                  TextSpan(text: v.code, style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700, color: AppColors.slate700)),
                  if (v.conditions.isNotEmpty) TextSpan(text: ' · ${v.conditions}'),
                ]),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (v.usable && v.discountAmount > 0 && onApply != null)
                Text('Tiết kiệm ${vnd(v.discountAmount)} cho đơn này',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.emerald700)),
              if (!v.usable && v.reason != null) Text(v.reason!, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
            ]),
          ),
          if (onApply != null && v.usable)
            GestureDetector(
              onTap: () => onApply!(v.code),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(999)),
                child: const Text('Áp dụng', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
              ),
            ),
        ]),
      ),
    );
  }
}

/// Copyable value row (transfer content, account number).
class CopyField extends StatefulWidget {
  final String label;
  final String value;
  final bool emphasis;
  const CopyField({super.key, required this.label, required this.value, this.emphasis = false});

  @override
  State<CopyField> createState() => _CopyFieldState();
}

class _CopyFieldState extends State<CopyField> {
  bool _copied = false;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.label.toUpperCase(), style: labelCaps(size: 10, color: AppColors.slate400)),
              Text(widget.value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w700,
                      fontSize: widget.emphasis ? 18 : 14,
                      color: widget.emphasis ? AppColors.primary : AppColors.slate900)),
            ]),
          ),
          GestureDetector(
            onTap: () async {
              await Clipboard.setData(ClipboardData(text: widget.value));
              setState(() => _copied = true);
              Future.delayed(const Duration(milliseconds: 1800), () {
                if (mounted) setState(() => _copied = false);
              });
            },
            child: Container(
              height: 34,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(color: _copied ? AppColors.emerald50 : AppColors.slate100, borderRadius: BorderRadius.circular(999)),
              child: Row(children: [
                Icon(_copied ? Icons.check : Icons.copy, size: 14, color: _copied ? AppColors.emerald700 : AppColors.slate700),
                const SizedBox(width: 5),
                Text(_copied ? 'Đã chép' : 'Chép',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _copied ? AppColors.emerald700 : AppColors.slate700)),
              ]),
            ),
          ),
        ]),
      );
}

/// QR + account details for a bank-transfer order (web BankTransferPayment).
class BankTransferPayment extends StatelessWidget {
  final String orderCode;
  final String? customerPhone;
  final num amount;
  final Map<String, dynamic> bankConfig;
  const BankTransferPayment({super.key, required this.orderCode, this.customerPhone, required this.amount, required this.bankConfig});

  @override
  Widget build(BuildContext context) {
    final content = 'ETTEE $orderCode ${customerPhone ?? ''}'.trim();
    final qrUrl = bankConfig['qrUrl'] as String?;
    final qr = qrUrl != null && qrUrl.isNotEmpty
        ? '$qrUrl?acc=${Uri.encodeComponent('${bankConfig['accountNumber'] ?? ''}')}&bank=${Uri.encodeComponent('${bankConfig['bankName'] ?? ''}')}&amount=${amount.round()}&des=${Uri.encodeComponent(content)}'
        : null;
    return AppCard(
      child: Column(children: [
        Container(
          constraints: const BoxConstraints(maxWidth: 260),
          child: AspectRatio(
            aspectRatio: 1,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
              child: qr != null
                  ? NetImage(resolveImageUrl(qr), fit: BoxFit.contain)
                  : const Center(child: Text('Quét mã QR qua ứng dụng ngân hàng', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.slate400))),
            ),
          ),
        ),
        const SizedBox(height: 10),
        const Text('Quét mã bằng app ngân hàng, số tiền và nội dung được điền sẵn',
            textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.slate500)),
        const SizedBox(height: 16),
        CopyField(label: 'Nội dung chuyển khoản', value: content),
        const SizedBox(height: 8),
        CopyField(label: 'Số tài khoản', value: '${bankConfig['accountNumber'] ?? ''}', emphasis: true),
        const SizedBox(height: 8),
        Text('${bankConfig['bankName'] ?? ''} · ${bankConfig['accountName'] ?? ''}',
            textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
        const SizedBox(height: 16),
        const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.verified_user_outlined, size: 16, color: AppColors.emerald600),
          SizedBox(width: 8),
          Expanded(child: Text('Đơn hàng được xử lý ngay khi chúng tôi xác nhận đã nhận tiền.', style: TextStyle(fontSize: 12, color: AppColors.slate500))),
        ]),
      ]),
    );
  }
}

/// Order lines + totals card shared by order success and order detail.
class OrderSummaryCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final String title;
  final bool showAddress;
  final void Function(String slug)? onOpenProduct;
  const OrderSummaryCard({super.key, required this.order, this.title = 'Đơn hàng', this.showAddress = true, this.onOpenProduct});

  @override
  Widget build(BuildContext context) {
    final total = toNum(order['totalAmount'] ?? order['finalTotal'] ?? order['total']);
    final subtotal = toNum(order['subtotal'] ?? total);
    final discount = toNum(order['discountTotal']);
    final items = asList(order['items']).whereType<Map<String, dynamic>>().toList();
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.inventory_2_outlined, size: 16, color: AppColors.primary),
          const SizedBox(width: 6),
          Expanded(child: Text(title.toUpperCase(), style: labelCaps(size: 13, color: AppColors.slate900, weight: FontWeight.w900))),
          Text('${order['orderCode'] ?? ''}', style: const TextStyle(fontFamily: 'monospace', fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.slate500)),
        ]),
        const SizedBox(height: 14),
        for (final item in items)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 60,
                  height: 60,
                  child: Stack(fit: StackFit.expand, children: [
                    NetImage(resolveImageUrl(item['image'] ?? item['imageUrl'])),
                    Positioned(
                      right: 0,
                      top: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: const BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.only(bottomLeft: Radius.circular(8))),
                        child: Text('×${item['quantity'] ?? 1}', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ]),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  GestureDetector(
                    onTap: item['productSlug'] != null && onOpenProduct != null ? () => onOpenProduct!('${item['productSlug']}') : null,
                    child: Text('${item['productName'] ?? ''}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(height: 2),
                  Text([item['color'], item['size']].where((e) => e != null && '$e'.isNotEmpty).join(' / '),
                      style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                ]),
              ),
              Text(vnd(toNum(item['totalPrice'] ?? toNum(item['unitPrice']) * toNum(item['quantity'], 1))),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            ]),
          ),
        const Divider(height: 24),
        _row('Tạm tính', vnd(subtotal)),
        if (discount > 0)
          _row('Giảm giá${order['voucherCode'] != null ? ' (${order['voucherCode']})' : ''}', '-${vnd(discount)}', color: AppColors.emerald700),
        _row('Phí vận chuyển', 'Miễn phí', valueColor: AppColors.primary, bold: true),
        const Divider(height: 20),
        Row(children: [
          const Expanded(child: Text('Tổng cộng', style: TextStyle(fontWeight: FontWeight.w900))),
          Text(vnd(total), style: headline(20, color: AppColors.primary)),
        ]),
        if (showAddress && (order['customerName'] != null || order['shippingAddressSnapshot'] != null)) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(16)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('GIAO ĐẾN', style: labelCaps(size: 10, color: AppColors.slate400)),
              const SizedBox(height: 6),
              if (order['customerName'] != null) Text('${order['customerName']}', style: const TextStyle(fontWeight: FontWeight.w700)),
              if (order['customerPhone'] != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(children: [
                    const Icon(Icons.phone_outlined, size: 14, color: AppColors.slate400),
                    const SizedBox(width: 6),
                    Text('${order['customerPhone']}', style: const TextStyle(color: AppColors.slate600, fontSize: 13)),
                  ]),
                ),
              if (order['shippingAddressSnapshot'] != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Icon(Icons.location_on_outlined, size: 14, color: AppColors.slate400),
                    const SizedBox(width: 6),
                    Expanded(child: Text('${order['shippingAddressSnapshot']}', style: const TextStyle(color: AppColors.slate600, fontSize: 13))),
                  ]),
                ),
            ]),
          ),
        ],
      ]),
    );
  }

  Widget _row(String label, String value, {Color? color, Color? valueColor, bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(fontSize: 13, color: color ?? AppColors.slate600))),
          Text(value, style: TextStyle(fontSize: 13, color: valueColor ?? color ?? AppColors.slate900, fontWeight: bold ? FontWeight.w700 : FontWeight.w500)),
        ]),
      );
}

const orderStatusMap = <String, (String, Color, Color, IconData)>{
  'PENDING_PAYMENT': ('Chờ thanh toán', AppColors.amber50, AppColors.amber700, Icons.schedule),
  'PENDING_CONFIRMATION': ('Chờ xác nhận', AppColors.sky50, AppColors.sky700, Icons.schedule),
  'CONFIRMED': ('Đã xác nhận', AppColors.indigo50, AppColors.indigo700, Icons.check_circle_outline),
  'PICKING': ('Đang chuẩn bị hàng', AppColors.indigo50, AppColors.indigo700, Icons.inventory_2_outlined),
  'PACKED': ('Đã đóng gói', AppColors.indigo50, AppColors.indigo700, Icons.inventory_2_outlined),
  'HANDED_TO_CARRIER': ('Đã giao vận chuyển', AppColors.purple50, AppColors.purple700, Icons.local_shipping_outlined),
  'SHIPPING': ('Đang giao hàng', AppColors.purple50, AppColors.purple700, Icons.local_shipping_outlined),
  'DELIVERED': ('Đã giao', AppColors.emerald50, AppColors.emerald700, Icons.check_circle_outline),
  'COMPLETED': ('Hoàn thành', AppColors.emerald50, AppColors.emerald700, Icons.check_circle_outline),
  'CANCELLED': ('Đã hủy', AppColors.rose50, AppColors.rose700, Icons.cancel_outlined),
  'RETURN_REQUESTED': ('Chờ duyệt trả hàng', AppColors.orange50, AppColors.orange700, Icons.undo),
  'RETURNED': ('Hoàn trả', AppColors.orange50, AppColors.orange700, Icons.cancel_outlined),
  'REFUNDED': ('Đã hoàn tiền', AppColors.slate100, AppColors.slate700, Icons.check_circle_outline),
};

Widget orderStatusPill(String? status) {
  final s = orderStatusMap[status];
  if (s == null) return StatusPill(status ?? '', bg: AppColors.slate100, fg: AppColors.slate800, border: AppColors.slate200);
  return StatusPill(s.$1, bg: s.$2, fg: s.$3, border: s.$3.withValues(alpha: 0.25), icon: s.$4);
}

void copyToClipboard(String text, String toast) {
  Clipboard.setData(ClipboardData(text: text));
  Toast.success(toast);
}
