import 'package:flutter/foundation.dart';

import '../core/api.dart';
import '../models/product.dart';
import '../services/product_service.dart';

/// Port of web WishlistContext: never throws, degrades to an empty list when the backend is down.
class WishlistProvider extends ChangeNotifier {
  final _api = Api.instance;
  int _count = 0;
  List<Product> _items = [];

  int get count => _count;
  List<Product> get items => _items;
  bool contains(int productId) => _items.any((p) => p.id == productId);

  Future<void> fetchAll() async {
    await Future.wait([fetchCount(), fetch()]);
  }

  Future<void> fetchCount() async {
    try {
      final res = await _api.send('GET', '/api/wishlist/count', guest: true);
      _count = res.success && res.data is Map ? toInt((res.data as Map)['count']) : 0;
    } catch (_) {
      _count = 0;
    }
    notifyListeners();
  }

  Future<void> fetch() async {
    try {
      final res = await _api.send('GET', '/api/wishlist', guest: true);
      _items = res.success ? productsFrom(res.data) : [];
    } catch (_) {
      _items = [];
    }
    notifyListeners();
  }

  void clearLocal() {
    _items = [];
    _count = 0;
    notifyListeners();
  }

  Future<(bool, String?)> add(int productId) async {
    try {
      final res = await _api.send('POST', '/api/wishlist/items/$productId', guest: true);
      if (res.ok) {
        await fetchAll();
        return (true, null);
      }
      return (false, res.errorMessage('Không thể thêm yêu thích lúc này'));
    } catch (_) {
      return (false, 'Không kết nối được với máy chủ');
    }
  }

  Future<(bool, String?)> remove(int productId) async {
    try {
      final res = await _api.send('DELETE', '/api/wishlist/items/$productId', guest: true);
      if (res.ok) {
        _items = _items.where((p) => p.id != productId).toList();
        _count = (_count - 1).clamp(0, 1 << 30);
        notifyListeners();
        return (true, null);
      }
      return (false, res.errorMessage('Không thể xóa yêu thích lúc này'));
    } catch (_) {
      return (false, 'Không kết nối được với máy chủ');
    }
  }
}
