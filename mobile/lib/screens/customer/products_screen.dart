import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/theme.dart';
import '../../services/product_service.dart';
import '../../widgets/common.dart';
import '../../widgets/product_card.dart';
import '../../widgets/store_scaffold.dart';

const _tgMap = {'men': 'Nam', 'women': 'Nữ', 'boys': 'Bé trai', 'girls': 'Bé gái', 'family': 'Gia đình', 'baby': 'Em bé'};
const _titleMap = {'women': 'Nữ', 'men': 'Nam', 'kids': 'Trẻ em', 'baby': 'Em bé', 'family': 'Gia đình', 'boys': 'Bé trai', 'girls': 'Bé gái'};
const _statusMap = {'sale': 'Đang giảm giá', 'new': 'Hàng mới', 'best': 'Bán chạy'};
const _womenOnlyTypes = {'skirt', 'dress'};

String productTypeLabel(String type) {
  const map = {
    'tshirt': 'Áo thun', 't-shirt': 'Áo thun', 'shirt': 'Áo sơ mi', 'polo': 'Áo polo', 'pants': 'Quần',
    'trousers': 'Quần', 'jeans': 'Quần jeans', 'shorts': 'Quần short', 'jacket': 'Áo khoác', 'coat': 'Áo khoác',
    'outerwear': 'Áo khoác', 'dress': 'Đầm', 'skirt': 'Chân váy', 'accessory': 'Phụ kiện', 'accessories': 'Phụ kiện',
    'homewear': 'Đồ mặc nhà', 'set': 'Set đồ', 'family-set': 'Set gia đình',
  };
  return map[type.toLowerCase()] ?? (type.isEmpty ? type : type[0].toUpperCase() + type.substring(1));
}

const _sortOptions = [
  ('default', 'Phù hợp nhất'),
  ('newest', 'Mới nhất'),
  ('price-asc', 'Giá: Thấp đến Cao'),
  ('price-desc', 'Giá: Cao đến Thấp'),
  ('discount-desc', 'Giảm giá nhiều nhất'),
  ('bestseller', 'Bán chạy nhất'),
];

const _priceRanges = [
  ('Dưới 200.000₫', null, 200000),
  ('200.000₫ - 500.000₫', 200000, 500000),
  ('500.000₫ - 1.000.000₫', 500000, 1000000),
  ('Trên 1.000.000₫', 1000000, null),
];

