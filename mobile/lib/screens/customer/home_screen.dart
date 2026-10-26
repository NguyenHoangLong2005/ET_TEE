import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../models/product.dart';
import '../../services/product_service.dart';
import '../../services/recommendation_service.dart';
import '../../services/shop_service.dart';
import '../../widgets/common.dart';
import '../../widgets/product_card.dart';
import '../../widgets/store_scaffold.dart';

/// Port of web app/page.tsx: hero, trust bar, categories, for-you, marketing carousels,
/// outfit lookbook, best sellers, newsletter.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Product> _new = [], _best = [], _sale = [], _family = [], _trending = [];
  int _trendingDays = 0;
  int _reload = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final r = await Future.wait([
      ProductService.newProducts(8),
      ProductService.bestSellers(8),
      ProductService.saleProducts(8),
      ProductService.familyOutfits(4),
    ]);
    final (days, trending) = await RecommendationService.trending(12);
    if (!mounted) return;
    setState(() {
      _new = r[0];
      _best = r[1];
      _sale = r[2];
      _family = r[3];
      _trendingDays = days;
      _trending = trending;
    });
  }

  Future<void> _refresh() async {
    setState(() => _reload++);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return StoreScaffold(
      showAnnouncement: true,
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _refresh,
        child: ListView(
          key: ValueKey(_reload),
          children: [
            const _HeroBanner(),
            const _TrustBar(),
            const _CategoryHighlights(),
            // personal blocks need the shopper's login / guest token; each hides until it has history
            const _PersonalizedSections(),
            // everyone, including first-time visitors
            ProductCarousel(
              title: 'Đang Được Quan Tâm',
              subtitle: 'Được nhiều khách xem, thêm vào giỏ và mua nhất ${_trendingDays > 0 ? _trendingDays : 7} ngày qua',
              background: AppColors.slate50,
              products: _trending,
              trackSource: 'recommendation',
            ),
            _MarketingCarousel(
              placementKey: 'HOME_SALE',
              title: 'Ưu Đãi Đặc Biệt',
              subtitle: 'Mức giá cực tốt - Số lượng có hạn, mua ngay kẻo lỡ',
              viewAllLink: '/products?status=sale',
              background: const Color(0x66FEF2F2),
              fallback: _sale,
            ),
            _MarketingCarousel(
              placementKey: 'HOME_NEW',
              title: 'Sản Phẩm Mới',
              subtitle: 'Cập nhật xu hướng thời trang Thu Đông 2026 mới nhất',
              viewAllLink: '/products?sort=newest',
              fallback: _new,
            ),
            // Only when marketing curates HOME_RECOMMENDED: falling back to best-sellers showed
            // the same products as "Bán Chạy Nhất" below.
            _MarketingCarousel(
              placementKey: 'HOME_RECOMMENDED',
              title: 'Được Yêu Thích Nhất',
              subtitle: 'Những sản phẩm đang bán chạy và được nhiều khách hàng lựa chọn',
              viewAllLink: '/products',
              background: AppColors.slate50,
              fallback: const [],
            ),
            _OutfitSection(products: _family.isNotEmpty ? _family : _new),
            _MarketingCarousel(
              placementKey: 'HOME_BEST_SELLER',
              title: 'Bán Chạy Nhất',
              subtitle: 'Những sản phẩm được ưa chuộng và đánh giá 5 sao từ khách hàng',
              viewAllLink: '/products?sort=best-seller',
              background: AppColors.slate50,
              fallback: _best,
            ),
            const _RecentlyViewedSection(),
            const _Newsletter(),
            const _Footer(),
          ],
        ),
      ),
    );
  }
}

// ─── Hero ───────────────────────────────────────────────────────────────────

class _Slide {
  final String bg;
  final String href;
  _Slide(this.bg, this.href);
}

