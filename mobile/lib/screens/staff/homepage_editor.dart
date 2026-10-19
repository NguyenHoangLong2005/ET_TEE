import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';

const _api = '/api/staff/marketing';
const _heroPosition = 'HOME_HERO';

// Keys must match what the storefront home screen reads.
const _productSections = [
  ('HOME_SALE', 'Ưu đãi đặc biệt', 'Sản phẩm đang giảm giá'),
  ('HOME_NEW', 'Sản phẩm mới', 'Hàng mới về'),
  ('HOME_RECOMMENDED', 'Được yêu thích nhất', 'Sản phẩm được nhiều người chọn'),
  ('HOME_BEST_SELLER', 'Bán chạy nhất', 'Sản phẩm bán chạy'),
];

// Static slides the storefront falls back to when no banner exists.
final _defaultSlides = [
  ('BỘ SƯU TẬP THU ĐÔNG', 'Đẳng cấp & phong cách xu hướng thời trang hiện đại', '/products'),
  ('BEST SELLERS 2026', 'Những trang phục được săn đón và lựa chọn nhiều nhất', '/products?sort=best-seller'),
  ('ĐỒNG PHỤC GIA ĐÌNH', 'Gắn kết tình thân với thiết kế mặc đồng điệu cả nhà', '/products?targetGroup=family'),
  ('THỜI TRANG NỮ CAO CẤP', 'Thanh lịch - Quyến rũ - Tinh tế trong từng đường nét', '/products?targetGroup=women'),
  ('THỜI TRANG NAM HIỆN ĐẠI', 'Phong cách nam tính, năng động và lịch lãm', '/products?targetGroup=men'),
  ('BỘ SƯU TẬP TRẺ EM', 'Chất liệu hữu cơ siêu mềm mại, an toàn tuyệt đối cho bé', '/products?targetGroup=kids'),
  ('ƯU ĐÃI ĐẶC BIỆT', 'Săn deal giảm giá trực tiếp - Số lượng sản phẩm có hạn', '/products?status=sale'),
  ('ĐỊNH HÌNH PHONG CÁCH', 'Phối đồ cá nhân hóa nâng tầm gu thời trang của riêng bạn', '/products'),
].asMap().entries.map((e) => {
      'title': e.value.$1,
      'subtitle': e.value.$2,
      'linkUrl': e.value.$3,
      'imageUrl': '/images/banners/home/banner-${e.key + 1}.webp',
    }).toList();

bool _isOn(Map b) => b['status'] != null ? b['status'] == 'ACTIVE' : b['isActive'] != false;

/// Runs a staff marketing mutation; shows the server's reason on failure.
Future<bool> _run(Future<ApiResponse?> Function() fn, {String? ok}) async {
  try {
    final res = await fn();
    if (res != null && !res.ok) throw ApiException(res.errorMessage('Thao tác thất bại'));
    if (ok != null) Toast.success(ok);
    return true;
  } catch (e) {
    Toast.error(e is ApiException ? e.message : 'Thao tác thất bại');
    return false;
  }
}

/// Port of web staff/dashboard/marketing/homepage/page.tsx: a preview of the home page whose
/// editable blocks open an editor.
class HomepageEditorScreen extends StatefulWidget {
  const HomepageEditorScreen({super.key});

  @override
  State<HomepageEditorScreen> createState() => _HomepageEditorScreenState();
}

