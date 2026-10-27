import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/storage.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../services/shop_service.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';

/// Port of web ProductReviews.tsx: summary, eligibility-gated form (account or guest order), list.
class ProductReviewsSection extends StatefulWidget {
  final String slug;
  const ProductReviewsSection({super.key, required this.slug});

  @override
  State<ProductReviewsSection> createState() => _ProductReviewsSectionState();
}

class _ProductReviewsSectionState extends State<ProductReviewsSection> {
  List<Map<String, dynamic>> _reviews = [];
  Map<int, int> _summary = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
  num _avg = 0;
  int _total = 0, _page = 0, _totalPages = 0;
  bool _loadingMore = false;
  Map<String, dynamic>? _myReview;
  Map<String, dynamic>? _elig;
  bool _submitting = false;
  String _error = '';
  int _rating = 5;
  final _content = TextEditingController();
  bool _showGuest = false;
  final _guestCode = TextEditingController();
  final _guestEmail = TextEditingController();
  bool _guestChecking = false;
  String? _lastUserId;

  @override
  void initState() {
    super.initState();
    _fetch();
    _checkEligibility();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final uid = context.watch<AuthProvider>().user?.id;
    if (_lastUserId != null && uid != _lastUserId) _checkEligibility();
    _lastUserId = uid ?? '';
  }

  @override
  void dispose() {
    _content.dispose();
    _guestCode.dispose();
    _guestEmail.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    try {
      final d = await ReviewService.bySlug(widget.slug);
      if (!mounted) return;
      setState(() {
        _reviews = d.items;
        _avg = d.averageRating;
        _total = d.totalReviews;
        _summary = d.ratingSummary;
        _page = 0;
        _totalPages = d.totalPages;
      });
    } catch (_) {}
  }