final _fallbackSlides = [
  _Slide('/images/banners/home/banner-1.webp', '/products'),
  _Slide('/images/banners/home/banner-2.webp', '/products?sort=best-seller'),
  _Slide('/images/banners/home/banner-3.webp', '/products?targetGroup=family'),
  _Slide('/images/banners/home/banner-4.webp', '/products?targetGroup=women'),
  _Slide('/images/banners/home/banner-5.webp', '/products?targetGroup=men'),
  _Slide('/images/banners/home/banner-6.webp', '/products?targetGroup=kids'),
  _Slide('/images/banners/home/banner-7.webp', '/products?status=sale'),
  _Slide('/images/banners/home/banner-8.webp', '/products'),
];

class _HeroBanner extends StatefulWidget {
  const _HeroBanner();

  @override
  State<_HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends State<_HeroBanner> {
  List<_Slide> _slides = _fallbackSlides;
  final _ctrl = PageController();
  int _current = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadBanners();
    _timer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!_ctrl.hasClients || _slides.isEmpty) return;
      _ctrl.animateToPage((_current + 1) % _slides.length, duration: const Duration(milliseconds: 700), curve: Curves.easeInOut);
    });
  }

  /// Real HOME_HERO banners managed by marketing; the static slides stay as a fallback.
  Future<void> _loadBanners() async {
    final banners = await CustomerMarketingService.heroBanners();
    final active = banners
        .where((b) => (b['status'] ?? 'ACTIVE') == 'ACTIVE' && b['isActive'] != false)
        .where((b) => resolveImageUrl(b['imageUrl']) != null)
        .toList()
      ..sort((a, c) {
        final o = toNum(a['displayOrder']).compareTo(toNum(c['displayOrder']));
        return o != 0 ? o : toNum(c['priority']).compareTo(toNum(a['priority']));
      });
    if (active.isEmpty || !mounted) return;
    setState(() {
      _slides = active.map((b) {
        final link = '${b['linkUrl'] ?? ''}'.trim();
        return _Slide('${b['imageUrl']}', link.isNotEmpty ? link : '/products');
      }).toList();
      _current = 0;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      // Banners are 2880x900 with the headline in the image; 4:3 cropped the text off the sides.
      aspectRatio: 16 / 5,
      child: Container(
        color: AppColors.slate900,
        child: Stack(
          children: [
            PageView.builder(
              controller: _ctrl,
              itemCount: _slides.length,
              onPageChanged: (i) => setState(() => _current = i),
              itemBuilder: (_, i) => GestureDetector(
                onTap: () => openLink(context, _slides[i].href),
                child: NetImage(
                  resolveImageUrl(_slides[i].bg),
                  fallback: NetImage(resolveImageUrl(_fallbackSlides[0].bg)),
                ),
              ),
            ),
            Positioned(
              bottom: 18,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _slides.length; i++)
                    GestureDetector(
                      onTap: () => _ctrl.animateToPage(i, duration: const Duration(milliseconds: 400), curve: Curves.easeOut),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: i == _current ? 32 : 16,
                        height: 4,
                        color: i == _current ? Colors.white : Colors.white54,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Banner / marketing links are web paths ("/products?status=sale"); external URLs open in the browser.
void openLink(BuildContext context, String href) {
  if (href.startsWith('http')) {
    final uri = Uri.tryParse(href);
    if (uri != null && (uri.host == 'localhost' || uri.host == '127.0.0.1')) {
      context.push(uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path);
    }
    return;
  }
  context.push(href.startsWith('/') ? href : '/$href');
}

// ─── Trust bar ──────────────────────────────────────────────────────────────

class _TrustBar extends StatelessWidget {
  const _TrustBar();

  static const _items = [
    (Icons.local_shipping_outlined, 'Giao Hàng Miễn Phí', 'Áp dụng cho mọi đơn hàng toàn quốc'),
    (Icons.autorenew, 'Đổi Trả 30 Ngày', 'Đổi trả tận nơi hoặc trực tiếp tại cửa hàng'),
    (Icons.verified_user_outlined, 'Chất Liệu Minh Bạch', 'Thành phần vải ghi rõ trên từng sản phẩm'),
    (Icons.phone_in_talk_outlined, 'Tư Vấn Hỗ Trợ', 'Hotline miễn cước: 1900 1234 (8h - 22h)'),
  ];

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 12),
        decoration: const BoxDecoration(border: Border.symmetric(horizontal: BorderSide(color: AppColors.slate200))),
        child: GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.45,
          children: [
            for (final (icon, title, desc) in _items)
              Padding(
                padding: const EdgeInsets.all(6),
                child: Column(
                  children: [
                    Icon(icon, size: 30, color: AppColors.slate900),
                    const SizedBox(height: 8),
                    Text(title.toUpperCase(), textAlign: TextAlign.center, style: labelCaps(size: 11, color: AppColors.slate900)),
                    const SizedBox(height: 4),
                    Text(desc, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: AppColors.slate500, height: 1.4)),
                  ],
                ),
              ),
          ],
        ),
      );
}

// ─── Categories (bento) ─────────────────────────────────────────────────────

class _CategoryHighlights extends StatefulWidget {
  const _CategoryHighlights();

  @override
  State<_CategoryHighlights> createState() => _CategoryHighlightsState();
}

class _CategoryHighlightsState extends State<_CategoryHighlights> with AutomaticKeepAliveClientMixin {
  // ListView drops off-screen children; keep this one so scrolling back neither refetches nor jumps.
  @override
  bool get wantKeepAlive => true;

  List<(String name, String sub, String img, String href)>? _cats;

  // Model shots on the same grey backdrop; the home banners carry their own headline text and
  // printed a second headline under the category name. No per-tile badge: "ORGANIC" etc. were
  // assigned by position, not by anything true about the category.
  static const _tileImages = {
    'women': '/images/women/outerwear/ao-khoac-active-nu-interlock-scuba-se285.webp',
    'men': '/images/men/shirt/ao-so-mi-flannel-dai-tay-nam-hoa-tiet-ke-cg100.webp',
    'kids': '/images/kids/outerwear/ao-khoac-gio-active-be-trai-co-hinh-in-sb001.webp',
    'family': '/images/family/tshirt/ao-phong-active-unisex-tre-em-co-hinh-in-wicking-sm042.webp',
    'accessories': '/images/accessories/accessories/khan-badana-vietnam-youngster-fr081.webp',
  };
  static const _labels = {
    'women': 'Thời trang nữ', 'men': 'Thời trang nam', 'kids': 'Trẻ em', 'family': 'Gia đình', 'accessories': 'Phụ kiện',
  };
  static const _order = ['women', 'men', 'kids', 'family', 'accessories'];

  static List<(String, String, String, String)> get _static => [
        for (final slug in _order) (_labels[slug]!, 'Thời trang ET.TEE', _tileImages[slug]!, '/products?category=$slug'),
      ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final all = await ProductService.categories();
      int rank(Map c) {
        final i = _order.indexOf('${c['slug']}');
        return i < 0 ? 99 : i;
      }
      final roots = all.where((c) => c['active'] == true && c['parentId'] == null).toList()
        ..sort((a, b) => rank(a).compareTo(rank(b)));
      final cats = [
        for (final c in roots.take(5))
          (
            _labels['${c['slug']}'] ?? '${c['name']}',
            '${c['description'] ?? ''}'.isEmpty ? 'Thời trang ET.TEE' : '${c['description']}',
            (c['imageUrl'] as String?)?.isNotEmpty == true
                ? c['imageUrl'] as String
                : _tileImages['${c['slug']}'] ?? _tileImages['women']!,
            '/products?category=${c['slug']}',
          ),
      ];
      if (mounted) setState(() => _cats = cats.isEmpty ? _static : cats);
    } catch (_) {
      if (mounted) setState(() => _cats = _static);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final cats = _cats;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 40, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('KHÁM PHÁ THEO DANH MỤC', style: headline(20, color: AppColors.black))),
              GestureDetector(
                onTap: () => context.push('/products'),
                child: Row(children: [
                  Text('XEM TẤT CẢ', style: labelCaps(size: 12, color: AppColors.slate500)),
                  const Icon(Icons.north_east, size: 15, color: AppColors.slate500),
                ]),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (cats == null)
            Column(children: [
              for (var i = 0; i < 3; i++)
                Container(height: 180, margin: const EdgeInsets.only(bottom: 12), decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(12))),
            ])
          else ...[
            if (cats.isNotEmpty) _tile(cats[0], 300, large: true),
            for (var i = 1; i < cats.length; i += 2)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(children: [
                  Expanded(child: _tile(cats[i], 200)),
                  if (i + 1 < cats.length) ...[const SizedBox(width: 12), Expanded(child: _tile(cats[i + 1], 200))],
                ]),
              ),
          ],
        ],
      ),
    );
  }

  Widget _tile((String, String, String, String) c, double h, {bool large = false}) {
    final (name, sub, img, href) = c;
    return GestureDetector(
      onTap: () => context.push(href),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: SizedBox(
        height: h,
        child: Stack(
          fit: StackFit.expand,
          children: [
            NetImage(resolveImageUrl(img)),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [Color(0xCC000000), Color(0x33000000), Colors.transparent],
                ),
              ),
            ),
            Positioned(
              left: 14,
              right: 14,
              bottom: 14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (large) ...[
                    Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70, fontSize: 11)),
                    const SizedBox(height: 2),
                  ],
                  Text(name.toUpperCase(),
                      maxLines: 2, style: TextStyle(color: Colors.white, fontSize: large ? 20 : 15, fontWeight: FontWeight.w700, letterSpacing: 0.5, height: 1.2)),
                ],
              ),
            ),
          ],
        ),
      ),
      )
    );
  }
}

