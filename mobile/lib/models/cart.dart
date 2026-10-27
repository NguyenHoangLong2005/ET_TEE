import '../core/api.dart';

class CartItem {
  final int id;
  final int variantId;
  final String productSlug;
  final String productName;
  final String productImage;
  final String color;
  final String colorHex;
  final String size;
  final num price;
  final num salePrice;
  final int quantity;
  final int availableQuantity;
  final num itemTotal;

  CartItem({
    required this.id,
    required this.variantId,
    required this.productSlug,
    required this.productName,
    required this.productImage,
    required this.color,
    required this.colorHex,
    required this.size,
    required this.price,
    required this.salePrice,
    required this.quantity,
    required this.availableQuantity,
    required this.itemTotal,
  });

  factory CartItem.fromJson(Map<String, dynamic> j) => CartItem(
        id: toInt(j['id']),
        variantId: toInt(j['variantId']),
        productSlug: '${j['productSlug'] ?? ''}',
        productName: '${j['productName'] ?? ''}',
        productImage: '${j['productImage'] ?? ''}',
        color: '${j['color'] ?? ''}',
        colorHex: '${j['colorHex'] ?? ''}',
        size: '${j['size'] ?? ''}',
        price: toNum(j['price']),
        salePrice: toNum(j['salePrice']),
        quantity: toInt(j['quantity']),
        availableQuantity: toInt(j['availableQuantity'], 999),
        itemTotal: toNum(j['itemTotal']),
      );

  num get unitPrice => salePrice > 0 ? salePrice : price;
}

class CartData {
  final int id;
  final List<CartItem> items;
  final num subtotal;
  final int totalQuantity;

  const CartData({this.id = 0, this.items = const [], this.subtotal = 0, this.totalQuantity = 0});

  static const empty = CartData();

  factory CartData.fromJson(Map<String, dynamic> j) => CartData(
        id: toInt(j['id']),
        items: (j['items'] is List ? j['items'] as List : const [])
            .whereType<Map<String, dynamic>>()
            .map(CartItem.fromJson)
            .toList(),
        subtotal: toNum(j['subtotal']),
        totalQuantity: toInt(j['totalQuantity']),
      );

  bool get isEmpty => items.isEmpty;
}