  Future<void> _loadMore() async {
    setState(() => _loadingMore = true);
    try {
      final next = _page + 1;
      final d = await ReviewService.bySlug(widget.slug, page: next);
      final seen = _reviews.map((r) => r['id']).toSet();
      setState(() {
        _reviews = [..._reviews, ...d.items.where((r) => !seen.contains(r['id']))];
        _page = next;
        _totalPages = d.totalPages;
      });
    } catch (_) {
      Toast.error('Không thể tải thêm đánh giá');
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<Map<String, dynamic>> _checkEligibility({String? orderCode, String? email}) async {
    final e = AppStorage.instance.token != null || (orderCode != null && email != null)
        ? await ReviewService.eligibility(widget.slug, orderCode: orderCode, email: email)
        : {'canReview': false, 'reason': 'NOT_LOGGED_IN'};
    if (mounted) setState(() => _elig = e);
    return e;
  }

  Future<void> _guestCheck() async {
    if (_guestCode.text.trim().isEmpty || _guestEmail.text.trim().isEmpty) {
      Toast.error('Vui lòng nhập mã đơn hàng và email/số điện thoại');
      return;
    }
    setState(() => _guestChecking = true);
    final r = await _checkEligibility(orderCode: _guestCode.text.trim(), email: _guestEmail.text.trim());
    if (mounted) setState(() => _guestChecking = false);
    if (r['canReview'] != true) {
      Toast.error(switch (r['reason']) {
        'NOT_PURCHASED' => 'Không tìm thấy đơn hàng hợp lệ',
        'NOT_DELIVERED' => 'Đơn hàng cần được giao thành công trước khi đánh giá',
        'ALREADY_REVIEWED' => 'Sản phẩm này đã được đánh giá từ đơn hàng này',
        _ => 'Không đủ điều kiện đánh giá',
      });
    }
  }

  Future<void> _submit() async {
    final e = _elig;
    if (e == null || e['canReview'] != true || e['orderItemId'] == null) return;
    if (_content.text.trim().isEmpty) {
      setState(() => _error = 'Vui lòng nhập nhận xét');
      return;
    }
    setState(() {
      _submitting = true;
      _error = '';
    });
    try {
      final loggedIn = AppStorage.instance.token != null;
      if (!loggedIn && (_guestCode.text.isEmpty || _guestEmail.text.isEmpty)) throw ApiException('Không tìm thấy thông tin xác thực');
      final created = await ReviewService.create(widget.slug, {
        'orderItemId': e['orderItemId'],
        'rating': _rating,
        'content': _content.text,
        if (!loggedIn) 'orderCode': _guestCode.text.trim(),
        if (!loggedIn) 'customerEmailOrPhone': _guestEmail.text.trim(),
      });
      Toast.success('Gửi đánh giá thành công!');
      setState(() {
        _myReview = created;
        _content.clear();
        _rating = 5;
      });
      await _fetch();
      await _checkEligibility();
    } catch (err) {
      setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayed = _myReview != null ? [_myReview!, ..._reviews.where((r) => r['id'] != _myReview!['id'])] : _reviews;
    return Padding(
      padding: const EdgeInsets.only(top: 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.only(bottom: 14),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate200))),
            child: Text('ĐÁNH GIÁ KHÁCH HÀNG', style: headline(20, weight: FontWeight.w700)),
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate100)),
            child: Column(children: [
              Text(_avg.toStringAsFixed(1), style: headline(44)),
              _stars(_avg, 20),
              const SizedBox(height: 6),
              Text('$_total đánh giá', style: const TextStyle(fontSize: 13, color: AppColors.slate500)),
              const SizedBox(height: 16),
              for (final star in [5, 4, 3, 2, 1])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(children: [
                    SizedBox(width: 30, child: Row(children: [Text('$star', style: const TextStyle(fontSize: 13)), const Icon(Icons.star, size: 12, color: AppColors.slate400)])),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: _total > 0 ? (_summary[star] ?? 0) / _total : 0,
                          minHeight: 8,
                          backgroundColor: AppColors.slate200,
                          color: Colors.black,
                        ),
                      ),
                    ),
                    SizedBox(width: 32, child: Text('${_summary[star] ?? 0}', textAlign: TextAlign.right, style: const TextStyle(fontSize: 13, color: AppColors.slate500))),
                  ]),
                ),
            ]),
          ),
          const SizedBox(height: 16),
          _formArea(),
          const SizedBox(height: 28),
          Text('${_total > displayed.length ? _total : displayed.length} BÌNH LUẬN', style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          if (displayed.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 28),
              decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate100)),
              child: const Text('Chưa có đánh giá nào cho sản phẩm này.',
                  textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate500, fontStyle: FontStyle.italic)),
            )
          else ...[
            for (final r in displayed) _reviewTile(r),
            if (_page + 1 < _totalPages)
              Center(
                child: PillButton(_loadingMore ? 'Đang tải...' : 'Xem thêm đánh giá',
                    style: PillStyle.outline, height: 42, onPressed: _loadingMore ? null : _loadMore),
              ),
          ],
        ],
      ),
    );
  }

  Widget _stars(num value, double size) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [for (var s = 1; s <= 5; s++) Icon(Icons.star, size: size, color: s <= value ? const Color(0xFFFACC15) : AppColors.slate200)],
      );

  Widget _reviewTile(Map<String, dynamic> r) => Container(
        padding: const EdgeInsets.only(bottom: 18),
        margin: const EdgeInsets.only(bottom: 18),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, children: [
                    Text('${r['customerNameSnapshot'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    if (_myReview != null && _myReview!['id'] == r['id'])
                      const StatusPill('Đánh giá của bạn', bg: AppColors.primary50, fg: AppColors.primary, fontSize: 10),
                  ]),
                  if (r['verifiedPurchase'] == true)
                    const Padding(
                      padding: EdgeInsets.only(top: 3),
                      child: Row(children: [
                        Icon(Icons.check_circle_outline, size: 12, color: Color(0xFF16A34A)),
                        SizedBox(width: 4),
                        Text('Đã mua hàng', style: TextStyle(fontSize: 12, color: Color(0xFF16A34A))),
                      ]),
                    ),
                ]),
              ),
              Text(formatDate(r['createdAt']), style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
            ]),
            const SizedBox(height: 8),
            _stars(toNum(r['rating']), 16),
            const SizedBox(height: 8),
            Text('${r['content'] ?? ''}', style: const TextStyle(fontSize: 14, color: AppColors.slate700, height: 1.5)),
            if (r['purchasedSize'] != null && r['purchasedColor'] != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(children: [
                  Text('Phân loại: Size ${r['purchasedSize']}, ', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                  ColorDot('${r['purchasedColor']}', size: 10),
                ]),
              ),
          ],
        ),
      );

  Widget _formArea() {
    final e = _elig;
    if (e != null && e['canReview'] == true) {
      return AppCard(
        radius: 12,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('VIẾT ĐÁNH GIÁ CỦA BẠN', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          if (_error.isNotEmpty) ...[NoticeBox(_error), const SizedBox(height: 12)],
          const Text('Đánh giá sao', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.slate700)),
          const SizedBox(height: 6),
          Row(children: [
            for (var s = 1; s <= 5; s++)
              GestureDetector(
                onTap: () => setState(() => _rating = s),
                child: Icon(Icons.star, size: 34, color: s <= _rating ? const Color(0xFFFACC15) : AppColors.slate200),
              ),
          ]),
          const SizedBox(height: 14),
          const Text('Nhận xét chi tiết', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.slate700)),
          const SizedBox(height: 6),
          TextField(controller: _content, maxLines: 4, decoration: const InputDecoration(hintText: 'Chia sẻ cảm nhận của bạn về sản phẩm này...')),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate100)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Đơn hàng hợp lệ', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.slate700)),
                  const SizedBox(height: 4),
                  Row(children: [
                    Text('Size: ${e['purchasedSize'] ?? ''} | Màu: ', style: const TextStyle(fontSize: 13, color: AppColors.slate500)),
                    ColorDot(e['purchasedColor'] as String?),
                  ]),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          PillButton(_submitting ? 'Đang gửi...' : 'Gửi đánh giá',
              style: PillStyle.dark, radius: BorderRadius.circular(8), expand: true, onPressed: _submitting ? null : _submit),
        ]),
      );
    }
    final reason = e?['reason'];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate100)),
      child: Column(children: [
        if (reason == 'NOT_LOGGED_IN') ...[
          const Text('Vui lòng đăng nhập để đánh giá sản phẩm này.', textAlign: TextAlign.center, style: TextStyle(fontSize: 15, color: AppColors.slate600)),
          const SizedBox(height: 14),
          PillButton('Đăng nhập',
              style: PillStyle.dark,
              radius: BorderRadius.circular(6),
              height: 40,
              onPressed: () => context.push('/auth/login?redirect=${Uri.encodeComponent('/products/${widget.slug}')}')),
          const Divider(height: 36),
          if (!_showGuest)
            GestureDetector(
              onTap: () => setState(() => _showGuest = true),
              child: const Text('Bạn đã mua hàng với tư cách khách vãng lai? Đánh giá bằng mã đơn hàng',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.slate700, decoration: TextDecoration.underline)),
            )
          else
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Text('XÁC MINH ĐƠN HÀNG KHÁCH VÃNG LAI', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              TextField(controller: _guestCode, decoration: const InputDecoration(labelText: 'Mã đơn hàng', hintText: 'VD: ORD-ABC123XYZ')),
              const SizedBox(height: 10),
              TextField(controller: _guestEmail, decoration: const InputDecoration(labelText: 'Email / Số điện thoại', hintText: 'Đã dùng khi đặt hàng')),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: PillButton('Hủy', style: PillStyle.light, height: 40, radius: BorderRadius.circular(6), onPressed: () => setState(() => _showGuest = false))),
                const SizedBox(width: 8),
                Expanded(
                  child: PillButton(_guestChecking ? 'Đang kiểm tra...' : 'Xác minh',
                      style: PillStyle.dark, height: 40, radius: BorderRadius.circular(6), onPressed: _guestChecking ? null : _guestCheck),
                ),
              ]),
            ]),
        ],
        if (reason == 'NOT_PURCHASED')
          const Text('Chỉ những khách hàng đã mua sản phẩm này mới có thể viết đánh giá.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate600)),
        if (reason == 'NOT_DELIVERED')
          const Text('Bạn có thể đánh giá sản phẩm sau khi đơn hàng được giao thành công.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate600)),
        if (reason == 'ALREADY_REVIEWED')
          const Column(children: [
            Icon(Icons.check_circle_outline, size: 44, color: Color(0x8016A34A)),
            SizedBox(height: 10),
            Text('Bạn đã gửi đánh giá cho sản phẩm này rồi. Cảm ơn bạn!', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.w500)),
          ]),
        if (e == null) const LoadingView(),
      ]),
    );
  }
}
