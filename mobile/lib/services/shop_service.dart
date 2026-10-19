import '../core/api.dart';
import '../models/voucher.dart';
import 'product_service.dart';

/// Customer vouchers & marketing email consent (web customerMarketingService.ts) plus the public
/// marketing endpoints the storefront reads (banners, placements, posts, voucher validation).
class CustomerMarketingService {
  static final _api = Api.instance;

  /// Usable vouchers first, biggest discount first, for the given order subtotal.
  static Future<List<VoucherOption>> vouchersForMe(num subtotal) async {
    try {
      final d = await _api.get('/api/public/vouchers/for-me', query: {'subtotal': subtotal < 0 ? 0 : subtotal.round()});
      return asList(d).whereType<Map<String, dynamic>>().map(VoucherOption.fromJson).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> subscribeNewsletter(String email) => _api.post('/api/public/newsletter', {'email': email});

  static Future<Map<String, dynamic>> getConsent() async =>
      Map<String, dynamic>.from(await _api.get('/api/account/marketing-consent') as Map);

  static Future<Map<String, dynamic>> setConsent(bool subscribed) async =>
      Map<String, dynamic>.from(await _api.put('/api/account/marketing-consent', {'subscribed': subscribed}) as Map);

  /// POST /api/marketing/vouchers/validate -> {discountAmount, finalTotal, name, freeShipping}
  static Future<Map<String, dynamic>> validateVoucher(String code, num subtotal) async {
    final res = await _api.send('POST', '/api/marketing/vouchers/validate', body: {'code': code, 'subtotal': subtotal});
    if (!res.success) throw ApiException(res.errorMessage('Mã giảm giá không hợp lệ'));
    return Map<String, dynamic>.from(res.data as Map);
  }

  static Future<List<Map<String, dynamic>>> heroBanners() async {
    try {
      final res = await _api.send('GET', '/api/marketing/banners/HOME_HERO');
      return res.ok ? asList(res.data).whereType<Map<String, dynamic>>().toList() : [];
    } catch (_) {
      return [];
    }
  }

  static Future<List<Map<String, dynamic>>> placements(String key) async {
    try {
      final res = await _api.send('GET', '/api/marketing/public/placements', query: {'key': key});
      return res.ok ? asList(res.data).whereType<Map<String, dynamic>>().toList() : [];
    } catch (_) {
      return [];
    }
  }

  static Future<List<Map<String, dynamic>>> posts() async {
    try {
      final res = await _api.send('GET', '/api/marketing/posts');
      return res.ok ? asList(res.data).whereType<Map<String, dynamic>>().toList() : [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>?> post(String slug) async {
    try {
      final res = await _api.send('GET', '/api/marketing/posts/${Uri.encodeComponent(slug)}');
      return res.ok && res.data is Map ? Map<String, dynamic>.from(res.data as Map) : null;
    } catch (_) {
      return null;
    }
  }

  static void trackPostView(String slug) {
    _api.send('POST', '/api/marketing/posts/${Uri.encodeComponent(slug)}/view').catchError((_) => ApiResponse(0, null));
  }
}

class ReviewSummary {
  final List<Map<String, dynamic>> items;
  final num averageRating;
  final int totalReviews;
  final Map<int, int> ratingSummary;
  final int totalPages;
  ReviewSummary(this.items, this.averageRating, this.totalReviews, this.ratingSummary, this.totalPages);
}

/// Port of web reviewService.ts.
class ReviewService {
  static final _api = Api.instance;

  static Future<ReviewSummary> bySlug(String slug, {int page = 0, int pageSize = 5}) async {
    final res = await _api.send('GET', '/api/products/${Uri.encodeComponent(slug)}/reviews',
        query: {'page': page, 'pageSize': pageSize});
    if (!res.ok || res.data is! Map) throw ApiException('Lỗi khi tải đánh giá');
    final d = res.data as Map;
    final summary = <int, int>{};
    if (d['ratingSummary'] is Map) {
      (d['ratingSummary'] as Map).forEach((k, v) => summary[int.tryParse('$k') ?? 0] = toInt(v));
    }
    return ReviewSummary(asList(d['items']).whereType<Map<String, dynamic>>().toList(), toNum(d['averageRating']),
        toInt(d['totalReviews']), summary, toInt(d['totalPages']));
  }

  static Future<Map<String, dynamic>> eligibility(String slug, {String? orderCode, String? email}) async {
    try {
      final res = await _api.send('GET', '/api/products/${Uri.encodeComponent(slug)}/reviews/eligibility',
          query: orderCode != null && email != null ? {'orderCode': orderCode, 'email': email} : null);
      if (!res.ok || res.data is! Map) return {'canReview': false, 'reason': 'NOT_LOGGED_IN'};
      return Map<String, dynamic>.from(res.data as Map);
    } catch (_) {
      return {'canReview': false, 'reason': 'NOT_LOGGED_IN'};
    }
  }

  static Future<Map<String, dynamic>> create(String slug, Map<String, dynamic> data) async {
    final res = await _api.send('POST', '/api/products/${Uri.encodeComponent(slug)}/reviews', body: data);
    if (!res.ok) {
      if (res.status == 401) throw ApiException('Vui lòng đăng nhập để đánh giá');
      if (res.status == 403) {
        throw ApiException(res.body is Map && res.body['message'] == 'NOT_PURCHASED'
            ? 'Bạn phải mua sản phẩm mới có quyền đánh giá'
            : 'Đơn hàng chưa được giao thành công');
      }
      if (res.status == 409) throw ApiException('Bạn đã đánh giá sản phẩm này rồi');
      throw ApiException(res.errorMessage('Lỗi khi gửi đánh giá'));
    }
    return res.data is Map ? Map<String, dynamic>.from(res.data as Map) : {};
  }
}

/// Orders, payment and account endpoints the customer pages call.
class OrderService {
  static final _api = Api.instance;

  static Future<List<Map<String, dynamic>>> myOrders() async {
    final list = asList(await _api.get('/api/orders/me')).whereType<Map<String, dynamic>>().toList();
    list.sort((a, b) => '${b['createdAt']}'.compareTo('${a['createdAt']}'));
    return list;
  }

  static Future<Map<String, dynamic>?> byCode(String code) async {
    final res = await _api.send('GET', '/api/orders/${Uri.encodeComponent(code)}', guest: true);
    if (res.success && res.data is Map) return Map<String, dynamic>.from(res.data as Map);
    return null;
  }

  static Future<Map<String, dynamic>> checkout(Map<String, dynamic> payload) async {
    final res = await _api.send('POST', '/api/orders/checkout',
        body: payload, guest: true, extraHeaders: BehaviorTracking.sessionHeader());
    if (!res.success) throw ApiException(res.errorMessage('Lỗi khi thanh toán'));
    return Map<String, dynamic>.from(res.data as Map);
  }

  static Future<String?> payosLink(String code) async {
    try {
      final res = await _api.send('POST', '/api/orders/${Uri.encodeComponent(code)}/payos-link', guest: true);
      if (res.ok && res.data is Map) return (res.data as Map)['checkoutUrl'] as String?;
      if (res.ok && res.body is Map && res.body['data'] is Map) return res.body['data']['checkoutUrl'] as String?;
    } catch (_) {}
    return null;
  }

  /// Asks PayOS for the payment state; returns (order, payosEnabled).
  static Future<(Map<String, dynamic>?, bool)> payosSync(String code) async {
    try {
      final res = await _api.send('POST', '/api/orders/${Uri.encodeComponent(code)}/payos-sync', guest: true);
      if (res.success && res.body is Map && res.body['data'] is Map) {
        return (Map<String, dynamic>.from(res.body['data'] as Map), res.body['payosEnabled'] == true);
      }
    } catch (_) {}
    return (null, false);
  }

  static Future<Map<String, dynamic>?> bankConfig() async {
    try {
      final res = await _api.send('GET', '/api/payment-methods/bank-transfer');
      return res.success && res.data is Map ? Map<String, dynamic>.from(res.data as Map) : null;
    } catch (_) {
      return null;
    }
  }

  static Future<bool> cancel(String code) async {
    try {
      await _api.post('/api/orders/${Uri.encodeComponent(code)}/cancel', {'reason': 'Khách hàng hủy đơn hàng'});
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> requestReturn(String code, String reason) async =>
      Map<String, dynamic>.from(await _api.post('/api/orders/${Uri.encodeComponent(code)}/return-request', {'reason': reason}) as Map);

  static Future<Map<String, dynamic>> updatePayment(String code, Map<String, dynamic> body) async =>
      Map<String, dynamic>.from(await _api.put('/api/orders/${Uri.encodeComponent(code)}/payment', body) as Map);
}