// ─── Personalised sections ──────────────────────────────────────────────────

/// Port of web PersonalizedSections.tsx, right under the categories. Each block hides itself when
/// it has nothing to show, so a first-time visitor sees none of them:
///   Dành riêng cho bạn   SASRec over recent views / cart / orders
///   Vì bạn đã xem        CLIP neighbours of the last product viewed
///   Hoàn thiện giỏ hàng  FP-Growth rules on the current cart
class _PersonalizedSections extends StatefulWidget {
  const _PersonalizedSections();

  @override
  State<_PersonalizedSections> createState() => _PersonalizedSectionsState();
}

class _PersonalizedSectionsState extends State<_PersonalizedSections> with AutomaticKeepAliveClientMixin {
  // ListView drops off-screen children; keep this one so scrolling back neither refetches nor jumps.
  @override
  bool get wantKeepAlive => true;

  ForYouFeed? _forYou;
  (Product?, List<Product>)? _because;
  List<CartComplement>? _cart;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final forYouF = RecommendationService.forYou(12);
    final becauseF = RecommendationService.becauseYouViewed(16);
    final cartF = RecommendationService.cartComplements(8);
    final forYou = await forYouF;
    final because = await becauseF;
    final cart = await cartF;
    if (!mounted) return;
    setState(() {
      _forYou = forYou;
      _because = because;
      _cart = cart;
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final f = _forYou, b = _because, c = _cart;
    if (f == null || b == null || c == null) return const SizedBox.shrink();
    final seen = <int>{};
    final forYou = f.strategy == 'NONE' ? <Product>[] : unseenProducts(f.products, seen, 12);
    final (anchor, becauseProducts) = b;
    final because = anchor != null ? unseenProducts(becauseProducts, seen, 12) : <Product>[];
    final cart = unseenProducts(c.map((x) => x.product).toList(), seen, 8);
    final cartFromRules = c.any((x) => x.source == 'RULE');
    return Column(children: [
      ProductCarousel(
        title: 'Dành Riêng Cho Bạn',
        subtitle: 'Gợi ý dựa trên những sản phẩm bạn vừa xem và chọn mua',
        products: forYou,
        trackSource: 'recommendation',
      ),
      if (anchor != null)
        ProductCarousel(
          title: 'Vì Bạn Đã Xem',
          subtitle: 'Sản phẩm có kiểu dáng và màu sắc gần với “${anchor.name}”',
          background: AppColors.slate50,
          products: because,
          trackSource: 'recommendation',
        ),
      ProductCarousel(
        title: 'Hoàn Thiện Giỏ Hàng',
        subtitle: cartFromRules
            ? 'Những món khách hàng thường mua cùng các sản phẩm trong giỏ của bạn'
            : 'Sản phẩm bán chạy cùng nhóm với các món trong giỏ của bạn',
        products: cart,
        trackSource: 'recommendation',
      ),
    ]);
  }
}

/// "Bạn đã xem gần đây": the shopper's own last product pages. Hidden without history.
class _RecentlyViewedSection extends StatefulWidget {
  const _RecentlyViewedSection();

