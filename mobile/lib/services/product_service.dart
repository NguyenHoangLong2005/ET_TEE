import '../core/api.dart';
import '../core/storage.dart';
import '../models/product.dart';

class ProductPage {
  final List<Product> items;
  final int totalItems;
  final int currentPage;
  final int pageSize;
  final int totalPages;
  ProductPage(this.items, this.totalItems, this.currentPage, this.pageSize, this.totalPages);
}

class ProductStats {
  final Map<String, int> targetGroup;
  final Map<String, int> productType;
  final Map<String, List<String>> sizes;
  ProductStats({this.targetGroup = const {}, this.productType = const {}, this.sizes = const {}});
}

List<Product> productsFrom(dynamic d) =>
    asList(d).whereType<Map<String, dynamic>>().map(Product.fromJson).toList();

/// Port of web productService.ts.
class ProductService {
  static final _api = Api.instance;

  static Future<ProductPage> getProducts(Map<String, dynamic> params) async {
    final res = await _api.send('GET', '/api/products', query: params);
    if (!res.ok) throw ApiException('Không thể tải danh sách sản phẩm');
    final d = res.data as Map<String, dynamic>? ?? {};
    return ProductPage(
      productsFrom(d['items']),
      toInt(d['totalItems']),
      toInt(d['currentPage'], 1),
      toInt(d['pageSize'], 24),
      toInt(d['totalPages']),
    );
  }

  static Future<List<Product>> _list(Map<String, dynamic> params) async {
    try {
      return (await getProducts(params)).items;
    } catch (_) {
      return [];
    }
  }

  static Future<List<Product>> newProducts([int limit = 8]) => _list({'pageSize': limit, 'sort': 'newest'});
  static Future<List<Product>> bestSellers([int limit = 8]) => _list({'pageSize': limit, 'sort': 'best-seller'});
  // Discounted items only (was the cheapest items, sort=price-asc), same as the web home.
  static Future<List<Product>> saleProducts([int limit = 8]) async =>
      (await _list({'pageSize': limit, 'status': 'sale', 'sort': 'discount-desc'}))
          .where((p) => p.isSale || (p.salePrice != null && p.salePrice! < p.price))
          .toList();
  static Future<List<Product>> familyOutfits([int limit = 4]) => _list({'pageSize': limit, 'category': 'family'});

  static Future<Product?> bySlug(String slug) async {
    try {
      final res = await _api.send('GET', '/api/products/${Uri.encodeComponent(slug)}');
      if (!res.ok || res.data is! Map) return null;
      return Product.fromJson(res.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Numeric-id lookup used for marketing placements.
  static Future<Product?> byId(int id) async {
    try {
      final res = await _api.send('GET', '/api/customer/products/$id');
      if (!res.ok || res.data is! Map) return null;
      return Product.fromJson(res.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  static Future<List<Product>> similar(String slug, [int limit = 10]) async {
    try {
      final res = await _api.send('GET', '/api/products/${Uri.encodeComponent(slug)}/similar', query: {'limit': limit});
      return res.ok ? productsFrom(res.data) : [];
    } catch (_) {
      return [];
    }
  }

  static Future<ProductStats> stats() async {
    try {
      final res = await _api.send('GET', '/api/products/stats');
      if (!res.ok || res.data is! Map) return ProductStats();
      final d = res.data as Map;
      Map<String, int> counts(dynamic m) =>
          m is Map ? m.map((k, v) => MapEntry('$k', toInt(v))) : <String, int>{};
      final sizes = <String, List<String>>{};
      if (d['sizes'] is Map) {
        (d['sizes'] as Map).forEach((k, v) {
          if (v is List) sizes['$k'] = v.map((e) => '$e').toList();
        });
      }
      return ProductStats(targetGroup: counts(d['targetGroup']), productType: counts(d['productType']), sizes: sizes);
    } catch (_) {
      return ProductStats();
    }
  }

  static Future<List<Map<String, dynamic>>> categories() async {
    for (var i = 0; i < 3; i++) {
      try {
        final res = await _api.send('GET', '/api/categories');
        if (res.ok) return asList(res.data).whereType<Map<String, dynamic>>().toList();
      } catch (_) {}
      if (i < 2) await Future.delayed(Duration(milliseconds: 800 * (i + 1)));
    }
    throw ApiException('Không thể tải danh mục');
  }

  static Future<List<Map<String, dynamic>>> activeShops() async {
    final d = await _api.get('/api/shops/active');
    return asList(d).whereType<Map<String, dynamic>>().toList();
  }
}

/// Storefront behavior events: the app only reports VIEW; cart/purchase events are recorded by
/// the backend from the X-Behavior-Session header.
class BehaviorTracking {
  static int? _lastId;
  static DateTime? _lastAt;

  static Map<String, String> sessionHeader() => {'X-Behavior-Session': AppStorage.instance.behaviorSessionId()};

  // Web behaviorTracking.ts: a click in a recommendation section tags the VIEW it leads to with
  // source=recommendation, so those sections' click-through can be measured.
  static int? _nextSourceId;
  static String? _nextSource;
  static DateTime? _nextSourceAt;

  static void markNextViewSource(int productId, String source) {
    if (productId <= 0) return;
    _nextSourceId = productId;
    _nextSource = source;
    _nextSourceAt = DateTime.now();
  }

  /// The source to report with this product's VIEW, consumed once. Public for tests.
  static String? takeViewSource(int productId, {DateTime? now}) {
    if (_nextSourceId != productId) return null;
    final source = _nextSource;
    final at = _nextSourceAt;
    _nextSourceId = null;
    _nextSource = null;
    _nextSourceAt = null;
    // a click only counts for the product page it opened, if that page opens soon after
    return at != null && (now ?? DateTime.now()).difference(at).inMinutes < 5 ? source : null;
  }

  static void trackProductView(int productId) {
    if (productId <= 0) return;
    final source = takeViewSource(productId);
    final now = DateTime.now();
    if (_lastId == productId && _lastAt != null && now.difference(_lastAt!).inSeconds < 60) return;
    _lastId = productId;
    _lastAt = now;
    Api.instance
        .send('POST', '/api/events',
            guest: true,
            body: {
              'productId': productId,
              'eventType': 'VIEW',
              'sessionId': AppStorage.instance.behaviorSessionId(),
              'source': ?source,
            })
        .catchError((_) => ApiResponse(0, null));
  }
}
