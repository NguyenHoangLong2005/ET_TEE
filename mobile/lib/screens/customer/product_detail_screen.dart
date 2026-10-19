import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../models/product.dart';
import '../../services/product_service.dart';
import '../../services/recommendation_service.dart';
import '../../state/cart_provider.dart';
import '../../state/wishlist_provider.dart';
import '../../widgets/cart_widgets.dart';
import '../../widgets/common.dart';
import '../../widgets/product_card.dart';
import '../../widgets/store_scaffold.dart';
import 'product_reviews.dart';

/// Port of web app/products/[slug]/page.tsx (gallery, info, description, reviews, recommendations).
class ProductDetailScreen extends StatefulWidget {
  final String slug;
  final String? color;
  const ProductDetailScreen({super.key, required this.slug, this.color});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Product? _product;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await ProductService.bySlug(widget.slug);
    if (!mounted) return;
    setState(() {
      _product = p;
      _loading = false;
    });
    if (p != null) BehaviorTracking.trackProductView(p.id);
  }

  @override
  Widget build(BuildContext context) {
    final p = _product;
    if (_loading) return const StoreScaffold(body: LoadingView());
    if (p == null) {
      return StoreScaffold(
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: EmptyPanel(
            icon: Icons.search_off,
            title: 'Không tìm thấy sản phẩm',
            message: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.',
            action: PillButton('Tiếp tục mua sắm', onPressed: () => context.go('/products')),
          ),
        ),
      );
    }
    return StoreScaffold(
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Text.rich(
              TextSpan(style: const TextStyle(fontSize: 12, color: AppColors.slate500), children: [
                const TextSpan(text: 'Sản phẩm  /  '),
                TextSpan(text: '${p.categoryName ?? 'Danh mục'}  /  '),
                TextSpan(text: p.name, style: const TextStyle(color: AppColors.slate900, fontWeight: FontWeight.w600)),
              ]),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          _Gallery(product: p, initialColor: widget.color),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ProductInfo(product: p, initialColor: widget.color),
                _Description(product: p),
                ProductReviewsSection(slug: p.slug),
              ],
            ),
          ),
          _Recommendations(slug: p.slug),
        ],
      ),
    );
  }
}

// ─── Gallery ────────────────────────────────────────────────────────────────