  @override
  State<_RecentlyViewedSection> createState() => _RecentlyViewedSectionState();
}

class _RecentlyViewedSectionState extends State<_RecentlyViewedSection> with AutomaticKeepAliveClientMixin {
  // ListView drops off-screen children; keep this one so scrolling back neither refetches nor jumps.
  @override
  bool get wantKeepAlive => true;

  List<Product> _products = [];

  @override
  void initState() {
    super.initState();
    RecommendationService.recentlyViewed(12).then((list) {
      if (mounted) setState(() => _products = list);
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return ProductCarousel(
      title: 'Bạn Đã Xem Gần Đây',
      subtitle: 'Quay lại những sản phẩm bạn vừa xem',
      products: _products,
    );
  }
}

// ─── Marketing carousel ─────────────────────────────────────────────────────

/// Products curated by marketing for `placementKey`; falls back to the automatic list.
class _MarketingCarousel extends StatefulWidget {
  final String placementKey;
  final String title;
  final String subtitle;
  final String viewAllLink;
  final Color background;
  final List<Product> fallback;
  const _MarketingCarousel({
    required this.placementKey,
    required this.title,
    required this.subtitle,
    required this.viewAllLink,
    required this.fallback,
    this.background = Colors.white,
  });

  @override
  State<_MarketingCarousel> createState() => _MarketingCarouselState();
}

class _MarketingCarouselState extends State<_MarketingCarousel> with AutomaticKeepAliveClientMixin {
  // ListView drops off-screen children; keep this one so scrolling back neither refetches nor jumps.
  @override
  bool get wantKeepAlive => true;

  List<Product>? _curated;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final placements = await CustomerMarketingService.placements(widget.placementKey);
    final ids = placements
        .where((p) => (p['status'] ?? 'ACTIVE') == 'ACTIVE')
        .map((p) => toInt(p['productId']))
        .where((id) => id > 0)
        .toList();
    if (ids.isEmpty) return;
    final loaded = (await Future.wait(ids.map(ProductService.byId))).whereType<Product>().toList();
    if (loaded.isNotEmpty && mounted) setState(() => _curated = loaded);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final curated = _curated;
    return ProductCarousel(
      title: widget.title,
      subtitle: widget.subtitle,
      viewAllLink: widget.viewAllLink,
      background: widget.background,
      products: curated ?? widget.fallback,
    );
  }
}

// ─── Outfit lookbook ────────────────────────────────────────────────────────

class _OutfitSection extends StatelessWidget {
  final List<Product> products;
  const _OutfitSection({required this.products});

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ĐỒ GIA ĐÌNH', style: headline(22, color: Colors.black)),
          const SizedBox(height: 8),
          const Text('Trang phục đồng bộ cho bố mẹ và bé, mặc cùng nhau thật ăn ý',
              style: TextStyle(fontSize: 13, color: AppColors.slate500, height: 1.5)),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => context.push('/products?category=family'),
            child: Text('XEM TẤT CẢ →', style: labelCaps(size: 12, color: AppColors.slate500)),
          ),
          const SizedBox(height: 24),
          ProductGrid(products: products.take(4).toList()),
        ],
      ),
    );
  }
}

