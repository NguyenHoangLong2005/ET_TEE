import '../core/api.dart';
import '../core/storage.dart';
import '../models/product.dart';
import 'product_service.dart';

class ForYouFeed {
  final String strategy;
  final List<Product> products;
  ForYouFeed(this.strategy, this.products);
}

class CartComplement {
  final Product product;
  final String segment;
  final String source;
  CartComplement(this.product, this.segment, this.source);
}

class OutfitPiece {
  final String? slot;
  final Product product;
  final List<Product> alternatives;
  OutfitPiece(this.slot, this.product, this.alternatives);
}

class OutfitSet {
  final String strategy;
  final List<OutfitPiece> pieces;
  OutfitSet(this.strategy, this.pieces);
}

const _groupLabel = {'men': 'nam', 'women': 'nữ', 'kids': 'trẻ em', 'unisex': ''};
const _typeLabel = {
  'tshirt': 'Áo thun',
  'shirt': 'Áo sơ mi',
  'polo': 'Áo polo',
  'pants': 'Quần dài',
  'shorts': 'Quần short',
  'skirt': 'Chân váy',
  'dress': 'Đầm',
  'outerwear': 'Áo khoác',
  'accessories': 'Phụ kiện',
  'homewear': 'Đồ mặc nhà',
};

/// "men:pants" -> "Quần dài nam"
String segmentLabel(String segment) {
  final parts = segment.split(':');
  final group = parts.isNotEmpty ? parts[0] : '';
  final type = parts.length > 1 ? parts[1] : '';
  return [_typeLabel[type] ?? type, _groupLabel[group] ?? ''].where((s) => s.isNotEmpty).join(' ');
}

/// Home page: drops products already shown in an earlier section (adds the kept ones to [seen]), so
/// the same item never repeats down the page. Web PersonalizedSections `unseen`.
List<Product> unseenProducts(List<Product> products, Set<int> seen, int limit) {
  final out = <Product>[];
  for (final p in products) {
    if (out.length >= limit) break;
    if (!seen.add(p.id)) continue;
    out.add(p);
  }
  return out;
}

const slotLabel ={'top': 'Áo', 'bottom': 'Quần / Váy', 'dress': 'Đầm', 'outer': 'Áo khoác', 'accessory': 'Phụ kiện'};

/// Port of web recommendationService.ts.
class RecommendationService {
  static final _api = Api.instance;

  /// "Dành riêng cho bạn": SASRec / CLIP feed from this shopper's behavior (guest token or login).
  static Future<ForYouFeed> forYou([int limit = 12]) async {
    try {
      final res = await _api.send('GET', '/api/recommendations/for-you', query: {'limit': limit}, guest: true);
      if (!res.ok || res.data is! Map) return ForYouFeed('NONE', []);
      final d = res.data as Map;
      return ForYouFeed('${d['strategy'] ?? 'NONE'}', productsFrom(d['products']));
    } catch (_) {
      return ForYouFeed('NONE', []);
    }
  }

  /// Home "Đang được quan tâm": interest from all shoppers over the last 7 (or 30) days.
  static Future<(int windowDays, List<Product> products)> trending([int limit = 12]) async {
    try {
      final res = await _api.send('GET', '/api/recommendations/trending', query: {'limit': limit});
      if (!res.ok || res.data is! Map) return (0, <Product>[]);
      final d = res.data as Map;
      return (toInt(d['windowDays']), productsFrom(d['products']));
    } catch (_) {
      return (0, <Product>[]);
    }
  }

  /// Home "Vì bạn đã xem": CLIP neighbours of the last product this shopper viewed.
  static Future<(Product? anchor, List<Product> products)> becauseYouViewed([int limit = 16]) async {
    try {
      final res = await _api.send('GET', '/api/recommendations/because-you-viewed', query: {'limit': limit}, guest: true);
      if (!res.ok || res.data is! Map) return (null, <Product>[]);
      final d = res.data as Map;
      final anchor = d['anchor'] is Map ? Product.fromJson((d['anchor'] as Map).cast<String, dynamic>()) : null;
      return (anchor, productsFrom(d['products']));
    } catch (_) {
      return (null, <Product>[]);
    }
  }

  /// Home "Bạn đã xem gần đây": this shopper's own last product pages, newest first.
  static Future<List<Product>> recentlyViewed([int limit = 12]) async {
    try {
      final res = await _api.send('GET', '/api/recommendations/recently-viewed', query: {'limit': limit}, guest: true);
      return res.ok ? productsFrom(res.data) : [];
    } catch (_) {
      return [];
    }
  }