class _Gallery extends StatefulWidget {
  final Product product;
  final String? initialColor;
  const _Gallery({required this.product, this.initialColor});

  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  late final List<ProductImage> _images =
      widget.product.images.where((i) => i.imageUrl.isNotEmpty && !i.imageUrl.contains('placeholder')).toList();
  late final PageController _ctrl;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    final c = widget.initialColor;
    if (c != null) {
      final i = _images.indexWhere((img) => img.colorCode == c || img.colorHex?.replaceAll('#', '').toLowerCase() == c.toLowerCase());
      if (i >= 0) _index = i;
    }
    _ctrl = PageController(initialPage: _index);
    GalleryBus.listen(_onColor);
  }

  /// Picking a colour on the info panel shows that colour's photo (web did it through ?color=).
  void _onColor(String code, String? hex) {
    final i = _images.indexWhere((img) =>
        img.colorCode == code || (hex != null && img.colorHex?.replaceAll('#', '').toLowerCase() == hex.replaceAll('#', '').toLowerCase()));
    if (i >= 0 && _ctrl.hasClients) _ctrl.animateToPage(i, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  @override
  void dispose() {
    GalleryBus.remove(_onColor);
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_images.isEmpty) return AspectRatio(aspectRatio: 3 / 4, child: Container(color: AppColors.slate50, child: const NetImage(null)));
    return Column(
      children: [
        AspectRatio(
          aspectRatio: 3 / 4,
          child: Container(
            color: AppColors.slate50,
            child: PageView.builder(
              controller: _ctrl,
              itemCount: _images.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (_, i) => InteractiveViewer(minScale: 1, maxScale: 3, child: NetImage(resolveImageUrl(_images[i].imageUrl))),
            ),
          ),
        ),
        if (_images.length > 1)
          SizedBox(
            height: 92,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              scrollDirection: Axis.horizontal,
              itemCount: _images.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, i) => GestureDetector(
                onTap: () => _ctrl.animateToPage(i, duration: const Duration(milliseconds: 250), curve: Curves.easeOut),
                child: Container(
                  width: 64,
                  decoration: BoxDecoration(border: Border.all(color: i == _index ? const Color(0xFF18181B) : Colors.transparent, width: 2)),
                  child: NetImage(resolveImageUrl(_images[i].imageUrl)),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Tiny pub/sub between the colour picker and the gallery on the same page.
class GalleryBus {
  static final _listeners = <void Function(String, String?)>[];
  static void listen(void Function(String, String?) f) => _listeners.add(f);
  static void remove(void Function(String, String?) f) => _listeners.remove(f);
  static void emit(String code, String? hex) {
    for (final l in List.of(_listeners)) {
      l(code, hex);
    }
  }
}

// ─── Info ───────────────────────────────────────────────────────────────────

class _ProductInfo extends StatefulWidget {
  final Product product;
  final String? initialColor;
  const _ProductInfo({required this.product, this.initialColor});

  @override
  State<_ProductInfo> createState() => _ProductInfoState();
}

class _ColorOpt {
  final String name;
  final String hex;
  final String? code;
  _ColorOpt(this.name, this.hex, this.code);
}

class _ProductInfoState extends State<_ProductInfo> {
  late final List<_ColorOpt> _colors;
  late final List<String> _sizes;
  final Map<String, int> _stock = {};
  String _color = '';
  String _size = '';
  int _qty = 1;
  bool _submitting = false;
  int _adviceKey = 0;

  Product get p => widget.product;

  @override
  void initState() {
    super.initState();
    final byHex = <String, _ColorOpt>{};
    for (final v in p.variants) {
      if (v.colorHex != null) byHex.putIfAbsent(v.colorHex!, () => _ColorOpt(v.color, v.colorHex!, v.colorCode));
    }
    _colors = byHex.values.toList();
    _sizes = p.variants.map((v) => v.size).where((s) => s.isNotEmpty).toSet().toList();
    for (final v in p.variants) {
      if (v.colorHex == null || v.size.isEmpty) continue;
      final key = '${v.colorHex}__${v.size}';
      if (v.sellable > (_stock[key] ?? 0)) _stock[key] = v.sellable;
    }
    final url = widget.initialColor;
    _ColorOpt? init;
    if (url != null) {
      for (final c in _colors) {
        if (c.code == url || c.hex.replaceAll('#', '').toLowerCase() == url.toLowerCase()) init = c;
      }
    }
    _color = (init ?? (_colors.isNotEmpty ? _colors.first : null))?.hex ?? '';
  }

  ProductVariant? get _variant {
    for (final v in p.variants) {
      if ((v.colorHex == _color || v.colorHex == null) && (v.size == _size || v.size.isEmpty)) return v;
    }
    return null;
  }

  int get _stockOfVariant => _variant?.sellable ?? 0;
  bool get _outOfStock => _color.isNotEmpty && _size.isNotEmpty && _stockOfVariant == 0;
  bool _colorHasStock(String hex) => _sizes.any((s) => (_stock['${hex}__$s'] ?? 0) > 0);
  bool _sizeHasStock(String size) => _color.isEmpty || (_stock['${_color}__$size'] ?? 0) > 0;

  /// buyNow: "Mua ngay" buys exactly the chosen quantity: an existing line gets its quantity set.
  Future<bool> _addToCart({bool buyNow = false}) async {
    if (_submitting) return false;
    if (_color.isEmpty && _colors.isNotEmpty) {
      Toast.error('Vui lòng chọn màu sắc.');
      return false;
    }
    if (_size.isEmpty && _sizes.isNotEmpty) {
      Toast.error('Vui lòng chọn kích cỡ.');
      return false;
    }
    if (_outOfStock) {
      Toast.error('Sản phẩm tạm hết hàng cho phân loại này.');
      return false;
    }
    if (_variant == null && p.variants.isNotEmpty) {
      Toast.error('Phân loại không hợp lệ.');
      return false;
    }
    final variantId = _variant?.id ?? (p.variants.isNotEmpty ? p.variants.first.id : null);
    if (variantId == null) {
      Toast.error('Không tìm thấy biến thể phù hợp');
      return false;
    }
    final stock = _stockOfVariant;
    final safeQty = stock > 0 ? _qty.clamp(1, stock) : _qty;
    if (safeQty != _qty) setState(() => _qty = safeQty);
    setState(() => _submitting = true);
    final cart = context.read<CartProvider>();
    try {
      final existing = buyNow ? cart.cart?.items.where((i) => i.variantId == variantId).firstOrNull : null;
      if (existing != null) {
        await cart.setQuantityRaw(existing.id, safeQty);
      } else {
        await cart.addToCart(variantId, safeQty);
      }
      return true;
    } catch (e) {
      if (buyNow && e is ApiException) Toast.error(e.message);
      return false;
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _pickSize(String sz) {
    // chart labels say 2XL, the catalogue sells XXL
    final match = _sizes.firstWhere((s) => s == sz || (sz == '2XL' && s == 'XXL'), orElse: () => sz);
    setState(() => _size = match);
  }

  @override
  Widget build(BuildContext context) {
    final v = _variant;
    final priceSrcPrice = v != null && v.price > 0 ? v.price : p.price;
    final priceSrcSale = v != null && v.price > 0 ? v.salePrice : p.salePrice;
    final current = (priceSrcSale != null && priceSrcSale > 0) ? priceSrcSale : priceSrcPrice;
    final original = priceSrcSale != null && priceSrcSale > 0 && roundVnd(priceSrcSale) < roundVnd(priceSrcPrice) ? priceSrcPrice : null;
    final discount = original != null ? (((original - current) / original) * 100).round() : 0;
    final rating = p.averageRating.round();
    final inWishlist = context.watch<WishlistProvider>().contains(p.id);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          if (p.isNew) const StatusPill('MỚI', bg: AppColors.slate900, fg: Colors.white, fontSize: 10),
          if (p.isNew && discount > 0) const SizedBox(width: 6),
          if (discount > 0) StatusPill('-$discount%', bg: AppColors.primary, fg: Colors.white, fontSize: 10),
          const Spacer(),
          Text((p.categoryName ?? 'THỜI TRANG').toUpperCase(), style: labelCaps(size: 11, color: AppColors.slate400).copyWith(letterSpacing: 1.6)),
        ]),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Text(p.name, style: headline(20, weight: FontWeight.w700))),
            IconButton(
              onPressed: () async {
                final wl = context.read<WishlistProvider>();
                final (ok, msg) = inWishlist ? await wl.remove(p.id) : await wl.add(p.id);
                ok ? Toast.success(inWishlist ? 'Đã xóa khỏi mục yêu thích' : 'Đã thêm vào mục yêu thích') : Toast.error(msg ?? 'Có lỗi xảy ra');
              },
              icon: Icon(inWishlist ? Icons.favorite : Icons.favorite_border, color: inWishlist ? AppColors.primary : AppColors.slate400),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.only(bottom: 14),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              if (p.totalReviews > 0) ...[
                Text.rich(TextSpan(children: [
                  TextSpan(text: '★' * rating, style: const TextStyle(color: AppColors.amber500)),
                  TextSpan(text: '★' * (5 - rating), style: const TextStyle(color: AppColors.slate200)),
                ])),
                Text('${p.averageRating.toStringAsFixed(1)}/5', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const Text('•', style: TextStyle(color: AppColors.slate300)),
                Text('${p.totalReviews} đánh giá', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
              ] else
                const Text('Chưa có đánh giá', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
              const Text('•', style: TextStyle(color: AppColors.slate300)),
              Text('Đã bán ${p.soldCount}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Wrap(crossAxisAlignment: WrapCrossAlignment.end, spacing: 12, children: [
          Text('${formatVnd(current)}₫', style: headline(28, color: discount > 0 ? AppColors.primary : AppColors.slate900)),
          if (original != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text('${formatVnd(original)}₫',
                  style: const TextStyle(fontSize: 15, color: AppColors.slate400, decoration: TextDecoration.lineThrough, fontWeight: FontWeight.w500)),
            ),
        ]),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: const Color(0xB3F8FAFC), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
          child: const Row(children: [
            Icon(Icons.local_shipping_outlined, size: 17, color: AppColors.primary),
            SizedBox(width: 10),
            Expanded(
              child: Text.rich(TextSpan(style: TextStyle(fontSize: 12, color: AppColors.slate800), children: [
                TextSpan(text: 'Freeship toàn quốc cho '),
                TextSpan(text: 'mọi đơn hàng', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate900)),
              ])),
            ),
          ]),
        ),
        const SizedBox(height: 20),
        if (_colors.isNotEmpty) ...[
          Text.rich(TextSpan(children: [
            TextSpan(text: 'MÀU SẮC: ', style: labelCaps(size: 12, color: AppColors.slate900, weight: FontWeight.w900)),
            TextSpan(
                text: _colors.where((c) => c.hex == _color).map((c) => c.name).firstOrNull ?? '',
                style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w600)),
          ])),
          const SizedBox(height: 10),
          Wrap(spacing: 10, runSpacing: 10, children: [
            for (final c in _colors)
              Opacity(
                opacity: _colorHasStock(c.hex) ? 1 : 0.4,
                child: GestureDetector(
                  onTap: _colorHasStock(c.hex)
                      ? () {
                          setState(() {
                            _color = c.hex;
                            _size = '';
                          });
                          GalleryBus.emit(c.code ?? c.hex.replaceAll('#', ''), c.hex);
                        }
                      : null,
                  child: Container(
                    width: 38,
                    height: 38,
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: _color == c.hex ? AppColors.slate900 : Colors.transparent, width: 2),
                    ),
                    child: ColorDot(c.hex, size: 30),
                  ),
                ),
              ),
          ]),
          const SizedBox(height: 20),
        ],
        if (_sizes.isNotEmpty) ...[
          Row(children: [
            Text.rich(TextSpan(children: [
              TextSpan(text: 'KÍCH CỠ', style: labelCaps(size: 12, color: AppColors.slate900, weight: FontWeight.w900)),
              if (_size.isNotEmpty) TextSpan(text: ' : $_size', style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w600)),
            ])),
            const Spacer(),
            GestureDetector(
              onTap: () async {
                final picked = await showSizeGuide(context, p);
                if (picked != null) {
                  _pickSize(picked);
                  Toast.success('Đã tự động chọn Size $picked');
                }
                setState(() => _adviceKey++);
              },
              child: const Text('Hướng dẫn chọn size',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.slate500, decoration: TextDecoration.underline)),
            ),
          ]),
          const SizedBox(height: 10),
          _SizeSuggestionChip(key: ValueKey(_adviceKey), slug: p.slug, onSelect: _pickSize),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final s in _sizes)
              GestureDetector(
                onTap: _sizeHasStock(s)
                    ? () => setState(() {
                          _size = s;
                          final next = _stock['${_color}__$s'] ?? 0;
                          if (next > 0 && _qty > next) _qty = next;
                        })
                    : null,
                child: Opacity(
                  opacity: _sizeHasStock(s) ? 1 : 0.5,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 56),
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: _size == s ? AppColors.slate900 : (_sizeHasStock(s) ? Colors.white : AppColors.slate50),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _size == s ? AppColors.slate900 : AppColors.slate200),
                    ),
                    // widthFactor 1: inside a Wrap an aligned Container would stretch to the full row.
                    child: Center(widthFactor: 1, child: Text(s.toUpperCase(),
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: _size == s ? Colors.white : (_sizeHasStock(s) ? AppColors.slate800 : AppColors.slate300)))),
                  ),
                ),
              ),
          ]),
          const SizedBox(height: 18),
        ],
        if (_color.isNotEmpty && _size.isNotEmpty) ...[
          _outOfStock
              ? const StatusPill('Hết hàng phân loại này', bg: AppColors.red50, fg: AppColors.primary)
              : StatusPill('Còn $_stockOfVariant sản phẩm sẵn có', bg: AppColors.emerald50, fg: AppColors.emerald700),
          const SizedBox(height: 16),
        ],
        Row(children: [
          QtyStepper(
            value: _qty,
            canDecrease: _qty > 1,
            canIncrease: _stockOfVariant > 0 ? _qty < _stockOfVariant : _qty < 10,
            onChanged: (q) => setState(() => _qty = q),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: PillButton(
              _submitting ? 'Đang thêm...' : 'Thêm vào giỏ',
              style: PillStyle.light,
              icon: Icons.shopping_bag_outlined,
              onPressed: _submitting || _outOfStock
                  ? null
                  : () async {
                      if (await _addToCart() && context.mounted) showCartDrawer(context);
                    },
            ),
          ),
        ]),
        const SizedBox(height: 12),
        PillButton(
          'Mua ngay',
          expand: true,
          onPressed: _submitting || _outOfStock
              ? null
              : () async {
                  if (await _addToCart(buyNow: true) && context.mounted) context.push('/checkout');
                },
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.only(top: 18),
          decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.slate100))),
          child: Row(children: [
            for (final (icon, label) in const [
              (Icons.local_shipping_outlined, 'Freeship mọi đơn'),
              (Icons.autorenew, 'Đổi trả 30 ngày'),
              (Icons.verified_user_outlined, '100% Chính hãng'),
            ])
              Expanded(
                child: Column(children: [
                  Icon(icon, size: 20, color: AppColors.slate800),
                  const SizedBox(height: 6),
                  Text(label.toUpperCase(), textAlign: TextAlign.center, style: labelCaps(size: 9.5, color: AppColors.slate700)),
                ]),
              ),
          ]),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              backgroundColor: AppColors.slate50,
              foregroundColor: AppColors.slate800,
              side: const BorderSide(color: AppColors.slate200),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => showStoreStock(context, p.name, _colors.where((c) => c.hex == _color).map((c) => c.name).firstOrNull, _size),
            icon: const Icon(Icons.location_on_outlined, size: 17, color: AppColors.amber500),
            label: const Text('Xem cửa hàng còn sản phẩm gần bạn', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }
}

