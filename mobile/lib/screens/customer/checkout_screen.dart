import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../models/voucher.dart';
import '../../services/shop_service.dart';
import '../../state/auth_provider.dart';
import '../../state/cart_provider.dart';
import '../../widgets/common.dart';
import '../../widgets/order_widgets.dart';
import '../../widgets/store_scaffold.dart';
import 'cart_screen.dart';

/// Port of web app/checkout/page.tsx.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _note = TextEditingController();
  final _code = TextEditingController();
  String _payment = 'COD';
  final _touched = <String>{};
  final _errors = <String, String>{};
  bool _submitting = false;
  bool _placed = false;
  Map<String, dynamic>? _voucher;
  bool _voucherLoading = false;
  String? _voucherError;
  List<VoucherOption> _options = [];
  Map<String, dynamic>? _bank;
  num _lastTotal = -1;

  @override
  void initState() {
    super.initState();
    _prefill();
    OrderService.bankConfig().then((b) {
      if (mounted) setState(() => _bank = b);
    });
  }

  @override
  void dispose() {
    for (final c in [_name, _email, _phone, _address, _note, _code]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Only empty fields are filled, so whatever the shopper typed is never overwritten.
  Future<void> _prefill() async {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;
    void fill(TextEditingController c, String? v) {
      if (c.text.isEmpty && v != null && v.isNotEmpty) c.text = v;
    }

    fill(_name, user.fullName);
    fill(_email, user.email);
    fill(_phone, user.phone);
    try {
      final d = await Api.instance.get('/api/account/profile');
      if (!mounted || d is! Map) return;
      fill(_name, d['fullName'] as String?);
      fill(_phone, d['phone'] as String?);
      fill(_address, d['defaultShippingAddress'] as String?);
    } catch (_) {
      // profile is a convenience; the shopper can still type the details
    }
  }

  /// itemTotal comes from the server, rounded the way checkout charges it.
  num _subtotal(CartProvider c) => (c.cart?.items ?? []).fold<num>(0, (s, i) => s + i.itemTotal);

  void _maybeLoadVoucherOptions(num total) {
    if (total <= 0 || total == _lastTotal) return;
    _lastTotal = total;
    CustomerMarketingService.vouchersForMe(total).then((opts) {
      if (mounted) setState(() => _options = opts.where((o) => o.usable).take(3).toList());
    });
  }

  String _validate(String field, String v) {
    v = v.trim();
    switch (field) {
      case 'customerName':
        if (v.isEmpty) return 'Vui lòng nhập họ và tên của bạn';
        if (v.length < 2) return 'Họ tên tối thiểu 2 ký tự';
      case 'customerPhone':
        if (v.isEmpty) return 'Vui lòng nhập số điện thoại';
        if (!RegExp(r'^[0-9+\s\-]{8,15}$').hasMatch(v)) return 'Số điện thoại không hợp lệ (8-15 chữ số)';
      case 'customerEmail':
        if (v.isEmpty) return 'Vui lòng nhập địa chỉ email';
        if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v)) return 'Địa chỉ email không đúng định dạng';
      case 'shippingAddress':
        if (v.isEmpty) return 'Vui lòng nhập địa chỉ giao hàng';
        if (v.length < 8) return 'Địa chỉ quá ngắn, vui lòng nhập số nhà, đường, quận/huyện';
    }
    return '';
  }

  Map<String, TextEditingController> get _fields =>
      {'customerName': _name, 'customerPhone': _phone, 'customerEmail': _email, 'shippingAddress': _address};

  void _touch(String field) => setState(() {
        _touched.add(field);
        _errors[field] = _validate(field, _fields[field]!.text);
      });

  Future<void> _applyVoucher(num subtotal, [String? override]) async {
    final code = (override ?? _code.text).trim().toUpperCase();
    if (override != null) _code.text = code;
    if (code.isEmpty) {
      setState(() {
        _voucher = null;
        _voucherError = null;
      });
      return;
    }
    setState(() {
      _voucherLoading = true;
      _voucherError = null;
    });
    try {
      final v = await CustomerMarketingService.validateVoucher(code, subtotal);
      setState(() => _voucher = v);
      Toast.success('Áp dụng voucher thành công');
    } catch (e) {
      final msg = e is ApiException ? e.message : 'Không thể kiểm tra voucher';
      setState(() {
        _voucher = null;
        _voucherError = msg;
      });
      Toast.error(msg);
    } finally {
      if (mounted) setState(() => _voucherLoading = false);
    }
  }

  Future<void> _submit() async {
    final errs = {for (final e in _fields.entries) e.key: _validate(e.key, e.value.text)};
    setState(() {
      _touched.addAll(_fields.keys);
      _errors
        ..clear()
        ..addAll(errs);
    });
    if (errs.values.any((e) => e.isNotEmpty)) {
      Toast.error('Vui lòng kiểm tra và điền đúng các trường thông tin');
      return;
    }
    setState(() => _submitting = true);
    final cart = context.read<CartProvider>();
    try {
      // Only a validated code is sent: a typed-but-unapplied code never reaches checkout.
      final order = await OrderService.checkout({
        'customerName': _name.text.trim(),
        'customerEmail': _email.text.trim(),
        'customerPhone': _phone.text.trim(),
        'shippingAddress': _address.text.trim(),
        'shippingMethod': 'STANDARD',
        'paymentMethod': _payment,
        'note': _note.text,
        'voucherCode': _voucher != null ? _code.text.trim() : '',
      });
      final code = '${order['orderCode']}';
      setState(() => _placed = true);
      cart.fetch();
      if (_payment == 'BANK_TRANSFER') {
        final url = await OrderService.payosLink(code);
        if (url != null && await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)) {
          if (mounted) context.go('/order-success/$code');
          return;
        }
        Toast.success('Đã tạo đơn hàng. Vui lòng chuyển khoản để hoàn tất.');
      } else {
        Toast.success('Đặt hàng thành công!');
      }
      if (mounted) context.go('/order-success/$code');
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Lỗi kết nối máy chủ');
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartP = context.watch<CartProvider>();
    final cart = cartP.cart;
    if (_placed || (cartP.isLoading && cart == null)) {
      return SubPageScaffold(title: 'Thanh toán', body: LoadingView(message: _placed ? 'Đang chuyển đến trang thanh toán…' : 'Đang tải giỏ hàng…'));
    }
    if (cart == null || cart.isEmpty) {
      return SubPageScaffold(
        title: 'Thanh toán',
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: EmptyPanel(
            icon: Icons.shopping_bag_outlined,
            title: 'GIỎ HÀNG TRỐNG',
            message: 'Bạn cần có sản phẩm trong giỏ hàng để tiến hành thanh toán.',
            action: PillButton('Tiếp tục mua sắm', onPressed: () => context.go('/products')),
          ),
        ),
      );
    }
    final subtotal = _subtotal(cartP);
    _maybeLoadVoucherOptions(subtotal);
    final total = _voucher != null ? toNum(_voucher!['finalTotal']).clamp(0, double.infinity) : subtotal;

    return SubPageScaffold(
      title: 'Thanh toán',
      background: AppColors.slate50,
      bottomBar: CheckoutBar(
        label: 'Tổng thanh toán',
        total: total,
        button: _submitting ? 'Đang xử lý...' : 'Đặt hàng ngay',
        loading: _submitting,
        onPressed: _submitting ? null : _submit,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          AppCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('1. THÔNG TIN GIAO HÀNG', style: headline(16)),
              const SizedBox(height: 18),
              _field('customerName', 'Họ tên', _name, hint: 'Nguyễn Văn A'),
              _field('customerPhone', 'Số điện thoại', _phone, hint: '0901234567', keyboard: TextInputType.phone),
              _field('customerEmail', 'Email', _email, hint: 'email@example.com', keyboard: TextInputType.emailAddress),
              _field('shippingAddress', 'Địa chỉ giao hàng chi tiết', _address,
                  hint: 'Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố', lines: 3),
              const FieldLabel('Ghi chú đơn hàng (Tùy chọn)'),
              TextField(controller: _note, maxLines: 2, decoration: const InputDecoration(hintText: 'Ghi chú thêm cho người giao hàng...')),
            ]),
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('2. PHƯƠNG THỨC VẬN CHUYỂN', style: headline(16)),
              const SizedBox(height: 16),
              _option(
                selected: true,
                onTap: () {},
                child: Row(children: [
                  const Expanded(child: Text('Giao hàng tiêu chuẩn', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                  StatusPill('MIỄN PHÍ', bg: AppColors.red100, fg: AppColors.primary),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('3. PHƯƠNG THỨC THANH TOÁN', style: headline(16)),
              const SizedBox(height: 16),
              _option(
                selected: _payment == 'COD',
                onTap: () => setState(() => _payment = 'COD'),
                child: const Text('Thanh toán khi nhận hàng (COD)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              ),
              const SizedBox(height: 10),
              _option(
                selected: _payment == 'BANK_TRANSFER',
                onTap: () => setState(() => _payment = 'BANK_TRANSFER'),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Chuyển khoản qua Ngân hàng / QR Code', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  if (_payment == 'BANK_TRANSFER' && _bank != null)
                    Container(
                      margin: const EdgeInsets.only(top: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        _kv('Ngân hàng', '${_bank!['bankName'] ?? ''}'),
                        _kv('Số tài khoản', '${_bank!['accountNumber'] ?? ''}'),
                        _kv('Chủ tài khoản', '${_bank!['accountName'] ?? ''}'),
                        const SizedBox(height: 8),
                        const Text('Mã QR và nội dung chuyển khoản sẽ được cung cấp ở bước tiếp theo sau khi bạn bấm Đặt hàng.',
                            style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.slate500)),
                      ]),
                    ),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          AppCard(
            color: AppColors.slate50,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(bottom: 14),
                decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate200))),
                child: Text('ĐƠN HÀNG CỦA BẠN', style: headline(16)),
              ),
              const SizedBox(height: 10),
              for (final item in cart.items)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 64,
                        height: 80,
                        decoration: BoxDecoration(color: Colors.white, border: Border.all(color: AppColors.slate200)),
                        child: NetImage(resolveImageUrl(item.productImage)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(item.productName, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        const SizedBox(height: 3),
                        Text('${item.color} / ${item.size}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                        const SizedBox(height: 6),
                        Row(children: [
                          Text('x${item.quantity}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                          const Spacer(),
                          Text('${formatVnd(item.unitPrice)}₫', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        ]),
                      ]),
                    ),
                  ]),
                ),
              const Divider(height: 24, color: AppColors.slate200),
              _sumRow('Tạm tính', '${formatNumber(subtotal)}₫'),
              _sumRow('Phí vận chuyển', 'Miễn phí', valueColor: AppColors.primary),
              if (_voucher != null) _sumRow('Giảm giá (${_code.text})', '-${formatNumber(toNum(_voucher!['discountAmount']))}₫', color: AppColors.emerald700),
              const Divider(height: 24, color: AppColors.slate200),
              Row(children: [
                Expanded(child: Text('Tổng cộng', style: headline(19))),
                Text('${formatNumber(total)}₫', style: headline(19, color: AppColors.primary)),
              ]),
              const Divider(height: 32, color: AppColors.slate200),
              Text('MÃ GIẢM GIÁ', style: labelCaps(color: AppColors.slate900)),
              const SizedBox(height: 8),
              if (_voucher == null && _options.isNotEmpty) ...[
                const Text('Mã bạn dùng được cho đơn này, có lợi nhất trước:', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                const SizedBox(height: 8),
                for (var i = 0; i < _options.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: VoucherCard(voucher: _options[i], highlight: i == 0, onApply: (c) => _applyVoucher(subtotal, c)),
                  ),
              ],
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: _code,
                    textCapitalization: TextCapitalization.characters,
                    style: const TextStyle(fontFamily: 'monospace'),
                    decoration: const InputDecoration(hintText: 'Nhập mã'),
                    // Editing an applied code drops the old discount, which no longer matches the text.
                    onChanged: (_) => setState(() {
                      if (_voucher != null) _voucher = null;
                    }),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 46,
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.slate900, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    onPressed: _voucherLoading || _code.text.trim().isEmpty ? null : () => _applyVoucher(subtotal),
                    child: Text(_voucherLoading ? 'Đang kiểm tra…' : 'ÁP DỤNG', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ),
              ]),
              if (_voucher != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Row(children: [
                    Expanded(
                      child: Text.rich(TextSpan(style: const TextStyle(fontSize: 12, color: AppColors.emerald700), children: [
                        const TextSpan(text: '✓ Đã áp dụng '),
                        TextSpan(text: '${_voucher!['name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        TextSpan(text: ' (-${formatNumber(toNum(_voucher!['discountAmount']))}₫)'),
                      ])),
                    ),
                    GestureDetector(
                      onTap: () => setState(() {
                        _voucher = null;
                        _code.clear();
                      }),
                      child: const Text('Xóa', style: TextStyle(fontSize: 12, color: AppColors.slate500, decoration: TextDecoration.underline)),
                    ),
                  ]),
                )
              else if (_voucherError != null)
                Padding(padding: const EdgeInsets.only(top: 10), child: Text(_voucherError!, style: const TextStyle(fontSize: 12, color: AppColors.primary))),
            ]),
          ),
          const SizedBox(height: 20),
          PillButton(_submitting ? 'Đang xử lý...' : 'Hoàn tất Đặt hàng',
              expand: true, height: 54, radius: BorderRadius.circular(12), loading: _submitting, onPressed: _submitting ? null : _submit),
        ],
      ),
    );
  }

  Widget _field(String key, String label, TextEditingController c, {String? hint, TextInputType? keyboard, int lines = 1}) {
    final err = _touched.contains(key) ? _errors[key] : null;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        FieldLabel(label, required: true),
        Focus(
          onFocusChange: (f) {
            if (!f) _touch(key);
          },
          child: TextField(
            controller: c,
            keyboardType: keyboard,
            maxLines: lines,
            onChanged: (v) {
              if (_touched.contains(key)) setState(() => _errors[key] = _validate(key, v));
            },
            decoration: InputDecoration(
              hintText: hint,
              fillColor: err != null && err.isNotEmpty ? const Color(0x33FEF2F2) : Colors.white,
              enabledBorder: err != null && err.isNotEmpty
                  ? OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary))
                  : null,
            ),
          ),
        ),
        if (err != null && err.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(children: [
              const Icon(Icons.error_outline, size: 14, color: AppColors.primary),
              const SizedBox(width: 4),
              Expanded(child: Text(err, style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500))),
            ]),
          ),
      ]),
    );
  }

  Widget _option({required bool selected, required VoidCallback onTap, required Widget child}) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? const Color(0x66FEF2F2) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: selected ? AppColors.primary : AppColors.slate200),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? AppColors.primary : AppColors.slate400, size: 20),
            const SizedBox(width: 10),
            Expanded(child: child),
          ]),
        ),
      );

  Widget _kv(String k, String v) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text.rich(TextSpan(style: const TextStyle(fontSize: 13, color: AppColors.slate600), children: [
          TextSpan(text: '$k: ', style: const TextStyle(fontWeight: FontWeight.w700)),
          TextSpan(text: v),
        ])),
      );

  Widget _sumRow(String label, String value, {Color? color, Color? valueColor}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(fontSize: 13, color: color ?? AppColors.slate600))),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: valueColor ?? color ?? AppColors.slate900)),
        ]),
      );
}
