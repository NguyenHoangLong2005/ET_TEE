import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import 'marketing_shell.dart';

const _staffApi = '/api/staff/marketing';

/// Port of web staff/dashboard/marketing/page.tsx.
class MarketingDashboardScreen extends StatefulWidget {
  const MarketingDashboardScreen({super.key});

  @override
  State<MarketingDashboardScreen> createState() => _MarketingDashboardScreenState();
}

class _MarketingDashboardScreenState extends State<MarketingDashboardScreen> {
  int _days = 30;
  bool _loading = true, _failed = false;
  num _impressions = 0, _clicks = 0, _ctr = 0, _revenue = 0;
  int _activeBanners = 0, _activeVouchers = 0, _expiringVouchers = 0, _publishedPosts = 0, _draftPosts = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });
    final since = isoLocal(DateTime.now().subtract(Duration(days: _days)));
    Future<ApiResponse> get(String p) => Api.instance.send('GET', '$_staffApi/$p');
    final results = await Future.wait([
      get('analytics/overview?since=$since').catchError((_) => ApiResponse(0, null)),
      get('banners').catchError((_) => ApiResponse(0, null)),
      get('vouchers').catchError((_) => ApiResponse(0, null)),
      get('posts').catchError((_) => ApiResponse(0, null)),
    ]);
    if (!mounted) return;
    final [ov, banners, vouchers, posts] = results;
    setState(() {
      if (results.every((r) => !r.ok)) _failed = true;
      if (ov.ok && ov.data is Map) {
        final o = ov.data as Map;
        _impressions = toNum(o['impressions']);
        _clicks = toNum(o['clicks']);
        _ctr = toNum(o['ctr']);
        _revenue = toNum(o['revenue']);
      }
      if (banners.ok) {
        _activeBanners = asList(banners.body).where((b) => b is Map && (b['isActive'] == true || b['status'] == 'ACTIVE')).length;
      }
      if (vouchers.ok) {
        final active = asList(vouchers.body).whereType<Map>().where((v) => v['status'] == 'ACTIVE' || v['isActive'] == true).toList();
        _activeVouchers = active.length;
        _expiringVouchers = active.where((v) {
          final end = parseDate(v['endDate'] ?? v['expiresAt'] ?? v['validTo']);
          if (end == null) return false;
          final left = end.difference(DateTime.now()).inHours / 24;
          return left >= 0 && left <= 7;
        }).length;
      }
      if (posts.ok) {
        final list = asList(posts.body).whereType<Map>();
        _publishedPosts = list.where((p) => p['status'] == 'PUBLISHED').length;
        _draftPosts = list.where((p) => p['status'] == 'DRAFT').length;
      }
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final todo = [
      if (_activeBanners == 0 && !_loading) ('Chưa có banner nào đang hiển thị', '/staff/marketing/homepage', 'Chỉnh sửa trang chủ'),
      if (_expiringVouchers > 0) ('$_expiringVouchers voucher hết hạn trong 7 ngày tới', '/staff/marketing/vouchers', 'Xem voucher'),
      if (_draftPosts > 0) ('$_draftPosts bài viết còn ở bản nháp', '/staff/marketing/posts', 'Xem bài viết'),
    ];
    final metrics = [
      ('Lượt hiển thị', formatNumber(_impressions)),
      ('Lượt click', formatNumber(_clicks)),
      ('CTR', '${_ctr.toStringAsFixed(1)}%'),
      ('Doanh thu từ khuyến mãi', fmtMoneyShort(_revenue)),
    ];
    final sections = [
      ('/staff/marketing/homepage', 'Trang chủ', '$_activeBanners banner đang hiển thị'),
      ('/staff/marketing/vouchers', 'Voucher', '$_activeVouchers đang hiệu lực'),
      ('/staff/marketing/posts', 'Bài viết', '$_publishedPosts đã đăng · $_draftPosts nháp'),
      ('/staff/marketing/analytics', 'Hiệu quả', 'Báo cáo chi tiết'),
    ];
    return MarketingShell(
      path: '/staff/marketing',
      title: 'Marketing',
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: PeriodPicker<int>(
                options: const [(7, '7 ngày'), (30, '30 ngày'), (90, '90 ngày')],
                value: _days,
                onChanged: (d) {
                  setState(() => _days = d);
                  _load();
                },
              ),
            ),
            const SizedBox(height: 16),
            if (_failed) ...[_FailedBanner(onRetry: _load), const SizedBox(height: 16)],
            _KpiGrid(tiles: [for (final (l, v) in metrics) KpiTile(label: l, value: _loading ? '…' : v)]),
            const SizedBox(height: 16),
            if (todo.isNotEmpty) ...[
              StaffPanel(
                title: 'Cần xử lý',
                child: Column(children: [
                  for (final (text, href, cta) in todo)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
                      child: Row(children: [
                        Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.red600, shape: BoxShape.circle)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
                        GestureDetector(
                          onTap: () => context.go(href),
                          child: Text(cta,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.red600, decoration: TextDecoration.underline, decorationColor: AppColors.red600)),
                        ),
                      ]),
                    ),
                ]),
              ),
              const SizedBox(height: 16),
            ],
            StaffPanel(
              title: 'Quản lý',
              child: Column(children: [
                for (final (href, label, stat) in sections)
                  InkWell(
                    onTap: () => context.go(href),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
                      child: Row(children: [
                        Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14))),
                        Text('${_loading ? '…' : stat} →', style: const TextStyle(fontSize: 13, color: AppColors.slate500)),
                      ]),
                    ),
                  ),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