/// Port of web app/products/page.tsx (+ FilterSidebar, SortDropdown, Pagination).
/// The query string is the state, exactly like the web URL.
class ProductsScreen extends StatefulWidget {
  final Map<String, String> initialParams;
  const ProductsScreen({super.key, required this.initialParams});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  late Map<String, String> _params = Map.of(widget.initialParams);
  ProductPage? _page;
  ProductStats _stats = ProductStats();
  bool _loading = true;
  bool _failed = false;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    ProductService.stats().then((s) {
      if (mounted) setState(() => _stats = s);
    });
    _load();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  int get _pageNo => (int.tryParse(_params['page'] ?? '') ?? 1).clamp(1, 1 << 20);

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });
    final q = <String, dynamic>{..._params};
    q['page'] = _pageNo;
    q['pageSize'] = 24;
    try {
      final p = await ProductService.getProducts(q);
      if (!mounted) return;
      setState(() {
        _page = p;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _loading = false;
      });
    }
  }

  void _apply(Map<String, String> next) {
    next.remove('page');
    setState(() => _params = next);
    if (_scroll.hasClients) _scroll.jumpTo(0);
    _load();
  }

  void _goPage(int page) {
    final next = Map.of(_params)..['page'] = '$page';
    setState(() => _params = next);
    if (_scroll.hasClients) _scroll.jumpTo(0);
    _load();
  }

  String get _title {
    final search = _params['q'];
    final tg = _params['targetGroup'];
    final gender = _params['gender'];
    if (search != null && search.isNotEmpty) return 'Kết quả tìm kiếm cho "$search"';
    if (tg == 'kids' && gender == 'boy') return 'Bé trai';
    if (tg == 'kids' && gender == 'girl') return 'Bé gái';
    if (tg != null && _titleMap[tg] != null) return _titleMap[tg]!;
    return 'Tất cả sản phẩm';
  }

  List<(String, List<String>)> get _activeFilters {
    final p = _params;
    final out = <(String, List<String>)>[];
    if (p['targetGroup'] != null) {
      out.add(('Danh mục: ${p['targetGroup']!.split(',').map((t) => _tgMap[t.trim()] ?? t.trim()).join(', ')}', ['targetGroup']));
    }
    if (p['productType'] != null) {
      out.add(('Loại SP: ${p['productType']!.split(',').map((t) => productTypeLabel(t.trim())).join(', ')}', ['productType']));
    }
    if (p['category'] != null) out.add(('Nhóm: ${p['category'] == 'accessories' ? 'Phụ kiện' : p['category']}', ['category']));
    if (p['collection'] != null && p['collection'] != 'all') out.add(('Bộ sưu tập: ${p['collection']}', ['collection']));
    if (p['q'] != null) out.add(('Tìm kiếm: "${p['q']}"', ['q']));
    if (p['adultSize'] != null) out.add(('Size: ${p['adultSize']}', ['adultSize']));
    if (p['kidsSize'] != null) out.add(('Size trẻ em: ${p['kidsSize']}', ['kidsSize']));
    if (p['accessorySize'] != null) out.add(('Size phụ kiện: ${p['accessorySize']}', ['accessorySize']));
    if (p['status'] != null) {
      out.add(('Trạng thái: ${p['status']!.split(',').map((s) => _statusMap[s.trim()] ?? s.trim()).join(', ')}', ['status']));
    }
    final min = int.tryParse(p['minPrice'] ?? ''), max = int.tryParse(p['maxPrice'] ?? '');
    if (min != null || max != null) {
      final label = min != null && max != null
          ? '${formatNumber(min)}₫ - ${formatNumber(max)}₫'
          : min != null
              ? 'Từ ${formatNumber(min)}₫'
              : 'Dưới ${formatNumber(max!)}₫';
      out.add((label, ['minPrice', 'maxPrice']));
    }
    return out;
  }

  Future<void> _openFilters() async {
    final next = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _FilterSheet(params: _params, stats: _stats),
    );
    if (next != null) _apply(next);
  }

  @override
  Widget build(BuildContext context) {
    final page = _page;
    final active = _activeFilters;
    final sort = _params['sort'] ?? 'default';
    return StoreScaffold(
      background: const Color(0x80F8FAFC),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: ListView(
          controller: _scroll,
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 40),
          children: [
            Row(children: [
              GestureDetector(onTap: () => Navigator.of(context).popUntil((r) => r.isFirst), child: const Text('Trang chủ', style: TextStyle(fontSize: 12, color: AppColors.slate500))),
              const Text('  /  ', style: TextStyle(fontSize: 12, color: AppColors.slate400)),
              Flexible(child: Text(_title, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
            ]),
            const SizedBox(height: 18),
            Text(_title.toUpperCase(), style: headline(22)),
            const SizedBox(height: 4),
            if (page != null)
              Text(
                'Đang xem ${page.totalItems == 0 ? 0 : (page.currentPage - 1) * 24 + 1}–${(page.currentPage * 24).clamp(0, page.totalItems)} trên ${page.totalItems} sản phẩm',
                style: const TextStyle(fontSize: 13, color: AppColors.slate500),
              ),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.slate900,
                    side: const BorderSide(color: AppColors.slate200),
                    backgroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: _openFilters,
                  icon: const Icon(Icons.tune, size: 18),
                  label: Text('BỘ LỌC${active.isEmpty ? '' : ' (${active.length})'}', style: labelCaps(size: 12, color: AppColors.slate900)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: PopupMenuButton<String>(
                  initialValue: sort,
                  onSelected: (v) {
                    final next = Map.of(_params);
                    if (v == 'default') {
                      next.remove('sort');
                    } else {
                      next['sort'] = v;
                    }
                    _apply(next);
                  },
                  itemBuilder: (_) => [
                    for (final (id, label) in _sortOptions)
                      PopupMenuItem(value: id, child: Text(label, style: TextStyle(fontWeight: id == sort ? FontWeight.w700 : FontWeight.w400))),
                  ],
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
                    child: Row(children: [
                      const Icon(Icons.sort, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_sortOptions.firstWhere((o) => o.$1 == sort, orElse: () => _sortOptions.first).$2,
                            overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      ),
                      const Icon(Icons.expand_more, size: 18),
                    ]),
                  ),
                ),
              ),
            ]),
            if (active.isNotEmpty) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  const Text('Đang lọc theo:', style: TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w600)),
                  for (final (label, keys) in active)
                    GestureDetector(
                      onTap: () => _apply(Map.of(_params)..removeWhere((k, _) => keys.contains(k))),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                            color: AppColors.slate100, borderRadius: BorderRadius.circular(999), border: Border.all(color: AppColors.slate200)),
                        child: Text('$label  ×', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.slate800)),
                      ),
                    ),
                  GestureDetector(
                    onTap: () => _apply({}),
                    child: const Text('Xóa tất cả',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.slate500, decoration: TextDecoration.underline)),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 24),
            if (_loading && page == null)
              const LoadingView()
            else if (_failed)
              _errorState()
            else if (page!.items.isEmpty)
              EmptyPanel(
                icon: Icons.swap_horiz,
                title: _params['targetGroup'] == 'kids' && _params['gender'] == 'boy'
                    ? 'Chưa có sản phẩm bé trai phù hợp'
                    : _params['targetGroup'] == 'kids' && _params['gender'] == 'girl'
                        ? 'Chưa có sản phẩm bé gái phù hợp'
                        : 'Không tìm thấy sản phẩm phù hợp',
                message: 'Hãy thử thay đổi tiêu chí lọc hoặc xóa bộ lọc để xem thêm các sản phẩm khác.',
                action: PillButton('Xóa bộ lọc', onPressed: () => _apply({})),
              )
            else ...[
              AnimatedOpacity(opacity: _loading ? 0.5 : 1, duration: const Duration(milliseconds: 200), child: ProductGrid(products: page.items)),
              const SizedBox(height: 32),
              if (page.totalPages > 1) _pagination(page),
            ],
          ],
        ),
      ),
    );
  }

  Widget _errorState() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(children: [
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(color: AppColors.rose50, shape: BoxShape.circle),
            child: const Icon(Icons.warning_amber_rounded, size: 40, color: AppColors.primary),
          ),
          const SizedBox(height: 20),
          Text('KHÔNG THỂ TẢI SẢN PHẨM', style: headline(20)),
          const SizedBox(height: 8),
          const Text('Vui lòng kiểm tra kết nối máy chủ hoặc thử lại sau.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate500)),
          const SizedBox(height: 24),
          PillButton('Thử lại', onPressed: _load),
        ]),
      );

  Widget _pagination(ProductPage page) {
    final cur = page.currentPage, total = page.totalPages;
    final pages = <int>{1, total, cur - 1, cur, cur + 1}.where((p) => p >= 1 && p <= total).toList()..sort();
    final children = <Widget>[];
    int? prev;
    for (final p in pages) {
      if (prev != null && p - prev > 1) children.add(const Padding(padding: EdgeInsets.symmetric(horizontal: 4), child: Text('…')));
      children.add(GestureDetector(
        onTap: p == cur ? null : () => _goPage(p),
        child: Container(
          width: 38,
          height: 38,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: p == cur ? AppColors.slate900 : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: p == cur ? AppColors.slate900 : AppColors.slate200),
          ),
          child: Text('$p', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: p == cur ? Colors.white : AppColors.slate700)),
        ),
      ));
      prev = p;
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton(onPressed: cur > 1 ? () => _goPage(cur - 1) : null, icon: const Icon(Icons.chevron_left)),
        ...children,
        IconButton(onPressed: cur < total ? () => _goPage(cur + 1) : null, icon: const Icon(Icons.chevron_right)),
      ],
    );
  }
}

