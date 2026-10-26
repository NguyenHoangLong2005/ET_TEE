import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/format.dart';
import '../core/theme.dart';
import '../core/toast.dart';
import '../models/product.dart';
import '../services/product_service.dart';
import '../state/wishlist_provider.dart';
import 'common.dart';

/// Port of web components/ui/ProductCard.tsx.
class ProductCard extends StatefulWidget {
  final Product product;
  final String? categoryOverride;
  /// Set in recommendation sections: the product view this card opens is tagged with it.
  final String? trackSource;
  const ProductCard({super.key, required this.product, this.categoryOverride, this.trackSource});

  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard> {
  bool _busy = false;

  Future<void> _toggleWishlist() async {
    if (_busy) return;
    final wl = context.read<WishlistProvider>();
    final id = widget.product.id;
    if (id <= 0) {
      Toast.error('Không thể cập nhật yêu thích: thiếu ID sản phẩm');
      return;
    }
    setState(() => _busy = true);
    final inList = wl.contains(id);
    final (ok, msg) = inList ? await wl.remove(id) : await wl.add(id);
    if (ok) {
      Toast.success(inList ? 'Đã xóa khỏi mục yêu thích' : 'Đã thêm vào mục yêu thích');
    } else {
      Toast.error(msg ?? 'Có lỗi xảy ra, vui lòng thử lại');
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final price = p.displayPrice;
    final original = p.originalPrice;
    // Compared as displayed (rounded to the thousand) so a sub-thousand "discount" isn't a sale.
    final isSale = original != null && roundVnd(original) > roundVnd(price);
    final discount = isSale ? (((original - price) / original) * 100).round() : 0;
    final inWishlist = context.watch<WishlistProvider>().contains(p.id);
    final colors = p.colorHexes;
    void open() {
      if (widget.trackSource != null) BehaviorTracking.markNextViewSource(p.id, widget.trackSource!);
      context.push('/products/${Uri.encodeComponent(p.slug)}');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: open,
          child: AspectRatio(
            aspectRatio: 3 / 4,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(color: const Color(0xCCF8FAFC)),
                  NetImage(p.primaryImage),
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (p.isNew) const _Badge('MỚI', AppColors.slate900),
                        if (p.isNew && isSale) const SizedBox(height: 4),
                        if (isSale) _Badge('-$discount%', AppColors.primary),
                      ],
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: _toggleWishlist,
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.92),
                          shape: BoxShape.circle,
                          boxShadow: const [BoxShadow(color: Color(0x140F172A), blurRadius: 2)],
                        ),
                        child: Icon(
                          inWishlist ? Icons.favorite : Icons.favorite_border,
                          size: 17,
                          color: inWishlist ? AppColors.primary : AppColors.slate400,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        if (colors.isNotEmpty) ...[
          Row(
            children: [
              for (final c in colors.take(5)) Padding(padding: const EdgeInsets.only(right: 5), child: ColorDot(c)),
              if (colors.length > 5)
                Text('+${colors.length - 5}', style: const TextStyle(fontSize: 10, color: AppColors.slate400, fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 6),
        ],
        Text((widget.categoryOverride ?? p.categoryLabel).toUpperCase(),
            maxLines: 1, overflow: TextOverflow.ellipsis, style: labelCaps(size: 10, color: AppColors.slate400)),
        const SizedBox(height: 3),
        GestureDetector(
          onTap: open,
          child: Text(p.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, height: 1.3, color: AppColors.slate900)),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          crossAxisAlignment: WrapCrossAlignment.end,
          children: [
            Text('${formatVnd(price)}₫',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: discount > 0 ? AppColors.primary : AppColors.slate900)),
            if (isSale)
              Text('${formatVnd(original)}₫',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.slate400, decoration: TextDecoration.lineThrough, fontWeight: FontWeight.w500)),
          ],
        ),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  const _Badge(this.text, this.color);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.8)),
      );
}

/// Grid of product cards, 2 columns on phones like the web's grid-cols-2.
class ProductGrid extends StatelessWidget {
  final List<Product> products;
  final EdgeInsetsGeometry padding;
  const ProductGrid({super.key, required this.products, this.padding = EdgeInsets.zero});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final cols = c.maxWidth >= 900 ? 4 : c.maxWidth >= 600 ? 3 : 2;
      const gap = 14.0;
      final w = (c.maxWidth - padding.horizontal - gap * (cols - 1)) / cols;
      return Padding(
        padding: padding,
        child: Wrap(
          spacing: gap,
          runSpacing: 24,
          children: [for (final p in products) SizedBox(width: w, child: ProductCard(product: p))],
        ),
      );
    });
  }
}

/// Horizontal scrolling row with a section header (web ProductCarousel / MarketingCarousel).
class ProductCarousel extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Product> products;
  final String? viewAllLink;
  final Color background;
  final Widget? badge;
  final EdgeInsetsGeometry padding;
  /// 'recommendation' on the recommender sections (web trackSource prop).
  final String? trackSource;
  const ProductCarousel({
    super.key,
    required this.title,
    required this.products,
    this.subtitle,
    this.viewAllLink,
    this.background = Colors.white,
    this.badge,
    this.padding = const EdgeInsets.symmetric(vertical: 36),
    this.trackSource,
  });

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    return Container(
      color: background,
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SectionHeader(
              title: title,
              subtitle: subtitle,
              badge: badge,
              actionLabel: viewAllLink != null ? 'Xem tất cả →' : null,
              onAction: viewAllLink != null ? () => context.push(viewAllLink!) : null,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 340,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: products.length,
              separatorBuilder: (_, _) => const SizedBox(width: 14),
              itemBuilder: (_, i) => SizedBox(width: 170, child: ProductCard(product: products[i], trackSource: trackSource)),
            ),
          ),
        ],
      ),
    );
  }
}
