import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../services/recommendation_service.dart';
import '../../services/shop_service.dart';
import '../../state/cart_provider.dart';
import '../../widgets/cart_widgets.dart';
import '../../widgets/common.dart';
import '../../widgets/product_card.dart';
import '../../widgets/store_scaffold.dart';

/// Port of web app/cart/page.tsx.
class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _code = TextEditingController();
  Map<String, dynamic>? _voucher;
  bool _voucherLoading = false;
  String? _voucherError;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _applyVoucher(num subtotal) async {
    final code = _code.text.trim().toUpperCase();
    if (code.isEmpty) return;
    setState(() {
      _voucherLoading = true;
      _voucherError = null;
    });
    try {
      final v = await CustomerMarketingService.validateVoucher(code, subtotal);
      setState(() => _voucher = v);
      Toast.success('Đã áp dụng voucher: ${v['name']}');
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

  @override
  Widget build(BuildContext context) {
    final cartP = context.watch<CartProvider>();
    final cart = cartP.cart;
    if (cartP.isLoading && cart == null) return const StoreScaffold(body: LoadingView());
    final empty = cart == null || cart.isEmpty;
    final total = _voucher != null ? toNum(_voucher!['finalTotal']).clamp(0, double.infinity) : (cart?.subtotal ?? 0);

    return StoreScaffold(
      bottomBar: empty
          ? null
          : CheckoutBar(label: 'Tổng thanh toán', total: total, button: 'Thanh toán', onPressed: () => context.push('/checkout')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          Row(children: [
            Text('GIỎ HÀNG', style: headline(26)),
            if (!empty) ...[
              const SizedBox(width: 10),
              StatusPill('${cart.totalQuantity} sản phẩm', bg: AppColors.slate100, fg: AppColors.slate700),
            ],
          ]),
          const SizedBox(height: 20),
          if (empty)
            EmptyPanel(
              icon: Icons.shopping_bag_outlined,
              title: 'GIỎ HÀNG CỦA BẠN ĐANG TRỐNG',
              message: 'Hãy khám phá các thiết kế thời trang mới nhất từ ET.TEE Studio',
              action: PillButton('Tiếp tục mua sắm', trailingIcon: Icons.arrow_forward, onPressed: () => context.go('/products')),
            )
          else ...[
            // Shipping is free for every order (the backend hardcodes shippingFee=0).
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.emerald50, Color(0xFFF0FDFA), AppColors.emerald50]),
                border: Border.all(color: AppColors.emerald100),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(children: [
                Icon(Icons.local_shipping_outlined, size: 16, color: AppColors.emerald600),
                SizedBox(width: 6),
                Icon(Icons.auto_awesome, size: 15, color: AppColors.emerald600),
                SizedBox(width: 6),
                Expanded(child: Text('Miễn phí giao hàng toàn quốc cho mọi đơn hàng', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF064E3B)))),
              ]),
            ),
            const SizedBox(height: 22),
            for (final item in cart.items) CartLine(item: item, onOpen: () => context.push('/products/${item.productSlug}')),
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.only(bottom: 12),
                  decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
                  child: Text('TÓM TẮT ĐƠN HÀNG', style: labelCaps(size: 14, color: AppColors.slate900, weight: FontWeight.w900)),
                ),
                const SizedBox(height: 14),
                _line('Tạm tính (${cart.totalQuantity} sản phẩm)', '${formatNumber(cart.subtotal)}₫'),
                _line('Phí vận chuyển', 'MIỄN PHÍ', valueColor: AppColors.emerald600),
                if (_voucher != null)
                  _line('Giảm giá (${_voucher!['name']})', '-${formatNumber(toNum(_voucher!['discountAmount']))}₫', color: AppColors.emerald700),
                const Divider(height: 28),
                Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('TỔNG THANH TOÁN', style: labelCaps(size: 12, color: AppColors.slate900, weight: FontWeight.w900)),
                      const Text('(Đã bao gồm VAT)', style: TextStyle(fontSize: 10, color: AppColors.slate400)),
                    ]),
                  ),
                  Text('${formatNumber(total)}₫', style: headline(24, color: AppColors.primary)),
                ]),
                const SizedBox(height: 22),
                Text('MÃ GIẢM GIÁ', style: labelCaps(size: 11)),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _code,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(hintText: 'Mã voucher...'),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 46,
                    child: FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: AppColors.slate900, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      onPressed: _voucherLoading || _code.text.trim().isEmpty ? null : () => _applyVoucher(cart.subtotal),
                      child: Text(_voucherLoading ? 'Checking...' : 'ÁP DỤNG', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ]),
                if (_voucher != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(children: [
                      Expanded(
                        child: Text('✓ Đã giảm ${formatNumber(toNum(_voucher!['discountAmount']))}₫',
                            style: const TextStyle(fontSize: 12, color: AppColors.emerald700, fontWeight: FontWeight.w600)),
                      ),
                      GestureDetector(
                        onTap: () => setState(() {
                          _voucher = null;
                          _code.clear();
                        }),
                        child: const Text('Bỏ', style: TextStyle(fontSize: 11, color: AppColors.slate400, decoration: TextDecoration.underline)),
                      ),
                    ]),
                  )
                else if (_voucherError != null)
                  Padding(padding: const EdgeInsets.only(top: 8), child: Text(_voucherError!, style: const TextStyle(fontSize: 12, color: AppColors.primary))),
                const SizedBox(height: 20),
                PillButton('Tiến hành thanh toán', expand: true, height: 52, trailingIcon: Icons.arrow_forward, onPressed: () => context.push('/checkout')),
                const SizedBox(height: 14),
                const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.verified_user_outlined, size: 15, color: AppColors.emerald600),
                  SizedBox(width: 6),
                  Text('Bảo mật thanh toán 100%', style: TextStyle(fontSize: 11, color: AppColors.slate400, fontWeight: FontWeight.w500)),
                ]),
              ]),
            ),
          ],
          const SizedBox(height: 40),
          const Divider(),
          const SizedBox(height: 32),
          Text('THƯỜNG ĐƯỢC MUA KÈM', textAlign: TextAlign.center, style: headline(22)),
          const SizedBox(height: 4),
          const Text('Món bổ trợ cho giỏ hàng, dựa trên những gì khách hàng hay mua cùng nhau',
              textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.slate500)),
          const SizedBox(height: 20),
          _CartRecommendations(cartKey: (cart?.items.map((i) => i.variantId).toList() ?? [])..sort()),
        ],
      ),
    );
  }

  Widget _line(String label, String value, {Color? color, Color? valueColor}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(fontSize: 12, color: color ?? AppColors.slate600, fontWeight: color != null ? FontWeight.w700 : FontWeight.w400))),
          Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: valueColor ?? color ?? AppColors.slate900)),
        ]),
      );
}