/// "Gợi ý cho bạn: size L" from saved measurements; hidden until there are some.
class _SizeSuggestionChip extends StatefulWidget {
  final String slug;
  final ValueChanged<String> onSelect;
  const _SizeSuggestionChip({super.key, required this.slug, required this.onSelect});

  @override
  State<_SizeSuggestionChip> createState() => _SizeSuggestionChipState();
}

class _SizeSuggestionChipState extends State<_SizeSuggestionChip> {
  SizeAdvice? _advice;

  @override
  void initState() {
    super.initState();
    SizeAdvisorService.forProduct(widget.slug, SizeAdvisorService.loadBody()).then((a) {
      if (mounted) setState(() => _advice = a);
    });
  }

  @override
  Widget build(BuildContext context) {
    final a = _advice;
    if (a?.size == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () => widget.onSelect(a.size!),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
              color: AppColors.emerald50, borderRadius: BorderRadius.circular(999), border: Border.all(color: AppColors.emerald200)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.straighten, size: 14, color: AppColors.emerald800),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                'Gợi ý cho bạn: size ${a!.size}${a.confidence != 'FITS' ? ' (gần đúng)' : ''}${!a.bestInStock && a.bestSize != null ? ' · size ${a.bestSize} đang hết' : ''}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.emerald800),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

// ─── Size guide ─────────────────────────────────────────────────────────────

/// Size calculator (web SizeGuideModal calculator view). Returns the size picked, if any.
Future<String?> showSizeGuide(BuildContext context, Product p) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => _SizeGuideSheet(product: p),
  );
}