class _FailedBanner extends StatelessWidget {
  final VoidCallback onRetry;
  const _FailedBanner({required this.onRetry});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(color: AppColors.red50, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFFECACA))),
        child: Row(children: [
          const Expanded(child: Text('Không tải được dữ liệu.', style: TextStyle(color: AppColors.red700, fontSize: 13))),
          GestureDetector(
            onTap: onRetry,
            child: const Text('Thử lại', style: TextStyle(color: AppColors.red700, fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
          ),
        ]),
      );
}

class _KpiGrid extends StatelessWidget {
  final List<Widget> tiles;
  const _KpiGrid({required this.tiles});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200), color: AppColors.slate200),
        clipBehavior: Clip.antiAlias,
        child: LayoutBuilder(builder: (context, c) {
          final cols = c.maxWidth > 700 ? tiles.length : 2;
          final w = (c.maxWidth - (cols - 1)) / cols;
          return Wrap(spacing: 1, runSpacing: 1, children: [for (final t in tiles) SizedBox(width: w, child: t)]);
        }),
      );
}

// ─── Analytics ──────────────────────────────────────────────────────────────

const _positionLabel = {
  'HOME_HERO': 'Đầu trang chủ',
  'HERO': 'Đầu trang chủ',
  'HOME_MID': 'Giữa trang chủ',
  'CATEGORY_TOP': 'Đầu danh mục',
  'PRODUCT_DETAIL': 'Chi tiết sản phẩm',
  'MIDDLE': 'Giữa trang',
  'POPUP': 'Popup',
};

/// Port of web staff/dashboard/marketing/analytics/page.tsx.
class MarketingAnalyticsScreen extends StatefulWidget {
  const MarketingAnalyticsScreen({super.key});

  @override
  State<MarketingAnalyticsScreen> createState() => _MarketingAnalyticsScreenState();
}

class _MarketingAnalyticsScreenState extends State<MarketingAnalyticsScreen> {
  String _range = '30d';
  bool _loading = true, _failed = false;
  Map<String, dynamic> _d = {};

  static const _ranges = [('today', 'Hôm nay', 0), ('7d', '7 ngày', 7), ('30d', '30 ngày', 30), ('90d', '90 ngày', 90), ('all', 'Tất cả', -1)];

  @override
  void initState() {
    super.initState();
    _load();
  }