class _HomepageEditorScreenState extends State<HomepageEditorScreen> {
  List<Map<String, dynamic>> _banners = [];
  List<Map<String, dynamic>> _placements = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await Future.wait([Api.instance.send('GET', '$_api/banners'), Api.instance.send('GET', '$_api/placements')]);
      if (r[0].ok) {
        _banners = asList(r[0].body).whereType<Map<String, dynamic>>().where((b) => b['position'] == _heroPosition).toList()
          ..sort((a, b) => toNum(a['displayOrder']).compareTo(toNum(b['displayOrder'])));
      }
      if (r[1].ok) {
        _placements = asList(r[1].body).whereType<Map<String, dynamic>>().toList()
          ..sort((a, b) => toNum(a['displayOrder']).compareTo(toNum(b['displayOrder'])));
      }
      if (!r[0].ok && !r[1].ok) Toast.error('Không tải được dữ liệu trang chủ');
    } catch (_) {
      Toast.error('Không tải được dữ liệu trang chủ');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> _section(String key) => _placements.where((p) => p['section'] == key).toList();

  Future<void> _openHero() async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => _HeroEditor(banners: _banners, reload: _reloadBanners)));
    _load();
  }

  Future<List<Map<String, dynamic>>> _reloadBanners() async {
    await _load();
    return _banners;
  }

  Future<void> _openSection((String, String, String) sec) async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _ProductSectionEditor(
        sectionKey: sec.$1,
        label: sec.$2,
        hint: sec.$3,
        load: () async {
          await _load();
          return _section(sec.$1);
        },
      ),
    ));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final activeHero = _banners.where(_isOn).toList();
    return MarketingShell(
      path: '/staff/marketing/homepage',
      title: 'Trang chủ',
      body: _loading
          ? const LoadingView()
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('Bấm vào một khối bên dưới để chỉnh sửa nội dung hiển thị trên trang chủ.', style: TextStyle(fontSize: 13, color: AppColors.slate500)),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
                    child: Column(children: [
                      _EditableBlock(
                        onTap: _openHero,
                        child: AspectRatio(
                          aspectRatio: 21 / 9,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: Stack(fit: StackFit.expand, children: [
                              Container(color: AppColors.slate900),
                              if (activeHero.isNotEmpty) ...[
                                Opacity(opacity: 0.9, child: NetImage(resolveImageUrl(activeHero.first['imageUrl']))),
                                const DecoratedBox(
                                  decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.center, colors: [Color(0x99000000), Colors.transparent])),
                                ),
                                Positioned(
                                  left: 12,
                                  bottom: 10,
                                  right: 12,
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text('${activeHero.first['title'] ?? ''}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15)),
                                    if ((activeHero.first['subtitle'] ?? '').toString().isNotEmpty)
                                      Text('${activeHero.first['subtitle']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                                  ]),
                                ),
                              ] else
                                const Center(
                                  child: Text('Chưa có banner — trang chủ đang dùng ảnh mặc định',
                                      textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate300, fontSize: 13)),
                                ),
                              Positioned(
                                left: 8,
                                top: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(color: const Color(0x99000000), borderRadius: BorderRadius.circular(4)),
                                  child: Text('Banner đầu trang · ${activeHero.length} đang hiển thị', style: const TextStyle(color: Colors.white, fontSize: 11)),
                                ),
                              ),
                            ]),
                          ),
                        ),
                      ),
                      const _Locked('Cam kết dịch vụ'),
                      const _Locked('Danh mục nổi bật'),
                      for (final sec in _productSections)
                        _EditableBlock(
                          onTap: () => _openSection(sec),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                Text(sec.$2, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                                const SizedBox(width: 8),
                                Flexible(child: Text(sec.$3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.slate400))),
                              ]),
                              const SizedBox(height: 10),
                              if (_section(sec.$1).isEmpty)
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
                                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(6)),
                                  child: const Text('Chưa chọn sản phẩm — trang chủ đang hiển thị danh sách tự động',
                                      textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: AppColors.slate500)),
                                )
                              else
                                Row(children: [
                                  for (final p in _section(sec.$1).take(4))
                                    Expanded(
                                      child: Padding(
                                        padding: const EdgeInsets.only(right: 8),
                                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                          AspectRatio(
                                            aspectRatio: 3 / 4,
                                            child: ClipRRect(borderRadius: BorderRadius.circular(4), child: NetImage(resolveImageUrl((p['product'] as Map?)?['imageUrl']))),
                                          ),
                                          const SizedBox(height: 4),
                                          Text('${(p['product'] as Map?)?['name'] ?? '#${p['productId']}'}',
                                              maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                                        ]),
                                      ),
                                    ),
                                ]),
                            ]),
                          ),
                        ),
                      const _Locked('Phối đồ gia đình'),
                      const _Locked('Đăng ký nhận tin'),
                    ]),
                  ),
                ],
              ),
            ),
    );
  }
}