class _SizeGuideSheet extends StatefulWidget {
  final Product product;
  const _SizeGuideSheet({required this.product});

  @override
  State<_SizeGuideSheet> createState() => _SizeGuideSheetState();
}

class _SizeGuideSheetState extends State<_SizeGuideSheet> {
  double _height = 170, _weight = 65;
  String _fit = 'REGULAR';
  bool _calculating = false;
  String? _size;
  String _reason = '';
  List<String> _details = [];

  @override
  void initState() {
    super.initState();
    final saved = SizeAdvisorService.loadBody();
    if (saved != null) {
      _height = toNum(saved['height'], 170).toDouble();
      _weight = toNum(saved['weight'], 65).toDouble();
      _fit = '${saved['fit'] ?? 'REGULAR'}';
    }
    final g = widget.product.targetGroup ?? widget.product.gender;
    if (g == 'kids') {
      _height = _height > 160 ? 120 : _height;
      _weight = _weight > 60 ? 25 : _weight;
    }
  }

  Future<void> _calculate() async {
    final p = widget.product;
    if (p.productType == 'accessories' || p.targetGroup == 'accessories') {
      setState(() {
        _size = 'Freesize';
        _reason = 'Phụ kiện không chọn theo số đo cơ thể.';
      });
      return;
    }
    setState(() {
      _calculating = true;
      _details = [];
    });
    final body = {'height': _height.round(), 'weight': _weight.round(), 'fit': _fit};
    final a = await SizeAdvisorService.forProduct(p.slug, body);
    await SizeAdvisorService.saveBody(body);
    if (!mounted) return;
    setState(() {
      _calculating = false;
      if (a == null || a.size == null) {
        _size = null;
        _reason = a?.reason == 'NO_STOCK' ? 'Sản phẩm này đã hết các size phù hợp.' : 'Chưa gợi ý được size, vui lòng xem bảng size.';
        return;
      }
      _size = a.size;
      final notes = [if (a.confidence != null) confidenceLabel[a.confidence] ?? '', if (!a.bestInStock && a.bestSize != null) 'Size ${a.bestSize} hợp nhất nhưng đang hết hàng'];
      _reason = notes.where((n) => n.isNotEmpty).join(' · ');
      _details = a.reasons;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(color: AppColors.amber100, shape: BoxShape.circle),
                child: const Icon(Icons.straighten, size: 19, color: AppColors.amber700),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Bảng kích thước ET.TEE', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  Text('Quy đổi thông số chuẩn vóc dáng người Việt Nam', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
                ]),
              ),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ]),
            const SizedBox(height: 20),
            _slider('Chiều cao của bạn (cm)', _height, 80, 200, (v) => setState(() => _height = v)),
            _slider('Cân nặng của bạn (kg)', _weight, 10, 120, (v) => setState(() => _weight = v)),
            const SizedBox(height: 8),
            const Text('Sở thích mặc', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate700, fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final (id, label) in const [('SLIM', 'Ôm vừa vặn (Slim)'), ('REGULAR', 'Thoải mái (Regular)'), ('LOOSE', 'Rộng rãi (Oversize)')])
                ChoiceChip(
                  label: Text(label),
                  selected: _fit == id,
                  showCheckmark: false,
                  selectedColor: AppColors.slate900,
                  labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _fit == id ? Colors.white : AppColors.slate700),
                  onSelected: (_) => setState(() => _fit = id),
                ),
            ]),
            const SizedBox(height: 20),
            PillButton(_calculating ? 'Đang tính…' : 'Tính size phù hợp', style: PillStyle.dark, expand: true, loading: _calculating, onPressed: _calculate),
            if (_size != null || _reason.isNotEmpty) ...[
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.emerald200)),
                child: Column(children: [
                  if (_size != null) ...[
                    const Text('Size gợi ý cho bạn', style: TextStyle(fontSize: 12, color: AppColors.emerald800)),
                    Text(_size!, style: headline(36, color: AppColors.emerald800)),
                  ],
                  if (_reason.isNotEmpty) Text(_reason, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.emerald700)),
                  for (final d in _details)
                    Padding(padding: const EdgeInsets.only(top: 4), child: Text('• $d', style: const TextStyle(fontSize: 12, color: AppColors.slate600))),
                  if (_size != null && _size != 'Freesize') ...[
                    const SizedBox(height: 12),
                    PillButton('Chọn size $_size', onPressed: () => Navigator.pop(context, _size), height: 40),
                  ],
                ]),
              ),
            ],
            const SizedBox(height: 20),
            const Text('Cách đo', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            for (final t in const [
              'Vai: đo từ mỏm vai trái sang mỏm vai phải.',
              'Ngực: đo vòng quanh phần nở nhất của ngực.',
              'Eo: đo vòng quanh phần nhỏ nhất của eo.',
              'Mông: đo vòng quanh phần nở nhất của mông.',
            ])
              Padding(padding: const EdgeInsets.only(bottom: 4), child: Text('• $t', style: const TextStyle(fontSize: 12, color: AppColors.slate600))),
          ],
        ),
      ),
    );
  }

  Widget _slider(String label, double value, double min, double max, ValueChanged<double> onChanged) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate700, fontSize: 13)),
            const Spacer(),
            Text('${value.round()}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          ]),
          Slider(
            value: value.clamp(min, max),
            min: min,
            max: max,
            divisions: (max - min).round(),
            activeColor: AppColors.slate900,
            onChanged: onChanged,
          ),
        ],
      );
}