  String? _since() {
    final days = _ranges.firstWhere((r) => r.$1 == _range).$3;
    if (days < 0) return null;
    var d = DateTime.now().subtract(Duration(days: days));
    if (days == 0) d = DateTime(d.year, d.month, d.day);
    return isoLocal(d);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final since = _since();
      final res = await Api.instance.send('GET', '$_staffApi/analytics/overview', query: since == null ? null : {'since': since});
      if (!res.ok) throw ApiException('HTTP ${res.status}');
      _d = Map<String, dynamic>.from((res.data ?? {}) as Map);
    } catch (e) {
      _failed = true;
      Toast.error('Không tải được dữ liệu hiệu quả ($e)');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final banners = asList(_d['banners']).whereType<Map>().toList();
    final vouchers = asList(_d['vouchers']).whereType<Map>().toList();
    final maxImp = banners.fold<num>(1, (m, b) => toNum(b['impressions']) > m ? toNum(b['impressions']) : m);
    final noTracking = !_loading && !_failed && toNum(_d['impressions']) == 0 && toNum(_d['clicks']) == 0;
    final kpis = [
      KpiTile(label: 'Lượt hiển thị', value: _loading ? '…' : formatNumber(toNum(_d['impressions']))),
      KpiTile(label: 'Lượt click', value: _loading ? '…' : formatNumber(toNum(_d['clicks'])), sub: _loading ? '' : 'CTR ${toNum(_d['ctr']).toStringAsFixed(1)}%'),
      // Conversions are voucher orders, not banner clicks: no "per click" rate.
      KpiTile(label: 'Đơn từ khuyến mãi', value: _loading ? '…' : formatNumber(toNum(_d['conversions'])), sub: _loading ? '' : 'Đơn có dùng voucher'),
      KpiTile(label: 'Doanh thu', value: _loading ? '…' : fmtMoneyShort(toNum(_d['revenue']))),
      KpiTile(label: 'Voucher đã dùng', value: _loading ? '…' : formatNumber(toNum(_d['vouchersUsed']))),
    ];
    const th = TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.slate500);
    return MarketingShell(
      path: '/staff/marketing/analytics',
      title: 'Hiệu quả marketing',
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: PeriodPicker<String>(
                options: [for (final r in _ranges) (r.$1, r.$2)],
                value: _range,
                onChanged: (r) {
                  setState(() => _range = r);
                  _load();
                },
              ),
            ),
            const SizedBox(height: 16),
            if (_failed) ...[_FailedBanner(onRetry: _load), const SizedBox(height: 16)],
            _KpiGrid(tiles: kpis),
            if (noTracking) ...[
              const SizedBox(height: 16),
              StaffPanel(
                padding: const EdgeInsets.all(14),
                child: const Text('Chưa có lượt xem hoặc click nào được ghi nhận trong khoảng thời gian này.', style: TextStyle(fontSize: 13, color: AppColors.slate500)),
              ),
            ],
            const SizedBox(height: 16),
            StaffPanel(
              title: 'Banner',
              child: banners.isEmpty
                  ? const Padding(padding: EdgeInsets.all(24), child: Text('Chưa có dữ liệu banner.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate500, fontSize: 13)))
                  : Column(children: [
                      for (final b in banners)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Expanded(child: Text('${b['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14))),
                              Text(_positionLabel[b['position']] ?? '${b['position'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                            ]),
                            const SizedBox(height: 8),
                            Row(children: [
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: toNum(b['impressions']) / maxImp,
                                    minHeight: 6,
                                    color: AppColors.red600,
                                    backgroundColor: AppColors.slate100,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text('${formatNumber(toNum(b['impressions']))} hiển thị', style: const TextStyle(fontSize: 12)),
                            ]),
                            const SizedBox(height: 4),
                            Text('${formatNumber(toNum(b['clicks']))} click · CTR ${toNum(b['ctr']).toStringAsFixed(1)}%',
                                style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                          ]),
                        ),
                    ]),
            ),
            const SizedBox(height: 16),
            StaffPanel(
              title: 'Voucher',
              child: vouchers.isEmpty
                  ? const Padding(padding: EdgeInsets.all(24), child: Text('Chưa có voucher nào.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate500, fontSize: 13)))
                  : SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: DataTable(
                        headingRowHeight: 38,
                        dataRowMinHeight: 42,
                        dataRowMaxHeight: 52,
                        columnSpacing: 22,
                        columns: const [
                          DataColumn(label: Text('Mã', style: th)),
                          DataColumn(label: Text('Lượt dùng', style: th), numeric: true),
                          DataColumn(label: Text('Tổng giảm', style: th), numeric: true),
                          DataColumn(label: Text('Giá trị đơn TB', style: th), numeric: true),
                        ],
                        rows: [
                          for (final v in vouchers)
                            DataRow(cells: [
                              DataCell(Text.rich(TextSpan(children: [
                                TextSpan(text: '${v['code']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w500)),
                                if (v['name'] != null) TextSpan(text: '  ${v['name']}', style: const TextStyle(color: AppColors.slate500)),
                              ]))),
                              DataCell(Text(formatNumber(toNum(v['used'])))),
                              DataCell(Text(toNum(v['used']) > 0 ? fmtMoneyShort(toNum(v['totalDiscount'])) : '—')),
                              DataCell(Text(toNum(v['used']) > 0 ? fmtMoneyShort(toNum(v['avgOrder'])) : '—')),
                            ]),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
