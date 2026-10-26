import '../core/api.dart';
import '../core/config.dart';

class ProductVariant {
  final int? id;
  final String sku;
  final String color;
  final String? colorHex;
  final String? colorCode;
  final String size;
  final num price;
  final num? salePrice;
  final int stock;
  final int? availableQuantity;

  ProductVariant({
    this.id,
    this.sku = '',
    this.color = '',
    this.colorHex,
    this.colorCode,
    this.size = '',
    this.price = 0,
    this.salePrice,
    this.stock = 0,
    this.availableQuantity,
  });

  /// Checkout and the cart check availableQuantity; max(stock, available) showed items as in
  /// stock that the server then refused.
  int get sellable => availableQuantity ?? stock;

  factory ProductVariant.fromJson(Map<String, dynamic> j) => ProductVariant(
        id: j['id'] == null ? null : toInt(j['id']),
        sku: '${j['sku'] ?? ''}',
        color: '${j['color'] ?? ''}',
        colorHex: _nonEmpty(j['colorHex']),
        colorCode: _nonEmpty(j['colorCode']),
        size: '${j['size'] ?? ''}',
        price: toNum(j['price']),
        salePrice: j['salePrice'] == null ? null : toNum(j['salePrice']),
        stock: toInt(j['stock']),
        availableQuantity: j['availableQuantity'] == null ? null : toInt(j['availableQuantity']),
      );
}

class ProductImage {
  final String imageUrl;
  final bool isPrimary;
  final String? colorCode;
  final String? colorHex;
  ProductImage(this.imageUrl, {this.isPrimary = false, this.colorCode, this.colorHex});

  factory ProductImage.fromJson(dynamic j) {
    if (j is String) return ProductImage(j);
    final m = j as Map<String, dynamic>;
    return ProductImage('${m['imageUrl'] ?? ''}',
        isPrimary: m['isPrimary'] == true, colorCode: _nonEmpty(m['colorCode']), colorHex: _nonEmpty(m['colorHex']));
  }
}

class Product {
  final int id;
  final String name;
  final String slug;
  final String description;
  final String? brand;
  final num price;
  final num? salePrice;
  final String? categoryName;
  final String? gender;
  final String? targetGroup;
  final String? productType;
  final String? material;
  final bool isNew;
  final bool isSale;
  final List<ProductVariant> variants;
  final List<ProductImage> images;
  final num averageRating;
  final int totalReviews;
  final int soldCount;

  Product({
    required this.id,
    required this.name,
    required this.slug,
    this.description = '',
    this.brand,
    this.price = 0,
    this.salePrice,
    this.categoryName,
    this.gender,
    this.targetGroup,
    this.productType,
    this.material,
    this.isNew = false,
    this.isSale = false,
    this.variants = const [],
    this.images = const [],
    this.averageRating = 0,
    this.totalReviews = 0,
    this.soldCount = 0,
  });

  factory Product.fromJson(Map<String, dynamic> j) {
    final cat = j['category'];
    return Product(
      id: toInt(j['id']),
      name: '${j['name'] ?? ''}',
      slug: '${j['slug'] ?? j['id'] ?? ''}',
      description: '${j['description'] ?? ''}',
      brand: _nonEmpty(j['brand']),
      price: toNum(j['price']),
      salePrice: j['salePrice'] == null ? null : toNum(j['salePrice']),
      categoryName: cat is Map ? _nonEmpty(cat['name']) : _nonEmpty(cat),
      gender: _nonEmpty(j['gender']),
      targetGroup: _nonEmpty(j['targetGroup']),
      productType: _nonEmpty(j['productType']),
      material: _nonEmpty(j['material']),
      isNew: j['isNew'] == true,
      isSale: j['isSale'] == true,
      variants: (j['variants'] is List ? j['variants'] as List : const [])
          .whereType<Map<String, dynamic>>()
          .map(ProductVariant.fromJson)
          .toList(),
      images: _images(j),
      averageRating: toNum(j['averageRating']),
      totalReviews: toInt(j['totalReviews']),
      soldCount: toInt(j['soldCount']),
    );
  }

  static List<ProductImage> _images(Map<String, dynamic> j) {
    final raw = j['images'];
    if (raw is List && raw.isNotEmpty) {
      return raw.map(ProductImage.fromJson).where((i) => i.imageUrl.isNotEmpty).toList();
    }
    final single = j['imageUrl'] ?? j['image'];
    return single is String && single.isNotEmpty ? [ProductImage(single)] : [];
  }

  /// The price the shopper pays (salePrice || price), as on every web product card.
  num get displayPrice => (salePrice != null && salePrice! > 0) ? salePrice! : price;
  num? get originalPrice => (salePrice != null && salePrice! > 0) ? price : null;

  String? get primaryImage {
    if (images.isEmpty) return null;
    final p = images.firstWhere((i) => i.isPrimary, orElse: () => images.first);
    return resolveImageUrl(p.imageUrl);
  }

  String? get hoverImage => images.length > 1 ? resolveImageUrl(images[1].imageUrl) : null;

  String get categoryLabel => categoryName ?? 'Sản phẩm';

  List<String> get colorHexes => variants.map((v) => v.colorHex).whereType<String>().toSet().toList();
  List<String> get sizes => sortSizes(variants.map((v) => v.size).where((s) => s.isNotEmpty).toSet());
}

const _letterRank = {'XXS': 0, 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, '2XL': 6, 'XXXL': 7, '3XL': 7, '4XL': 8, '5XL': 9};

/// Size pickers in size order (web lib/utils/sizeOrder): XS → 4XL, numbers ascending
/// (shoe sizes, kids' heights), anything else alphabetically last. Variants come back in
/// insertion order, which listed one product's sizes as "42 43 40 41".
List<String> sortSizes(Iterable<String> sizes) {
  (int, num, String) key(String size) {
    final s = size.trim().toUpperCase();
    final rank = _letterRank[s];
    if (rank != null) return (0, rank, s);
    final n = num.tryParse(s.replaceAll(',', '.')) ?? num.tryParse(RegExp(r'^\d+([.,]\d+)?').stringMatch(s)?.replaceAll(',', '.') ?? '');
    return n != null ? (1, n, s) : (2, 0, s);
  }

  return sizes.toList()
    ..sort((a, b) {
      final (ga, va, sa) = key(a);
      final (gb, vb, sb) = key(b);
      return ga != gb ? ga - gb : (va != vb ? va.compareTo(vb) : sa.compareTo(sb));
    });
}

String? _nonEmpty(dynamic v) {
  if (v == null) return null;
  final s = '$v'.trim();
  return s.isEmpty ? null : s;
}

/// "#E50027" -> Color value; null for anything unparseable.
int? hexToArgb(String? hex) {
  if (hex == null) return null;
  var h = hex.replaceAll('#', '').trim();
  if (h.length == 3) h = h.split('').map((c) => '$c$c').join();
  if (h.length != 6) return null;
  final v = int.tryParse(h, radix: 16);
  return v == null ? null : 0xFF000000 | v;
}