class _EditableBlock extends StatelessWidget {
  final Widget child;
  final VoidCallback onTap;
  const _EditableBlock({required this.child, required this.onTap});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Material(
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: AppColors.slate200)),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: Stack(children: [
              child,
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.red600, borderRadius: BorderRadius.circular(999)),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.edit, size: 12, color: Colors.white),
                    SizedBox(width: 4),
                    Text('Chỉnh sửa', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500)),
                  ]),
                ),
              ),
            ]),
          ),
        ),
      );
}

class _Locked extends StatelessWidget {
  final String label;
  const _Locked(this.label);

  @override
  Widget build(BuildContext context) => Container(
        height: 52,
        margin: const EdgeInsets.only(bottom: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate300)),
        child: Text('$label · tự động, không chỉnh sửa', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
      );
}

// ─── Hero banner editor ─────────────────────────────────────────────────────

class _HeroEditor extends StatefulWidget {
  final List<Map<String, dynamic>> banners;
  final Future<List<Map<String, dynamic>>> Function() reload;
  const _HeroEditor({required this.banners, required this.reload});

  @override
  State<_HeroEditor> createState() => _HeroEditorState();
}

class _HeroEditorState extends State<_HeroEditor> {
  late List<Map<String, dynamic>> _banners = widget.banners;
  bool _busy = false;

  Future<void> _do(Future<ApiResponse?> Function() fn, {String? ok}) async {
    setState(() => _busy = true);
    await _run(fn, ok: ok);
    final b = await widget.reload();
    if (mounted) {
      setState(() {
        _banners = b;
        _busy = false;
      });
    }
  }

  List<Map<String, dynamic>> get _missingDefaults => _defaultSlides.where((d) => !_banners.any((b) => b['imageUrl'] == d['imageUrl'])).toList();

  Future<void> _importDefaults() => _do(() async {
        var order = _banners.length;
        for (final d in _missingDefaults) {
          order++;
          final res = await Api.instance.send('POST', '$_api/banners', body: {...d, 'position': _heroPosition, 'status': 'ACTIVE', 'displayOrder': order});
          if (!res.ok) return res;
        }
        return null;
      }, ok: 'Đã nhập ảnh banner có sẵn');

  Future<void> _toggle(Map<String, dynamic> b) =>
      _do(() => Api.instance.send('PATCH', '$_api/banners/${b['id']}/status', body: {'status': _isOn(b) ? 'INACTIVE' : 'ACTIVE'}));

  Future<void> _remove(Map<String, dynamic> b) async {
    if (!await confirmDialog(context, 'Xóa banner', 'Xóa banner "${b['title']}"?', confirm: 'Xóa')) return;
    await _do(() => Api.instance.send('DELETE', '$_api/banners/${b['id']}'), ok: 'Đã xóa banner');
  }

  Future<void> _move(int i, int dir) async {
    if (i + dir < 0 || i + dir >= _banners.length) return;
    final a = _banners[i], b = _banners[i + dir];
    await _do(() async {
      final r = await Future.wait([
        Api.instance.send('PUT', '$_api/banners/${a['id']}', body: {...a, 'displayOrder': i + dir + 1}),
        Api.instance.send('PUT', '$_api/banners/${b['id']}', body: {...b, 'displayOrder': i + 1}),
      ]);
      return r[0].ok ? r[1] : r[0];
    });
  }