  /// "Thường được mua kèm" for the current cart (FP-Growth rules).
  static Future<List<CartComplement>> cartComplements([int limit = 4]) async {
    try {
      final res = await _api.send('GET', '/api/recommendations/cart-complements', query: {'limit': limit}, guest: true);
      if (!res.ok || res.data is! Map) return [];
      return asList((res.data as Map)['items'])
          .whereType<Map<String, dynamic>>()
          .where((m) => m['product'] is Map)
          .map((m) => CartComplement(Product.fromJson(m['product'] as Map<String, dynamic>), '${m['segment'] ?? ''}', '${m['source'] ?? ''}'))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// PDP "Phối trọn bộ".
  static Future<OutfitSet?> outfit(String slug) async {
    try {
      final res = await _api.send('GET', '/api/recommendations/outfit/${Uri.encodeComponent(slug)}');
      if (!res.ok || res.data is! Map) return null;
      final d = res.data as Map;
      final pieces = asList(d['pieces'])
          .whereType<Map<String, dynamic>>()
          .where((p) => p['product'] is Map)
          .map((p) => OutfitPiece(p['slot'] as String?, Product.fromJson(p['product'] as Map<String, dynamic>), productsFrom(p['alternatives'])))
          .toList();
      return OutfitSet('${d['strategy'] ?? 'RULE'}', pieces);
    } catch (_) {
      return null;
    }
  }
}

/// Sprint 5 search (hybrid keyword + CLIP, or by photo).
class SearchService {
  static Future<(String, List<Product>)> search(String q, [int limit = 24]) async {
    if (q.trim().isEmpty) return ('KEYWORD', <Product>[]);
    try {
      final res = await Api.instance.send('GET', '/api/search', query: {'q': q, 'limit': limit});
      if (!res.ok || res.data is! Map) return ('KEYWORD', <Product>[]);
      final d = res.data as Map;
      return ('${d['strategy'] ?? 'KEYWORD'}', productsFrom(d['products']));
    } catch (_) {
      return ('KEYWORD', <Product>[]);
    }
  }

  static Future<List<Product>> searchByImage(List<int> bytes, String filename, [int limit = 24]) async {
    final res = await Api.instance.upload('/api/search/image', 'file', bytes, filename, query: {'limit': limit});
    if (!res.ok) throw ApiException(res.errorMessage('Không tìm được bằng ảnh này'));
    final d = res.data;
    return d is Map ? productsFrom(d['products']) : [];
  }
}

const confidenceLabel = {
  'FITS': 'Vừa với số đo của bạn',
  'CLOSE': 'Gần đúng, nên xem thêm bảng size',
  'OUTSIDE_CHART': 'Số đo nằm ngoài bảng size, nên liên hệ tư vấn',
};

class SizeAdvice {
  final String? size;
  final String? confidence;
  final bool bestInStock;
  final String? bestSize;
  final List<String> reasons;
  final String? reason;
  SizeAdvice(this.size, this.confidence, this.bestInStock, this.bestSize, this.reasons, this.reason);

  factory SizeAdvice.fromJson(Map j) => SizeAdvice(
        j['size'] as String?,
        j['confidence'] as String?,
        j['bestInStock'] != false,
        j['bestSize'] as String?,
        asList(j['reasons']).map((e) => '$e').toList(),
        j['reason'] as String?,
      );
}

/// Sprint 6 size advice from the shop's published charts.
class SizeAdvisorService {
  static Map<String, dynamic> _query(Map<String, dynamic>? body) {
    if (body == null) return {};
    final q = <String, dynamic>{};
    for (final k in ['height', 'weight', 'chest', 'waist']) {
      final v = body[k];
      if (v is num && v > 0) q[k] = v;
    }
    if (body['fit'] != null) q['fit'] = body['fit'];
    return q;
  }

  static Future<SizeAdvice?> _get(String path, Map<String, dynamic>? body) async {
    try {
      final res = await Api.instance.send('GET', path, query: _query(body));
      if (!res.ok || res.data is! Map) return null;
      return SizeAdvice.fromJson(res.data as Map);
    } catch (_) {
      return null;
    }
  }

  static Future<SizeAdvice?> forProduct(String slug, [Map<String, dynamic>? body]) =>
      _get('/api/recommendations/size/${Uri.encodeComponent(slug)}', body);

  /// chart: MEN_TOP | MEN_BOTTOM | WOMEN | KIDS
  static Future<SizeAdvice?> forChart(String chart, Map<String, dynamic> body) =>
      _get('/api/recommendations/size-chart/$chart', body);

  static Map<String, dynamic>? loadBody() => AppStorage.instance.sizeProfile;
  static Future<void> saveBody(Map<String, dynamic> body) => AppStorage.instance.setSizeProfile(body);
}