// ─── Newsletter ─────────────────────────────────────────────────────────────

class _Newsletter extends StatefulWidget {
  const _Newsletter();

  @override
  State<_Newsletter> createState() => _NewsletterState();
}

class _NewsletterState extends State<_Newsletter> {
  final _email = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  /// Stores the consent only; every marketing email carries a one-click unsubscribe link.
  Future<void> _submit() async {
    final email = _email.text.trim();
    if (email.isEmpty) return;
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      Toast.error('Địa chỉ email không đúng định dạng');
      return;
    }
    setState(() => _sending = true);
    try {
      await CustomerMarketingService.subscribeNewsletter(email);
      Toast.success('Đã đăng ký! Bạn sẽ nhận email khi ET.TEE có ưu đãi mới.');
      _email.clear();
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không đăng ký được, vui lòng thử lại.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Container(
        color: AppColors.slate50,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 48),
        decoration: null,
        child: Column(
          children: [
            Text('ĐĂNG KÝ NHẬN BẢN TIN', textAlign: TextAlign.center, style: headline(22)),
            const SizedBox(height: 12),
            const Text('Cập nhật sớm nhất về các bộ sưu tập mới và ưu đãi độc quyền từ ET.TEE.',
                textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate600, fontSize: 14, height: 1.5)),
            const SizedBox(height: 24),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                hintText: 'Địa chỉ email của bạn',
                border: OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: AppColors.slate300)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: AppColors.slate300)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: Colors.black)),
              ),
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Colors.black, shape: const RoundedRectangleBorder()),
                onPressed: _sending ? null : _submit,
                child: Text('ĐĂNG KÝ', style: labelCaps(size: 13, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Bằng cách đăng ký, bạn đồng ý nhận email ưu đãi và Chính sách bảo mật của chúng tôi. Hủy bất cứ lúc nào bằng link trong email.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: AppColors.slate500, height: 1.5),
            ),
          ],
        ),
      );
}