/// "Thường được mua kèm" grid below the cart (FP-Growth complements).
class _CartRecommendations extends StatefulWidget {
  final List<int> cartKey;
  const _CartRecommendations({required this.cartKey});

  @override
  State<_CartRecommendations> createState() => _CartRecommendationsState();
}

class _CartRecommendationsState extends State<_CartRecommendations> {
  List<CartComplement>? _items;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant _CartRecommendations old) {
    super.didUpdateWidget(old);
    if (old.cartKey.join(',') != widget.cartKey.join(',')) _load();
  }

  Future<void> _load() async {
    final r = await RecommendationService.cartComplements(4);
    if (mounted) setState(() => _items = r);
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    if (items == null) return const LoadingView();
    if (items.isEmpty) {
      return const Text('Thêm sản phẩm vào giỏ để xem gợi ý mua kèm.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate400, fontSize: 13));
    }
    return ProductGrid(products: items.map((c) => c.product).toList());
  }
}

/// Sticky mobile bar with the total and the main action.
class CheckoutBar extends StatelessWidget {
  final String label;
  final num total;
  final String button;
  final VoidCallback? onPressed;
  final bool loading;
  const CheckoutBar({super.key, required this.label, required this.total, required this.button, this.onPressed, this.loading = false});

  @override
  Widget build(BuildContext context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.slate200)),
          boxShadow: [BoxShadow(color: Color(0x14000000), blurRadius: 20, offset: Offset(0, -4))],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            child: Row(children: [
              Expanded(
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(label.toUpperCase(), style: labelCaps(size: 10, color: AppColors.slate500)),
                  Text('${formatNumber(total)}₫', style: headline(19, color: AppColors.primary)),
                ]),
              ),
              SizedBox(width: 190, child: PillButton(button, height: 44, loading: loading, trailingIcon: loading ? null : Icons.arrow_forward, onPressed: onPressed)),
            ]),
          ),
        ),
      );
}
