import 'package:flutter/foundation.dart';

import '../core/api.dart';
import '../core/toast.dart';
import '../models/cart.dart';
import '../services/product_service.dart';

/// Port of web CartContext + cartService.ts (guest token or login).
class CartProvider extends ChangeNotifier {
  final _api = Api.instance;
  CartData? _cart;
  bool _loading = true;

  CartData? get cart => _cart;
  bool get isLoading => _loading;
  int get count => _cart?.totalQuantity ?? 0;

  Future<void> fetch() async {
    if (_cart == null) {
      _loading = true;
      notifyListeners();
    }
    try {
      final res = await _api.send('GET', '/api/cart', guest: true);
      _cart = res.ok && res.body is Map ? CartData.fromJson(res.body as Map<String, dynamic>) : CartData.empty;
    } catch (_) {
      _cart = CartData.empty;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void clearLocal() {
    _cart = CartData.empty;
    _loading = false;
    notifyListeners();
  }

  Future<CartData> _mutate(String method, String path, Object? body, String fallback, {Map<String, String> headers = const {}}) async {
    final res = await _api.send(method, path, body: body, guest: true, extraHeaders: headers);
    if (!res.ok) throw ApiException(res.errorMessage(fallback));
    final cart = CartData.fromJson(res.body as Map<String, dynamic>);
    _cart = cart;
    notifyListeners();
    return cart;
  }

  /// Throws on failure (after showing the toast) so "Mua ngay" can stop.
  Future<void> addToCart(int variantId, int quantity) async {
    try {
      await _mutate('POST', '/api/cart/items', {'variantId': variantId, 'quantity': quantity}, 'Lỗi khi thêm vào giỏ hàng',
          headers: BehaviorTracking.sessionHeader());
      Toast.success('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Có lỗi xảy ra khi thêm vào giỏ hàng');
      rethrow;
    }
  }

  /// "Mua ngay" sets the line's quantity instead of stacking on top of it.
  Future<void> setQuantityRaw(int itemId, int quantity) =>
      _mutate('PUT', '/api/cart/items/$itemId', {'quantity': quantity}, 'Lỗi cập nhật số lượng');

  Future<void> updateQuantity(int itemId, int quantity) async {
    try {
      await setQuantityRaw(itemId, quantity);
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Lỗi cập nhật số lượng');
    }
  }

  Future<void> removeItem(int itemId) async {
    try {
      await _mutate('DELETE', '/api/cart/items/$itemId', null, 'Lỗi xóa sản phẩm');
      Toast.success('Đã xóa sản phẩm khỏi giỏ');
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Lỗi xóa sản phẩm');
    }
  }
}