// ─── Store stock ────────────────────────────────────────────────────────────

Future<void> showStoreStock(BuildContext context, String productName, String? color, String size) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => _StoreStockSheet(productName: productName, color: color, size: size),
  );
}

class _StoreStockSheet extends StatefulWidget {
  final String productName;
  final String? color;
  final String size;
  const _StoreStockSheet({required this.productName, this.color, required this.size});

  @override
  State<_StoreStockSheet> createState() => _StoreStockSheetState();
}

class _StoreStockSheetState extends State<_StoreStockSheet> {
  List<Map<String, dynamic>>? _shops;
  String? _error;
  String _q = '';

  @override
  void initState() {
    super.initState();
    ProductService.activeShops().then((s) {
      if (mounted) setState(() => _shops = s);
    }).catchError((_) {
      if (mounted) setState(() => _error = 'Không thể tải danh sách cửa hàng.');
    });
  }

  @override
  Widget build(BuildContext context) {
    final shops = (_shops ?? [])
        .where((s) => '${s['name']}'.toLowerCase().contains(_q.toLowerCase()) || '${s['address']}'.toLowerCase().contains(_q.toLowerCase()))
        .toList();
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      builder: (_, ctrl) => ListView(
        controller: ctrl,
        padding: const EdgeInsets.all(20),
        children: [
          Row(children: [
            const Icon(Icons.location_on_outlined, color: AppColors.amber500),
            const SizedBox(width: 8),
            const Expanded(child: Text('Hệ thống cửa hàng ET.TEE', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
            IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
          ]),
          Text(
            '${widget.productName}${widget.color != null ? ' · ${widget.color}' : ''}${widget.size.isNotEmpty ? ' · Size ${widget.size}' : ''}',
            style: const TextStyle(fontSize: 12, color: AppColors.slate500),
          ),
          const SizedBox(height: 14),
          TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search, size: 18), hintText: 'Tìm theo tên hoặc địa chỉ'),
            onChanged: (v) => setState(() => _q = v),
          ),
          const SizedBox(height: 14),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: AppColors.red600))
          else if (_shops == null)
            const LoadingView()
          else if (shops.isEmpty)
            const Padding(padding: EdgeInsets.all(20), child: Text('Không tìm thấy cửa hàng phù hợp.', textAlign: TextAlign.center))
          else
            for (final s in shops)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${s['name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text('${s['address'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppColors.slate600)),
                  if (s['phone'] != null) ...[
                    const SizedBox(height: 4),
                    Row(children: [
                      const Icon(Icons.phone_outlined, size: 13, color: AppColors.slate400),
                      const SizedBox(width: 4),
                      Text('${s['phone']}', style: const TextStyle(fontSize: 12, color: AppColors.slate600)),
                    ]),
                  ],
                ]),
              ),
        ],
      ),
    );
  }
}

