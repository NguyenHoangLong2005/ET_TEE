import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/cart.dart';
import '../services/recommendation_service.dart';
import '../state/cart_provider.dart';
import 'common.dart';

/// Slide-in cart from the right, like web CartDrawer (opened after "Thêm vào giỏ").
Future<void> showCartDrawer(BuildContext context) {
  return showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Đóng giỏ hàng',
    barrierColor: const Color(0x660F172A),
    transitionDuration: const Duration(milliseconds: 280),
    pageBuilder: (ctx, _, _) => Align(
      alignment: Alignment.centerRight,
      child: SizedBox(
        width: MediaQuery.of(ctx).size.width >= 600 ? 480 : MediaQuery.of(ctx).size.width,
        child: const Material(color: Colors.white, child: SafeArea(child: _CartDrawerBody())),
      ),
    ),
    transitionBuilder: (_, anim, _, child) => SlideTransition(
      position: Tween(begin: const Offset(1, 0), end: Offset.zero).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
      child: child,
    ),
  );
}

class _CartDrawerBody extends StatelessWidget {
  const _CartDrawerBody();

  @override
  Widget build(BuildContext context) {
    final cartP = context.watch<CartProvider>();
    final cart = cartP.cart;
    final items = cart?.items ?? const <CartItem>[];
    void close() => Navigator.of(context).pop();
    void go(String path) {
      close();
      GoRouter.of(context).push(path);
    }

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 8, 16),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
          child: Row(
            children: [
              Expanded(
                child: Text.rich(TextSpan(children: [
                  TextSpan(text: 'GIỎ HÀNG CỦA BẠN ', style: headline(18)),
                  TextSpan(text: '(${cart?.totalQuantity ?? 0})', style: headline(18, color: AppColors.slate500, weight: FontWeight.w700)),
                ])),
              ),
              IconButton(onPressed: close, icon: const Icon(Icons.close, color: AppColors.slate400)),
            ],
          ),
        ),
        Expanded(
          child: items.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 96,
                          height: 96,
                          decoration: const BoxDecoration(color: AppColors.slate50, shape: BoxShape.circle),
                          child: const Icon(Icons.shopping_bag_outlined, size: 40, color: AppColors.slate300),
                        ),
                        const SizedBox(height: 20),
                        const Text('Giỏ hàng của bạn đang trống', style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 20),
                        PillButton('Tiếp tục mua sắm', onPressed: close),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                  children: [
                    for (final item in items) CartLine(item: item, compact: true, onOpen: () => go('/products/${item.productSlug}')),
                    _ComplementsStrip(cartKey: (items.map((i) => i.variantId).toList()..sort()).join(','), onOpen: go),
                  ],
                ),
        ),
        if (items.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.slate100))),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(child: Text('TỔNG TIỀN', style: headline(15, weight: FontWeight.w900))),
                    Text('${formatNumber(cart!.subtotal)}₫', style: headline(22, color: AppColors.primary)),
                  ],
                ),
                const SizedBox(height: 16),
                PillButton('Thanh toán', expand: true, onPressed: () => go('/checkout')),
                const SizedBox(height: 10),
                PillButton('Xem giỏ hàng', expand: true, style: PillStyle.outline, onPressed: () => go('/cart')),
              ],
            ),
          ),
      ],
    );
  }
}