class _FilterSheet extends StatefulWidget {
  final Map<String, String> params;
  final ProductStats stats;
  const _FilterSheet({required this.params, required this.stats});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late Map<String, String> p = Map.of(widget.params);
  final _min = TextEditingController();
  final _max = TextEditingController();
  String _priceError = '';

  @override
  void initState() {
    super.initState();
    final presetIdx = _presetIndex();
    if ((p['minPrice'] != null || p['maxPrice'] != null) && presetIdx < 0) {
      _min.text = p['minPrice'] ?? '';
      _max.text = p['maxPrice'] ?? '';
    }
  }

  @override
  void dispose() {
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  Set<String> _set(String key) => (p[key] ?? '').split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toSet();

  void _toggle(String key, String value) {
    final cur = _set(key);
    final next = {...cur};
    if (!next.remove(value)) next.add(value);
    setState(() {
      // Smart UX: checking "Váy"/"Chân váy" while only "Nam" is selected would show 0 items.
      if (key == 'productType' && !cur.contains(value) && _womenOnlyTypes.contains(value.toLowerCase())) {
        final tg = _set('targetGroup');
        if (tg.contains('men') && !tg.contains('women')) p.remove('targetGroup');
      }
      if (next.isEmpty) {
        p.remove(key);
      } else {
        p[key] = next.join(',');
      }
    });
  }

  int _presetIndex() => _priceRanges.indexWhere((r) =>
      (r.$2 == null ? p['minPrice'] == null : '${r.$2}' == p['minPrice']) &&
      (r.$3 == null ? p['maxPrice'] == null : '${r.$3}' == p['maxPrice']));

  void _applyCustomPrice() {
    final min = _min.text.isEmpty ? null : int.tryParse(_min.text);
    final max = _max.text.isEmpty ? null : int.tryParse(_max.text);
    String err = '';
    if (_min.text.isNotEmpty && min == null) err = 'Giá từ không hợp lệ';
    if (_max.text.isNotEmpty && max == null) err = 'Giá đến không hợp lệ';
    if ((min ?? 0) < 0 || (max ?? 0) < 0) err = 'Giá không được âm';
    if (min != null && max != null && min > max) err = 'Giá Từ không được lớn hơn Đến';
    setState(() {
      _priceError = err;
      if (err.isNotEmpty) return;
      min == null ? p.remove('minPrice') : p['minPrice'] = '$min';
      max == null ? p.remove('maxPrice') : p['maxPrice'] = '$max';
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.stats;
    final tg = _set('targetGroup');
    final types = _set('productType');
    final status = _set('status');
    final preset = _presetIndex();
    final tgItems = [
      ('men', 'Nam'), ('women', 'Nữ'), ('boys', 'Bé trai'), ('girls', 'Bé gái'), ('family', 'Gia đình'), ('baby', 'Em bé'),
    ];
    const sizeSections = [
      ('letter', 'adultSize', 'Áo / Quần (chữ)'),
      ('number', 'adultSize', 'Size số'),
      ('kids', 'kidsSize', 'Trẻ em (chiều cao / tuổi)'),
      ('accessory', 'accessorySize', 'Tất / Giày'),
    ];
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.88,
      maxChildSize: 0.95,
      builder: (_, ctrl) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 8, 8),
            child: Row(children: [
              Text('BỘ LỌC', style: headline(18)),
              const Spacer(),
              TextButton.icon(
                onPressed: () => setState(() {
                  p.removeWhere((k, _) => !['sort', 'q'].contains(k));
                  _min.clear();
                  _max.clear();
                }),
                icon: const Icon(Icons.restart_alt, size: 16, color: AppColors.slate500),
                label: const Text('Đặt lại', style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.w600)),
              ),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ]),
          ),
          const Divider(),
          Expanded(
            child: ListView(
              controller: ctrl,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              children: [
                _section('Danh mục', [
                  for (final (id, label) in tgItems)
                    _check('$label (${s.targetGroup[id] ?? 0})', tg.contains(id), () => _toggle('targetGroup', id)),
                  _check('Phụ kiện', p['category'] == 'accessories', () => setState(() {
                    p['category'] == 'accessories' ? p.remove('category') : p['category'] = 'accessories';
                  })),
                ]),
                if (s.productType.isNotEmpty)
                  _section('Loại sản phẩm', [
                    for (final e in s.productType.entries)
                      _check('${productTypeLabel(e.key)} (${e.value})', types.contains(e.key), () => _toggle('productType', e.key)),
                  ]),
                if (s.sizes.values.any((l) => l.isNotEmpty))
                  _section('Kích cỡ', [
                    for (final (key, param, label) in sizeSections)
                      if ((s.sizes[key] ?? []).isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.only(top: 8, bottom: 8),
                          child: Text(label.toUpperCase(), style: labelCaps(size: 11, color: AppColors.slate500)),
                        ),
                        Wrap(spacing: 8, runSpacing: 8, children: [
                          for (final size in s.sizes[key]!)
                            ChoiceChip(
                              label: Text(size),
                              selected: _set(param).contains(size),
                              showCheckmark: false,
                              selectedColor: AppColors.slate900,
                              backgroundColor: Colors.white,
                              labelStyle: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w700, color: _set(param).contains(size) ? Colors.white : AppColors.slate700),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: AppColors.slate200)),
                              onSelected: (_) => _toggle(param, size),
                            ),
                        ]),
                      ],
                  ]),
                _section('Khoảng giá', [
                  for (var i = 0; i < _priceRanges.length; i++)
                    _check(_priceRanges[i].$1, preset == i, () => setState(() {
                      if (preset == i) {
                        p.remove('minPrice');
                        p.remove('maxPrice');
                      } else {
                        final r = _priceRanges[i];
                        r.$2 == null ? p.remove('minPrice') : p['minPrice'] = '${r.$2}';
                        r.$3 == null ? p.remove('maxPrice') : p['maxPrice'] = '${r.$3}';
                        _min.clear();
                        _max.clear();
                      }
                    })),
                  const SizedBox(height: 8),
                  Row(children: [
                    Expanded(child: TextField(controller: _min, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Từ'))),
                    const Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text('-')),
                    Expanded(child: TextField(controller: _max, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Đến'))),
                    const SizedBox(width: 8),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: AppColors.slate900, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      onPressed: _applyCustomPrice,
                      child: const Text('Áp dụng'),
                    ),
                  ]),
                  if (_priceError.isNotEmpty)
                    Padding(padding: const EdgeInsets.only(top: 6), child: Text(_priceError, style: const TextStyle(color: AppColors.primary, fontSize: 12))),
                ]),
                _section('Trạng thái', [
                  for (final e in _statusMap.entries) _check(e.value, status.contains(e.key), () => _toggle('status', e.key)),
                ]),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: PillButton('Xem kết quả', expand: true, onPressed: () => Navigator.pop(context, p)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> children) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            initiallyExpanded: true,
            tilePadding: EdgeInsets.zero,
            childrenPadding: EdgeInsets.zero,
            expandedCrossAxisAlignment: CrossAxisAlignment.start,
            title: Text(title.toUpperCase(), style: labelCaps(size: 13, color: AppColors.slate900, weight: FontWeight.w900)),
            children: children,
          ),
        ),
      );

  Widget _check(String label, bool value, VoidCallback onTap) => InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(children: [
            SizedBox(width: 28, height: 28, child: Checkbox(value: value, onChanged: (_) => onTap(), visualDensity: VisualDensity.compact)),
            const SizedBox(width: 6),
            Expanded(child: Text(label, style: TextStyle(fontSize: 14, color: value ? AppColors.slate900 : AppColors.slate700, fontWeight: value ? FontWeight.w700 : FontWeight.w500))),
          ]),
        ),
      );
}
