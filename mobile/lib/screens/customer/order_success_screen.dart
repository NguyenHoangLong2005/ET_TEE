import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../services/shop_service.dart';
import '../../widgets/common.dart';
import '../../widgets/order_widgets.dart';
import '../../widgets/store_scaffold.dart';

String? orderStatusOf(Map<String, dynamic>? o) => (o?['orderStatus'] ?? o?['status']) as String?;

/// Port of web app/order-success/[orderCode]/page.tsx: never claims success for an unknown order,
/// and polls the payment state while a bank transfer is outstanding.
class OrderSuccessScreen extends StatefulWidget {
  final String orderCode;
  const OrderSuccessScreen({super.key, required this.orderCode});

  @override
  State<OrderSuccessScreen> createState() => _OrderSuccessScreenState();
}

class _OrderSuccessScreenState extends State<OrderSuccessScreen> with WidgetsBindingObserver {
  Map<String, dynamic>? _order;
  Map<String, dynamic>? _bank;
  bool _loading = true;
  bool _payosEnabled = false;
  bool _openingPayos = false;
  bool _wasWaiting = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  /// Coming back from the PayOS page / banking app: check right away.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _waiting) _check();
  }

  bool get _waiting =>
      _order?['paymentMethod'] == 'BANK_TRANSFER' && _order?['paymentStatus'] != 'PAID' && orderStatusOf(_order) == 'PENDING_PAYMENT';

  Future<void> _load() async {
    try {
      final o = await OrderService.byCode(widget.orderCode);
      if (o != null && o['paymentMethod'] == 'BANK_TRANSFER') _bank = await OrderService.bankConfig();
      _order = o;
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
    _syncPolling();
  }

  void _syncPolling() {
    if (_waiting) {
      _wasWaiting = true;
      _timer ??= Timer.periodic(const Duration(seconds: 5), (_) => _check());
      _check();
    } else {
      _timer?.cancel();
      _timer = null;
    }
  }

  Future<void> _check() async {
    final (o, enabled) = await OrderService.payosSync(widget.orderCode);
    if (!mounted || o == null) return;
    final becamePaid = _wasWaiting && _order?['paymentStatus'] != 'PAID' && o['paymentStatus'] == 'PAID';
    setState(() {
      _order = o;
      _payosEnabled = enabled;
    });
    if (becamePaid) Toast.success('Đã nhận được thanh toán. Cảm ơn bạn!');
    _syncPolling();
  }

  Future<void> _openPayos() async {
    setState(() => _openingPayos = true);
    final url = await OrderService.payosLink(widget.orderCode);
    if (url != null && await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)) {
      if (mounted) setState(() => _openingPayos = false);
      return;
    }
    Toast.error('Không mở được trang thanh toán PayOS');
    if (mounted) setState(() => _openingPayos = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const StoreScaffold(body: LoadingView(message: 'Đang tải thông tin đơn hàng...'));
    final o = _order;
    if (o == null) {
      return StoreScaffold(
        body: ListView(padding: const EdgeInsets.all(24), children: [
          const SizedBox(height: 40),
          Text('KHÔNG TÌM THẤY ĐƠN HÀNG', textAlign: TextAlign.center, style: headline(22)),
          const SizedBox(height: 14),
          Text.rich(
            TextSpan(style: const TextStyle(color: AppColors.slate500, height: 1.5), children: [
              const TextSpan(text: 'Không thể xác nhận đơn hàng với mã '),
              TextSpan(text: widget.orderCode, style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.black)),
              const TextSpan(text: '. Vui lòng kiểm tra lại hoặc xem lại đơn hàng trong tài khoản của bạn.'),
            ]),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 28),
          PillButton('Xem đơn hàng', style: PillStyle.outline, expand: true, onPressed: () => context.go('/account/orders')),
          const SizedBox(height: 10),
          PillButton('Tiếp tục mua sắm', expand: true, onPressed: () => context.go('/products')),
        ]),
      );
    }
    final isBank = o['paymentMethod'] == 'BANK_TRANSFER';
    final awaiting = isBank && o['paymentStatus'] != 'PAID';
    final total = toNum(o['totalAmount'] ?? o['finalTotal'] ?? o['total']);
    final showQr = awaiting && orderStatusOf(o) == 'PENDING_PAYMENT' && _bank != null;
    final paidByTransfer = isBank && o['paymentStatus'] == 'PAID';
    final cancelled = orderStatusOf(o) == 'CANCELLED';

    Widget payment;
    if (showQr) {
      payment = Column(children: [
        if (_payosEnabled) ...[
          PillButton(_openingPayos ? 'Đang mở PayOS…' : 'Thanh toán qua PayOS',
              icon: Icons.credit_card, expand: true, onPressed: _openingPayos ? null : _openPayos),
          const SizedBox(height: 12),
        ],
        BankTransferPayment(orderCode: widget.orderCode, customerPhone: o['customerPhone'] as String?, amount: total, bankConfig: _bank!),
      ]);
    } else if (cancelled) {
      payment = _notice('ĐƠN HÀNG ĐÃ HỦY', 'Đơn hàng này đã bị hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ hỗ trợ để được hoàn tiền.',
          bg: const Color(0x99FFF1F2), border: const Color(0xFFFECDD3), titleColor: const Color(0xFF9F1239));
    } else if (paidByTransfer) {
      payment = _notice('ĐÃ NHẬN CHUYỂN KHOẢN', 'Chúng tôi đã nhận ${vnd(total)}. Đơn hàng đang được chuẩn bị.',
          bg: const Color(0x99ECFDF5), border: AppColors.emerald200, titleColor: AppColors.emerald800);
    } else if (isBank) {
      payment = _notice('ĐANG XÁC NHẬN THANH TOÁN', 'Chúng tôi đang kiểm tra khoản chuyển ${vnd(total)}. Trang sẽ tự cập nhật.');
    } else {
      payment = _notice('THANH TOÁN KHI NHẬN HÀNG (COD)', 'Bạn sẽ thanh toán ${vnd(total)} khi nhận được hàng.');
    }

    return StoreScaffold(
      background: const Color(0x99F8FAFC),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 28, 16, 40),
        children: [
          if (!awaiting && !cancelled) ...[
            Center(
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(color: AppColors.emerald50, shape: BoxShape.circle, border: Border.all(color: const Color(0x99ECFDF5), width: 8)),
                child: const Icon(Icons.check_circle_outline, size: 40, color: Color(0xFF10B981)),
              ),
            ),
            const SizedBox(height: 16),
            Text((paidByTransfer ? 'Thanh toán thành công!' : 'Đặt hàng thành công!').toUpperCase(), textAlign: TextAlign.center, style: headline(26)),
            const SizedBox(height: 24),
          ],
          payment,
          const SizedBox(height: 16),
          OrderSummaryCard(order: o, onOpenProduct: (s) => context.push('/products/$s')),
          const SizedBox(height: 20),
          PillButton('Xem đơn hàng', style: PillStyle.outline, expand: true, onPressed: () => context.go('/account/orders')),
          const SizedBox(height: 10),
          PillButton('Tiếp tục mua sắm', expand: true, onPressed: () => context.go('/products')),
        ],
      ),
    );
  }

  Widget _notice(String title, String text, {Color bg = Colors.white, Color border = AppColors.slate200, Color titleColor = AppColors.slate900}) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(24), border: Border.all(color: border)),
        child: Column(children: [
          Text(title, textAlign: TextAlign.center, style: labelCaps(size: 13, color: titleColor, weight: FontWeight.w900)),
          const SizedBox(height: 10),
          Text(text, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate600, height: 1.5)),
        ]),
      );
}