  Future<void> _edit([Map<String, dynamic>? banner]) async {
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => _BannerForm(banner: banner ?? {'status': 'ACTIVE'}, nextOrder: _banners.length + 1),
    ));
    if (saved == true) {
      final b = await widget.reload();
      if (mounted) setState(() => _banners = b);
    }
  }

  @override
  Widget build(BuildContext context) {
    final missing = _missingDefaults;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Banner đầu trang', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          Text('Ảnh chạy luân phiên theo thứ tự từ trên xuống', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
        ]),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: AppColors.slate200)),
      ),
      body: Column(children: [
        if (_busy) const LinearProgressIndicator(minHeight: 2, color: AppColors.red600),
        Expanded(
          child: _banners.isEmpty
              ? const Center(child: Text('Chưa có banner. Thêm banner đầu tiên bên dưới.', style: TextStyle(color: AppColors.slate500, fontSize: 13)))
              : ListView.separated(
                  itemCount: _banners.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final b = _banners[i];
                    return Opacity(
                      opacity: _isOn(b) ? 1 : 0.5,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        child: Row(children: [
                          ClipRRect(borderRadius: BorderRadius.circular(4), child: SizedBox(width: 72, height: 44, child: NetImage(resolveImageUrl(b['imageUrl'])))),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('${b['title'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                              Text(_isOn(b) ? 'Đang hiển thị' : 'Đã ẩn', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                            ]),
                          ),
                          _iconBtn(Icons.arrow_upward, _busy || i == 0 ? null : () => _move(i, -1)),
                          _iconBtn(Icons.arrow_downward, _busy || i == _banners.length - 1 ? null : () => _move(i, 1)),
                          _iconBtn(_isOn(b) ? Icons.visibility_outlined : Icons.visibility_off_outlined, _busy ? null : () => _toggle(b)),
                          _iconBtn(Icons.edit_outlined, () => _edit(b)),
                          _iconBtn(Icons.delete_outline, _busy ? null : () => _remove(b), color: AppColors.red600),
                        ]),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.slate200))),
            child: Column(children: [
              if (missing.isNotEmpty) ...[
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.slate900, side: const BorderSide(color: AppColors.slate300), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6))),
                    onPressed: _busy ? null : _importDefaults,
                    child: Text('Nhập ${missing.length} ảnh banner có sẵn của website'),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.red600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6))),
                  onPressed: () => _edit(),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Thêm banner'),
                ),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}

Widget _iconBtn(IconData icon, VoidCallback? onTap, {Color color = AppColors.slate500}) => IconButton(
      visualDensity: VisualDensity.compact,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
      padding: EdgeInsets.zero,
      iconSize: 18,
      color: color,
      disabledColor: AppColors.slate300,
      onPressed: onTap,
      icon: Icon(icon),
    );

class _BannerForm extends StatefulWidget {
  final Map<String, dynamic> banner;
  final int nextOrder;
  const _BannerForm({required this.banner, required this.nextOrder});

  @override
  State<_BannerForm> createState() => _BannerFormState();
}

class _BannerFormState extends State<_BannerForm> {
  late final _image = TextEditingController(text: '${widget.banner['imageUrl'] ?? ''}');
  late final _title = TextEditingController(text: '${widget.banner['title'] ?? ''}');
  late final _subtitle = TextEditingController(text: '${widget.banner['subtitle'] ?? ''}');
  late final _link = TextEditingController(text: '${widget.banner['linkUrl'] ?? ''}');
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_image, _title, _subtitle, _link]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty || _image.text.trim().isEmpty) return Toast.error('Cần nhập tiêu đề và link ảnh');
    final isNew = widget.banner['id'] == null;
    final body = {
      'status': 'ACTIVE',
      ...widget.banner,
      'imageUrl': _image.text.trim(),
      'title': _title.text.trim(),
      'subtitle': _subtitle.text.trim(),
      'linkUrl': _link.text.trim(),
      'position': _heroPosition,
      'displayOrder': widget.banner['displayOrder'] ?? widget.nextOrder,
    };
    setState(() => _busy = true);
    final ok = await _run(
      () => Api.instance.send(isNew ? 'POST' : 'PUT', isNew ? '$_api/banners' : '$_api/banners/${widget.banner['id']}', body: body),
      ok: isNew ? 'Đã thêm banner' : 'Đã lưu banner',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: Text(widget.banner['id'] != null ? 'Sửa banner' : 'Thêm banner', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: AppColors.slate200)),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_image.text.trim().isNotEmpty)
              ClipRRect(borderRadius: BorderRadius.circular(6), child: AspectRatio(aspectRatio: 21 / 9, child: NetImage(resolveImageUrl(_image.text.trim())))),
            const SizedBox(height: 14),
            _label('Link ảnh *'),
            TextField(controller: _image, onChanged: (_) => setState(() {}), decoration: const InputDecoration(hintText: 'https://… hoặc /images/…')),
            const SizedBox(height: 12),
            _label('Tiêu đề *'),
            TextField(controller: _title),
            const SizedBox(height: 12),
            _label('Mô tả ngắn'),
            TextField(controller: _subtitle),
            const SizedBox(height: 12),
            _label('Link khi bấm vào'),
            TextField(controller: _link, decoration: const InputDecoration(hintText: '/products?status=sale')),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy'))),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.red600),
                  onPressed: _busy ? null : _save,
                  child: Text(_busy ? 'Đang lưu…' : 'Lưu'),
                ),
              ),
            ]),
          ),
        ),
      );
}