class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) => Container(
        color: AppColors.slate900,
        padding: const EdgeInsets.fromLTRB(20, 32, 20, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('ET.TEE', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -1)),
            const SizedBox(height: 8),
            const Text('Thời trang gia đình, mặc đẹp mỗi ngày.', style: TextStyle(color: AppColors.slate400, fontSize: 13)),
            const SizedBox(height: 20),
            Wrap(spacing: 18, runSpacing: 10, children: [
              for (final (label, path) in const [
                ('Tin tức', '/news'),
                ('Sản phẩm', '/products'),
                ('Tìm kiếm', '/search'),
                ('Tài khoản', '/account'),
                ('Chọn size', '/size-guide'),
                ('Cửa hàng', '/stores'),
                ('FAQ', '/faq'),
                ('Chính sách', '/policy'),
                ('Bảo mật', '/privacy'),
                ('Điều khoản', '/terms'),
                ('Liên hệ', '/contact'),
                ('Giới thiệu', '/about'),
                ('Tuyển dụng', '/careers'),
              ])
                GestureDetector(
                  onTap: () => context.push(path),
                  child: Text(label, style: const TextStyle(color: AppColors.slate300, fontSize: 13, fontWeight: FontWeight.w600)),
                ),
            ]),
            const SizedBox(height: 24),
            const Text('Hotline: 1900 1234 (8h - 22h)', style: TextStyle(color: AppColors.slate500, fontSize: 12)),
            const SizedBox(height: 4),
            const Text('© 2026 ET.TEE Studio', style: TextStyle(color: AppColors.slate500, fontSize: 12)),
          ],
        ),
      );
}