// ─── Description ────────────────────────────────────────────────────────────

class _Description extends StatelessWidget {
  final Product product;
  const _Description({required this.product});

  static const _typeLabel = {
    'tshirt': 'Áo thun', 'shirt': 'Áo sơ mi', 'polo': 'Áo polo', 'outerwear': 'Áo khoác', 'pants': 'Quần dài',
    'shorts': 'Quần short', 'skirt': 'Chân váy', 'dress': 'Đầm', 'homewear': 'Đồ mặc nhà / đồ lót', 'accessories': 'Phụ kiện',
  };
  static const _groupLabel = {'men': 'Nam', 'women': 'Nữ', 'kids': 'Trẻ em', 'family': 'Gia đình', 'accessories': 'Phụ kiện'};

  @override
  Widget build(BuildContext context) {
    final p = product;
    final specs = [
      ('Mã sản phẩm', '${p.id}'),
      ('Thương hiệu', p.brand ?? ''),
      ('Loại sản phẩm', _typeLabel[p.productType ?? ''] ?? p.categoryName ?? ''),
      ('Dành cho', _groupLabel[p.targetGroup ?? ''] ?? ''),
      ('Chất liệu', p.material ?? 'Đang cập nhật'),
    ].where((r) => r.$2.isNotEmpty).toList();
    Widget tile(String title, bool open, Widget child) => Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: Container(
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate200))),
            child: ExpansionTile(
              initiallyExpanded: open,
              tilePadding: EdgeInsets.zero,
              childrenPadding: const EdgeInsets.only(bottom: 16),
              title: Text(title.toUpperCase(), style: labelCaps(size: 12, color: AppColors.slate900)),
              children: [child],
            ),
          ),
        );
    return Container(
      margin: const EdgeInsets.only(top: 28),
      decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.slate200))),
      child: Column(children: [
        tile(
          'Thông số sản phẩm',
          true,
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              decoration: BoxDecoration(border: Border.all(color: AppColors.slate200), borderRadius: BorderRadius.circular(12)),
              child: Column(children: [
                for (var i = 0; i < specs.length; i++)
                  Container(
                    color: i.isEven ? AppColors.slate50 : Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      SizedBox(width: 110, child: Text(specs[i].$1, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.slate500))),
                      Expanded(child: Text(specs[i].$2, style: const TextStyle(fontSize: 12))),
                    ]),
                  ),
              ]),
            ),
          ),
        ),
        if (p.description.isNotEmpty)
          tile('Mô tả sản phẩm', true,
              Align(alignment: Alignment.centerLeft, child: Text(p.description, style: const TextStyle(fontSize: 13, color: AppColors.slate700, height: 1.6)))),
        tile(
          'Hướng dẫn giặt & bảo quản',
          false,
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Khuyến nghị chung — ưu tiên hướng dẫn trên nhãn sản phẩm.', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 3.4,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              children: [
                for (final t in const ['✔️ Giặt ở nhiệt độ thường 30°C', '❌ Không dùng chất tẩy mạnh', '✔️ Lộn trái khi giặt và phơi', '✔️ Ủi ở nhiệt độ thấp'])
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate100)),
                    child: Text(t, style: const TextStyle(fontSize: 11)),
                  ),
              ],
            ),
          ]),
        ),
      ]),
    );
  }
}