/// One cart line with image, colour/size, quantity stepper and price (drawer and cart page).
class CartLine extends StatelessWidget {
  final CartItem item;
  final bool compact;
  final VoidCallback onOpen;
  const CartLine({super.key, required this.item, required this.onOpen, this.compact = false});

  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartProvider>();
    final onSale = item.salePrice > 0 && roundVnd(item.salePrice) < roundVnd(item.price);
    return Container(
      padding: const EdgeInsets.only(bottom: 20),
      margin: const EdgeInsets.only(bottom: 20),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: onOpen,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: compact ? 90 : 96,
                height: 120,
                decoration: BoxDecoration(color: AppColors.slate50, border: Border.all(color: AppColors.slate100)),
                child: NetImage(resolveImageUrl(item.productImage)),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: SizedBox(
              height: 120,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: onOpen,
                          child: Text(item.productName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.3)),
                        ),
                      ),
                      InkWell(
                        onTap: () => cart.removeItem(item.id),
                        child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.delete_outline, size: 18, color: AppColors.slate300)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text.rich(
                    TextSpan(style: const TextStyle(fontSize: 12, color: AppColors.slate500), children: [
                      const TextSpan(text: 'Màu: '),
                      TextSpan(text: item.color, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate900)),
                      const TextSpan(text: '  ·  Size: '),
                      TextSpan(text: item.size, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate900)),
                    ]),
                  ),
                  const Spacer(),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      QtyStepper(
                        value: item.quantity,
                        canDecrease: item.quantity > 1,
                        canIncrease: item.quantity < item.availableQuantity,
                        onChanged: (q) => cart.updateQuantity(item.id, q),
                        small: true,
                      ),
                      const Spacer(),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('${formatVnd(item.unitPrice)}₫',
                              style: TextStyle(
                                  fontWeight: FontWeight.w900, fontSize: 14, color: onSale ? AppColors.primary : AppColors.slate900)),
                          if (onSale)
                            Text('${formatVnd(item.price)}₫',
                                style: const TextStyle(fontSize: 11, color: AppColors.slate400, decoration: TextDecoration.lineThrough)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class QtyStepper extends StatelessWidget {
  final int value;
  final bool canDecrease;
  final bool canIncrease;
  final ValueChanged<int> onChanged;
  final bool small;
  const QtyStepper({super.key, required this.value, required this.canDecrease, required this.canIncrease, required this.onChanged, this.small = false});

  @override
  Widget build(BuildContext context) {
    final s = small ? 32.0 : 44.0;
    Widget btn(IconData icon, bool enabled, int next) => InkWell(
          onTap: enabled ? () => onChanged(next) : null,
          child: SizedBox(
            width: s,
            height: s,
            child: Icon(icon, size: small ? 14 : 18, color: enabled ? AppColors.slate600 : AppColors.slate300),
          ),
        );
    return Container(
      decoration: BoxDecoration(
        color: const Color(0x80F8FAFC),
        border: Border.all(color: AppColors.slate200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          btn(Icons.remove, canDecrease, value - 1),
          SizedBox(
            width: small ? 30 : 44,
            child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
          ),
          btn(Icons.add, canIncrease, value + 1),
        ],
      ),
    );
  }
}

/// "Thường được mua kèm" strip (FP-Growth rules); links to the product page, where a
/// size / colour has to be picked before adding.
class _ComplementsStrip extends StatefulWidget {
  final String cartKey;
  final void Function(String path) onOpen;
  const _ComplementsStrip({required this.cartKey, required this.onOpen});

  @override
  State<_ComplementsStrip> createState() => _ComplementsStripState();
}

class _ComplementsStripState extends State<_ComplementsStrip> {
  List<CartComplement> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant _ComplementsStrip old) {
    super.didUpdateWidget(old);
    if (old.cartKey != widget.cartKey) _load();
  }

  Future<void> _load() async {
    if (widget.cartKey.isEmpty) return;
    final r = await RecommendationService.cartComplements(3);
    if (mounted) setState(() => _items = r);
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('THƯỜNG ĐƯỢC MUA KÈM', style: labelCaps(color: AppColors.slate900, weight: FontWeight.w900)),
        const SizedBox(height: 12),
        for (final c in _items)
          InkWell(
            onTap: () => widget.onOpen('/products/${c.product.slug}'),
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(width: 56, height: 72, child: NetImage(c.product.primaryImage)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text('${c.source == 'RULE' ? 'Hay mua kèm' : 'Bán chạy'} · ${segmentLabel(c.segment)}',
                            style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                      ],
                    ),
                  ),
                  Text('${formatVnd(c.product.displayPrice)}₫', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