Widget _label(String t) => Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(t, style: const TextStyle(fontSize: 14)));

// ─── Product section editor ─────────────────────────────────────────────────

class _ProductSectionEditor extends StatefulWidget {
  final String sectionKey;
  final String label;
  final String hint;
  final Future<List<Map<String, dynamic>>> Function() load;
  const _ProductSectionEditor({required this.sectionKey, required this.label, required this.hint, required this.load});

  @override
  State<_ProductSectionEditor> createState() => _ProductSectionEditorState();
}

class _ProductSectionEditorState extends State<_ProductSectionEditor> {
  List<Map<String, dynamic>> _items = [];
  bool _busy = false, _searching = false;
  final _query = TextEditingController();
  List<Map<String, dynamic>> _hits = [];
  final Map<int, Map<String, dynamic>> _picked = {};
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _refresh();
    _search();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    final items = await widget.load();
    if (mounted) setState(() => _items = items);
  }

  void _onQuery(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), _search);
  }

  Future<void> _search() async {
    setState(() => _searching = true);
    try {
      final q = _query.text.trim();
      final res = await Api.instance.send('GET', '/api/products', query: {if (q.isNotEmpty) 'search': q, 'size': 30});
      if (res.ok) _hits = asList(res.data).whereType<Map<String, dynamic>>().toList();
    } catch (_) {
      _hits = [];
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _do(Future<ApiResponse?> Function() fn, {String? ok}) async {
    setState(() => _busy = true);
    final success = await _run(fn, ok: ok);
    await _refresh();
    if (mounted) setState(() => _busy = false);
    if (success && ok != null && ok.startsWith('Đã thêm')) {
      setState(() {
        _picked.clear();
        _query.clear();
      });
    }
  }

  Future<void> _addPicked() {
    final list = _picked.values.toList();
    return _do(() async {
      var order = _items.length;
      for (final p in list) {
        order++;
        final res = await Api.instance.send('POST', '$_api/placements', body: {'productId': p['id'], 'section': widget.sectionKey, 'displayOrder': order});
        if (!res.ok) return res;
      }
      return null;
    }, ok: 'Đã thêm ${list.length} sản phẩm');
  }

  Future<void> _move(int i, int dir) {
    final ids = _items.map((x) => x['id']).toList();
    final t = ids[i];
    ids[i] = ids[i + dir];
    ids[i + dir] = t;
    return _do(() => Api.instance.send('PUT', '$_api/placements/reorder', body: {'section': widget.sectionKey, 'orderedIds': ids}));
  }

  @override
  Widget build(BuildContext context) {
    final existing = _items.map((i) => toInt(i['productId'])).toSet();
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          Text(_items.isNotEmpty ? '${_items.length} sản phẩm được chọn' : 'Đang hiển thị danh sách tự động',
              style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
        ]),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: AppColors.slate200)),
      ),
      body: DefaultTabController(
        length: 2,
        child: Column(children: [
          if (_busy) const LinearProgressIndicator(minHeight: 2, color: AppColors.red600),
          const TabBar(
            labelColor: AppColors.red600,
            indicatorColor: AppColors.red600,
            unselectedLabelColor: AppColors.slate500,
            tabs: [Tab(text: 'Đang hiển thị'), Tab(text: 'Thêm sản phẩm')],
          ),
          Expanded(
            child: TabBarView(children: [
              _items.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text('Chưa chọn sản phẩm nào. Khi để trống, trang chủ tự lấy ${widget.hint.toLowerCase()}.',
                            textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
                      ),
                    )
                  : ListView.separated(
                      itemCount: _items.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final p = _items[i];
                        final prod = (p['product'] as Map?) ?? {};
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          child: Row(children: [
                            SizedBox(width: 20, child: Text('${i + 1}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.slate400))),
                            const SizedBox(width: 8),
                            ClipRRect(borderRadius: BorderRadius.circular(4), child: SizedBox(width: 36, height: 48, child: NetImage(resolveImageUrl(prod['imageUrl'])))),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('${prod['name'] ?? 'Sản phẩm #${p['productId']}'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                                Text((prod['salePrice'] ?? prod['price']) != null ?'${formatNumber(toNum(prod['salePrice'] ?? prod['price']))}₫' : '',
                                    style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                              ]),
                            ),
                            _iconBtn(Icons.arrow_upward, _busy || i == 0 ? null : () => _move(i, -1)),
                            _iconBtn(Icons.arrow_downward, _busy || i == _items.length - 1 ? null : () => _move(i, 1)),
                            _iconBtn(Icons.delete_outline, _busy ? null : () => _do(() => Api.instance.send('DELETE', '$_api/placements/${p['id']}'), ok: 'Đã bỏ sản phẩm'),
                                color: AppColors.red600),
                          ]),
                        );
                      },
                    ),
              Column(children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: TextField(
                    controller: _query,
                    onChanged: _onQuery,
                    decoration: const InputDecoration(prefixIcon: Icon(Icons.search, size: 18), hintText: 'Chọn hoặc tìm sản phẩm theo tên…'),
                  ),
                ),
                Expanded(
                  child: _searching
                      ? const Center(child: Text('Đang tìm…', style: TextStyle(fontSize: 12, color: AppColors.slate400)))
                      : _hits.isEmpty
                          ? const Center(child: Text('Không tìm thấy sản phẩm', style: TextStyle(fontSize: 12, color: AppColors.slate400)))
                          : ListView.separated(
                              itemCount: _hits.length,
                              separatorBuilder: (_, _) => const Divider(height: 1),
                              itemBuilder: (_, i) {
                                final h = _hits[i];
                                final id = toInt(h['id']);
                                final already = existing.contains(id);
                                final checked = already || _picked.containsKey(id);
                                final img = asList(h['images']).isNotEmpty ? (asList(h['images']).first as Map)['imageUrl'] : null;
                                return Opacity(
                                  opacity: already ? 0.5 : 1,
                                  child: InkWell(
                                    onTap: already
                                        ? null
                                        : () => setState(() {
                                              if (_picked.remove(id) == null) _picked[id] = h;
                                            }),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      child: Row(children: [
                                        Icon(checked ? Icons.check_box : Icons.check_box_outline_blank, size: 20, color: checked ? AppColors.red600 : AppColors.slate300),
                                        const SizedBox(width: 10),
                                        ClipRRect(borderRadius: BorderRadius.circular(4), child: SizedBox(width: 32, height: 40, child: NetImage(resolveImageUrl(img)))),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                            Text('${h['name'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                                            Text(already ? 'Đã có trong khối này' : (h['price'] != null ? '${formatNumber(toNum(h['price']))}₫' : ''),
                                                style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                                          ]),
                                        ),
                                      ]),
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
                if (_picked.isNotEmpty)
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          style: FilledButton.styleFrom(backgroundColor: AppColors.red600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6))),
                          onPressed: _busy ? null : _addPicked,
                          child: Text(_busy ? 'Đang thêm…' : 'Thêm ${_picked.length} sản phẩm đã chọn'),
                        ),
                      ),
                    ),
                  ),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}