// ─── Recommendations ────────────────────────────────────────────────────────

class _Recommendations extends StatefulWidget {
  final String slug;
  const _Recommendations({required this.slug});

  @override
  State<_Recommendations> createState() => _RecommendationsState();
}

class _RecommendationsState extends State<_Recommendations> {
  List<Product> _similar = [];
  OutfitSet? _outfit;

  @override
  void initState() {
    super.initState();
    ProductService.similar(widget.slug, 10).then((s) {
      if (mounted) setState(() => _similar = s);
    });
    RecommendationService.outfit(widget.slug).then((o) {
      if (mounted) setState(() => _outfit = o);
    });
  }

  @override
  Widget build(BuildContext context) {
    final pieces = _outfit?.pieces ?? [];
    final isModel = _outfit?.strategy == 'MODEL';
    final setTotal = pieces.fold<num>(0, (s, p) => s + p.product.displayPrice);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ProductCarousel(title: 'Sản phẩm tương tự', products: _similar, padding: const EdgeInsets.only(top: 48, bottom: 24), trackSource: 'recommendation'),
        if (pieces.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
            child: Column(children: [
              Text((isModel ? 'Phối trọn bộ' : 'Gợi ý phối đồ').toUpperCase(), textAlign: TextAlign.center, style: headline(20, weight: FontWeight.w700)),
              if (isModel)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text.rich(
                    TextSpan(style: const TextStyle(fontSize: 13, color: AppColors.slate500), children: [
                      const TextSpan(text: 'Các món hợp với sản phẩm này và hợp với nhau · Tổng các món phối: '),
                      TextSpan(text: '${formatVnd(setTotal)}₫', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate900)),
                    ]),
                    textAlign: TextAlign.center,
                  ),
                ),
              const SizedBox(height: 20),
              LayoutBuilder(builder: (context, c) {
                final w = (c.maxWidth - 14) / 2;
                return Wrap(spacing: 14, runSpacing: 24, children: [
                  for (final piece in pieces)
                    SizedBox(
                      width: w,
                      child: Column(children: [
                        ProductCard(product: piece.product),
                        if (piece.slot != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text((slotLabel[piece.slot] ?? piece.slot!).toUpperCase(), style: labelCaps(size: 11, color: AppColors.slate500)),
                          ),
                        if (piece.alternatives.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Wrap(alignment: WrapAlignment.center, children: [
                              const Text('Hoặc: ', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                              for (var i = 0; i < piece.alternatives.length; i++)
                                GestureDetector(
                                  onTap: () => context.push('/products/${piece.alternatives[i].slug}'),
                                  child: Text(
                                    '${i > 0 ? ' · ' : ''}${piece.alternatives[i].name.length > 28 ? '${piece.alternatives[i].name.substring(0, 28)}…' : piece.alternatives[i].name}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.slate500, decoration: TextDecoration.underline),
                                  ),
                                ),
                            ]),
                          ),
                      ]),
                    ),
                ]);
              }),
            ]),
          ),
      ],
    );
  }
}
