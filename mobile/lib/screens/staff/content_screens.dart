import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import '../../widgets/order_widgets.dart';
import 'marketing_shell.dart';

/// Stat card of the staff pages (web StatCard).
class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;
  final Color color;
  const _StatCard({required this.title, required this.value, this.subtitle, required this.icon, this.color = AppColors.blue600});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
        child: Row(children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 19, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
              Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              if (subtitle != null) Text(subtitle!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
            ]),
          ),
        ]),
      );
}

Widget _searchField(String hint, ValueChanged<String> onChanged) => TextField(
      onChanged: onChanged,
      decoration: InputDecoration(prefixIcon: const Icon(Icons.search, size: 18), hintText: hint, isDense: true),
    );

Widget _dropdown<T>(T value, List<(T, String)> items, ValueChanged<T> onChanged) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate300)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700),
          items: [for (final (v, l) in items) DropdownMenuItem(value: v, child: Text(l))],
          onChanged: (v) => v == null ? null : onChanged(v),
        ),
      ),
    );

// ─── Posts ──────────────────────────────────────────────────────────────────

/// Vietnamese title -> url slug (web generateSlug).
String generateSlug(String text) {
  const from = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
  const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
  var s = text.toLowerCase();
  final buf = StringBuffer();
  for (final ch in s.split('')) {
    final i = from.indexOf(ch);
    buf.write(i >= 0 ? to[i] : ch);
  }
  s = buf.toString().replaceAll(RegExp(r'[^a-z0-9\s-]'), '').replaceAll(RegExp(r'\s+'), '-').replaceAll(RegExp(r'-+'), '-').trim();
  return s;
}

const _postStatus = {'PUBLISHED': ('Đã xuất bản', 'green'), 'DRAFT': ('Bản nháp', 'gray'), 'ARCHIVED': ('Lưu trữ', 'amber')};

/// Port of web staff/dashboard/marketing/posts/page.tsx.
class PostsScreen extends StatefulWidget {
  const PostsScreen({super.key});

  @override
  State<PostsScreen> createState() => _PostsScreenState();
}

class _PostsScreenState extends State<PostsScreen> {
  List<Map<String, dynamic>> _posts = [];
  bool _loading = true;
  String _q = '', _status = 'ALL';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final res = await Api.instance.send('GET', '/api/staff/marketing/posts');
      if (!res.ok) throw ApiException('Lỗi tải danh sách bài viết (HTTP ${res.status})');
      _posts = asList(res.body).whereType<Map<String, dynamic>>().toList();
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không thể tải danh sách bài viết');
      _posts = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggle(Map<String, dynamic> p) async {
    final next = p['status'] == 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    final res = await Api.instance.send('PATCH', '/api/staff/marketing/posts/${p['id']}/status', body: {'status': next});
    if (!res.ok) return Toast.error('Đổi trạng thái thất bại (HTTP ${res.status})');
    Toast.success('Đã ${next == 'PUBLISHED' ? 'xuất bản' : 'chuyển về nháp'} bài viết');
    setState(() {
      p['status'] = next;
      if (next == 'PUBLISHED' && p['publishedAt'] == null) p['publishedAt'] = DateTime.now().toIso8601String();
    });
  }

  Future<void> _delete(Map<String, dynamic> p) async {
    if (!await confirmDialog(context, 'Xác nhận xóa bài viết', 'Bạn có chắc chắn muốn xóa bài viết "${p['title']}"? Thao tác này không thể hoàn tác.', confirm: 'Xóa')) return;
    final res = await Api.instance.send('DELETE', '/api/staff/marketing/posts/${p['id']}');
    if (!res.ok) return Toast.error('Xóa bài viết thất bại (HTTP ${res.status})');
    Toast.success('Đã xóa bài viết thành công');
    setState(() => _posts.removeWhere((x) => x['id'] == p['id']));
  }

  Future<void> _edit([Map<String, dynamic>? post]) async {
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => _PostForm(post: post)));
    if (saved == true) _load(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final q = _q.toLowerCase();
    final list = _posts.where((p) {
      final tags = asList(p['tags']).map((t) => '$t'.toLowerCase());
      final match = '${p['title']}'.toLowerCase().contains(q) || '${p['slug']}'.toLowerCase().contains(q) || tags.any((t) => t.contains(q));
      return match && (_status == 'ALL' || p['status'] == _status);
    }).toList();
    final views = _posts.fold<num>(0, (s, p) => s + toNum(p['views']));
    return MarketingShell(
      path: '/staff/marketing/posts',
      title: 'Quản lý Bài Viết',
      actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh, size: 20), tooltip: 'Làm mới')],
      floatingAction: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        onPressed: () => _edit(),
        icon: const Icon(Icons.add),
        label: const Text('Viết bài mới'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            const Text('Nội dung blog, tin tức và chia sẻ xu hướng thời trang ET.TEE', style: TextStyle(fontSize: 13, color: AppColors.slate500)),
            const SizedBox(height: 14),
            _StatCard(
                title: 'Đã xuất bản',
                value: '${_posts.where((p) => p['status'] == 'PUBLISHED').length}',
                subtitle: 'Bài viết đang hiển thị trên trang tin',
                icon: Icons.check_circle_outline,
                color: AppColors.emerald600),
            const SizedBox(height: 10),
            _StatCard(
                title: 'Bản nháp',
                value: '${_posts.where((p) => p['status'] == 'DRAFT').length}',
                subtitle: 'Bài viết đang soạn thảo',
                icon: Icons.edit_note,
                color: AppColors.amber600),
            const SizedBox(height: 10),
            _StatCard(title: 'Lượt xem (Toàn bộ)', value: formatNumber(views), subtitle: 'Lượt độc giả truy cập xem bài viết', icon: Icons.visibility_outlined),
            const SizedBox(height: 16),
            _searchField('Tìm theo tiêu đề, slug hoặc tag...', (v) => setState(() => _q = v)),
            const SizedBox(height: 8),
            _dropdown<String>(_status, const [('ALL', 'Tất cả trạng thái'), ('PUBLISHED', 'Đã xuất bản'), ('DRAFT', 'Bản nháp'), ('ARCHIVED', 'Lưu trữ')],
                (v) => setState(() => _status = v)),
            const SizedBox(height: 14),
            if (_loading)
              const LoadingView()
            else if (list.isEmpty)
              const EmptyPanel(icon: Icons.article_outlined, title: 'Không có bài viết nào', message: 'Chưa có bài viết hoặc không khớp bộ lọc.')
            else
              for (final p in list) _postTile(p),
          ],
        ),
      ),
    );
  }

  Widget _postTile(Map<String, dynamic> p) {
    final st = _postStatus[p['status']] ?? ('${p['status']}', 'gray');
    final tags = asList(p['tags']).map((t) => '$t').toList();
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 64,
              height: 48,
              child: NetImage(resolveImageUrl(p['coverImageUrl']), fallback: Container(color: AppColors.slate100, child: const Icon(Icons.description_outlined, color: AppColors.slate400))),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${p['title'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('${p['slug'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: AppColors.slate500)),
              if (tags.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Wrap(spacing: 4, children: [
                    for (final t in tags.take(3))
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(4), border: Border.all(color: AppColors.slate200)),
                        child: Text('#$t', style: const TextStyle(fontSize: 10, color: AppColors.slate600)),
                      ),
                    if (tags.length > 3) Text('+${tags.length - 3}', style: const TextStyle(fontSize: 10, color: AppColors.slate400)),
                  ]),
                ),
            ]),
          ),
          ToneBadge(st.$1, tone: st.$2),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          const Icon(Icons.visibility_outlined, size: 14, color: AppColors.slate400),
          const SizedBox(width: 4),
          Text('${formatNumber(toNum(p['views']))} lượt', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
          const SizedBox(width: 12),
          Expanded(
            child: Text('${p['publishedAt'] != null ? formatDate(p['publishedAt']) : 'Chưa xuất bản'} · ${p['author'] ?? 'Tác giả'}',
                maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
          ),
          _actionBtn(Icons.edit_outlined, 'Chỉnh sửa bài viết', () => _edit(p)),
          _actionBtn(p['status'] == 'PUBLISHED' ? Icons.unpublished_outlined : Icons.check_circle_outline,
              p['status'] == 'PUBLISHED' ? 'Chuyển về Nháp' : 'Xuất bản', () => _toggle(p),
              color: p['status'] == 'PUBLISHED' ? AppColors.amber600 : AppColors.emerald600),
          _actionBtn(Icons.delete_outline, 'Xóa bài viết', () => _delete(p), color: AppColors.rose500),
        ]),
      ]),
    );
  }
}

Widget _actionBtn(IconData icon, String tooltip, VoidCallback onTap, {Color color = AppColors.slate600}) => Padding(
      padding: const EdgeInsets.only(left: 6),
      child: Tooltip(
        message: tooltip,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
            child: Icon(icon, size: 16, color: color),
          ),
        ),
      ),
    );

class _PostForm extends StatefulWidget {
  final Map<String, dynamic>? post;
  const _PostForm({this.post});

  @override
  State<_PostForm> createState() => _PostFormState();
}

class _PostFormState extends State<_PostForm> {
  late final _title = TextEditingController(text: '${widget.post?['title'] ?? ''}');
  late final _slug = TextEditingController(text: '${widget.post?['slug'] ?? ''}');
  late final _excerpt = TextEditingController(text: '${widget.post?['excerpt'] ?? ''}');
  late final _content = TextEditingController(text: '${widget.post?['content'] ?? ''}');
  late final _cover = TextEditingController(text: '${widget.post?['coverImageUrl'] ?? ''}');
  late final _tags = TextEditingController(text: asList(widget.post?['tags']).join(', '));
  late String _status = '${widget.post?['status'] ?? 'DRAFT'}';
  bool _saving = false;

  bool get _isEdit => widget.post != null;

  @override
  void dispose() {
    for (final c in [_title, _slug, _excerpt, _content, _cover, _tags]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty || _slug.text.trim().isEmpty) return Toast.error('Vui lòng nhập tiêu đề và slug');
    final payload = {
      ...?widget.post,
      'title': _title.text,
      'slug': _slug.text,
      'excerpt': _excerpt.text,
      'content': _content.text,
      'coverImageUrl': _cover.text,
      'status': _status,
      'tags': _tags.text.split(',').map((t) => t.trim()).where((t) => t.isNotEmpty).toList(),
    };
    setState(() => _saving = true);
    try {
      final res = await Api.instance.send(_isEdit ? 'PUT' : 'POST',
          _isEdit ? '/api/staff/marketing/posts/${widget.post!['id']}' : '/api/staff/marketing/posts', body: payload);
      if (!res.ok) throw ApiException('Lưu bài viết thất bại (HTTP ${res.status})');
      Toast.success(_isEdit ? 'Đã cập nhật bài viết thành công' : 'Đã tạo bài viết mới thành công');
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không thể lưu bài viết');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: Text(_isEdit ? 'Chỉnh sửa bài viết' : 'Viết bài mới', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: AppColors.slate200)),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _lbl('Tiêu đề bài viết', true),
            TextField(
              controller: _title,
              onChanged: (v) {
                if (!_isEdit) _slug.text = generateSlug(v);
              },
            ),
            const SizedBox(height: 12),
            _lbl('Đường dẫn (Slug)', true),
            TextField(controller: _slug, style: const TextStyle(fontFamily: 'monospace')),
            const SizedBox(height: 12),
            _lbl('Mô tả ngắn (Excerpt)'),
            TextField(controller: _excerpt, maxLines: 2),
            const SizedBox(height: 12),
            _lbl('Nội dung bài viết'),
            TextField(controller: _content, maxLines: 8),
            const SizedBox(height: 12),
            _lbl('URL Ảnh bìa'),
            TextField(controller: _cover, onChanged: (_) => setState(() {}), decoration: const InputDecoration(hintText: 'https://… hoặc /images/…')),
            if (_cover.text.trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              ClipRRect(borderRadius: BorderRadius.circular(8), child: AspectRatio(aspectRatio: 16 / 9, child: NetImage(resolveImageUrl(_cover.text.trim())))),
            ],
            const SizedBox(height: 12),
            _lbl('Trạng thái xuất bản'),
            _dropdown<String>(_status, const [('DRAFT', 'Bản nháp'), ('PUBLISHED', 'Đã xuất bản'), ('ARCHIVED', 'Lưu trữ')], (v) => setState(() => _status = v)),
            const SizedBox(height: 12),
            _lbl('Tags (phân cách bằng dấu phẩy)'),
            TextField(controller: _tags, decoration: const InputDecoration(hintText: 'xu-huong, phoi-do')),
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
                  style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Đang lưu…' : (_isEdit ? 'Cập nhật' : 'Tạo bài viết')),
                ),
              ),
            ]),
          ),
        ),
      );
}

Widget _lbl(String text, [bool required = false]) => Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text.rich(TextSpan(children: [
        TextSpan(text: text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
        if (required) const TextSpan(text: ' *', style: TextStyle(color: AppColors.rose500)),
      ])),
    );

// ─── Vouchers ───────────────────────────────────────────────────────────────

/// Mirrors MarketingService.validateVoucherTransition: staff toggle ACTIVE <-> PAUSED only.
const _voucherStatus = {
  'ACTIVE': ('Kích hoạt', 'green'),
  'PAUSED': ('Tạm dừng', 'gray'),
  'CANCELLED': ('Đã hủy', 'red'),
  'EXPIRED': ('Hết hạn', 'red'),
  'PENDING_APPROVAL': ('Chờ duyệt', 'amber'),
  'REJECTED': ('Bị từ chối', 'red'),
  'REVISION_REQUESTED': ('Cần chỉnh sửa', 'amber'),
};

String _currency(num v) => '${formatNumber(v)} ₫';

/// Like Api.call but keeps the envelope: a staff edit / delete of an approved voucher only sends the
/// store owner a request, answered with pendingApproval=true while the voucher stays unchanged.
Future<bool> _sendForApproval(String method, String path, {Object? body, required String fallbackError}) async {
  final res = await Api.instance.send(method, path, body: body);
  if (!res.success) throw ApiException(res.errorMessage(fallbackError), status: res.status);
  return res.body is Map && (res.body as Map)['pendingApproval'] == true;
}

/// Port of web staff/dashboard/marketing/vouchers/page.tsx.
class StaffVouchersScreen extends StatefulWidget {
  /// The owner workspace reuses it as its promotions page (web store-owner/promotions).
  final String shellPath;
  const StaffVouchersScreen({super.key, this.shellPath = '/staff/marketing/vouchers'});

  @override
  State<StaffVouchersScreen> createState() => _StaffVouchersScreenState();
}

class _StaffVouchersScreenState extends State<StaffVouchersScreen> {
  List<Map<String, dynamic>> _vouchers = [];
  bool _loading = true;
  String _q = '', _type = 'ALL', _status = 'ALL';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final d = await Api.instance.call('GET', '/api/marketing/admin/vouchers', fallbackError: 'Không thể tải danh sách mã giảm giá');
      _vouchers = asList(d).whereType<Map<String, dynamic>>().toList();
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Lỗi khi tải danh sách voucher');
      _vouchers = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggle(Map<String, dynamic> v) async {
    final next = v['status'] == 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await Api.instance.call('PATCH', '/api/marketing/admin/vouchers/${v['id']}/status', body: {'status': next}, fallbackError: 'Không thể thay đổi trạng thái');
      setState(() => v['status'] = next);
      Toast.success('Đã ${next == 'ACTIVE' ? 'kích hoạt' : 'tạm dừng'} voucher');
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Lỗi khi đổi trạng thái voucher');
    }
  }

  Future<void> _delete(Map<String, dynamic> v) async {
    final approved = v['status'] == 'ACTIVE' || v['status'] == 'PAUSED';
    final message = approved
        ? 'Mã "${v['code']}" đã được duyệt: yêu cầu xóa sẽ được gửi chủ cửa hàng duyệt, voucher vẫn hoạt động đến khi được duyệt.'
        : 'Bạn có chắc chắn muốn xóa mã voucher "${v['code']}"? Thao tác này không thể hoàn tác.';
    if (!await confirmDialog(context, 'Xác nhận xóa voucher', message, confirm: 'Xác nhận xóa')) {
      return;
    }
    try {
      final pending = await _sendForApproval('DELETE', '/api/marketing/admin/vouchers/${v['id']}', fallbackError: 'Không thể xóa voucher');
      if (pending) {
        setState(() => v['pendingChange'] = 'DELETE');
        Toast.success('Đã gửi yêu cầu xóa, chờ chủ cửa hàng duyệt');
      } else {
        setState(() => _vouchers.removeWhere((x) => x['id'] == v['id']));
        Toast.success('Đã xóa voucher thành công');
      }
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Lỗi khi xóa voucher');
    }
  }

  Future<void> _edit([Map<String, dynamic>? v]) async {
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => _VoucherForm(voucher: v)));
    if (saved == true) _load(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final q = _q.toLowerCase();
    final list = _vouchers.where((v) {
      final m = q.isEmpty || '${v['code']}'.toLowerCase().contains(q) || '${v['name']}'.toLowerCase().contains(q);
      return m && (_type == 'ALL' || v['discountType'] == _type) && (_status == 'ALL' || v['status'] == _status);
    }).toList();
    final active = _vouchers.where((v) => v['status'] == 'ACTIVE').length;
    final usages = _vouchers.fold<num>(0, (s, v) => s + toNum(v['usageCount'] ?? v['usedCount']));
    return MarketingShell(
      path: widget.shellPath,
      title: 'Voucher & Mã Khuyến Mãi',
      actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh, size: 20), tooltip: 'Làm mới')],
      floatingAction: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        onPressed: () => _edit(),
        icon: const Icon(Icons.add),
        label: const Text('Tạo voucher mới'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            const Text('Quản lý cấu hình khuyến mãi, mã voucher và hạn mức phát hành toàn hệ thống', style: TextStyle(fontSize: 13, color: AppColors.slate500)),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: _StatCard(title: 'Tổng voucher', value: '${_vouchers.length}', icon: Icons.confirmation_number_outlined)),
              const SizedBox(width: 10),
              Expanded(child: _StatCard(title: 'Đang kích hoạt', value: '$active', icon: Icons.check_circle_outline, color: AppColors.emerald600)),
            ]),
            const SizedBox(height: 10),
            _StatCard(title: 'Lượt sử dụng tích lũy', value: formatNumber(usages), icon: Icons.trending_up, color: AppColors.amber600),
            const SizedBox(height: 16),
            _searchField('Tìm mã hoặc tên voucher...', (v) => setState(() => _q = v)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: _dropdown<String>(_type, const [('ALL', 'Tất cả loại'), ('PERCENTAGE', 'Phần trăm'), ('FIXED_AMOUNT', 'Giảm tiền mặt'), ('FREE_SHIP', 'Miễn phí ship')],
                    (v) => setState(() => _type = v)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _dropdown<String>(
                    _status,
                    const [('ALL', 'Tất cả trạng thái'), ('ACTIVE', 'Kích hoạt'), ('PAUSED', 'Tạm dừng'), ('EXPIRED', 'Hết hạn'), ('CANCELLED', 'Đã hủy')],
                    (v) => setState(() => _status = v)),
              ),
            ]),
            const SizedBox(height: 14),
            if (_loading)
              const LoadingView()
            else if (list.isEmpty)
              const EmptyPanel(icon: Icons.confirmation_number_outlined, title: 'Không có voucher nào', message: 'Chưa có mã khuyến mãi nào được tạo hoặc khớp với bộ lọc.')
            else
              for (final v in list) _voucherTile(v),
          ],
        ),
      ),
    );
  }

  Widget _voucherTile(Map<String, dynamic> v) {
    final type = '${v['discountType']}';
    final used = toNum(v['usageCount'] ?? v['usedCount']);
    final max = toNum(v['maxUsage'] ?? v['maxUses']);
    final pct = max > 0 ? (used / max * 100).round() : 0;
    final end = parseDate(v['expiresAt'] ?? v['endDate']);
    final expired = end != null && end.isBefore(DateTime.now());
    final st = _voucherStatus[v['status']] ?? ('${v['status']}', 'gray');
    final canToggle = v['status'] == 'ACTIVE' || v['status'] == 'PAUSED';
    // An edit / delete already waits for the store owner: one request at a time.
    final pendingChange = v['pendingChange'] as String?;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(4), border: Border.all(color: AppColors.slate200)),
            child: Text('${v['code']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700)),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            iconSize: 15,
            color: AppColors.slate400,
            tooltip: 'Sao chép mã',
            onPressed: () => copyToClipboard('${v['code']}', 'Đã copy mã voucher: ${v['code']}'),
            icon: const Icon(Icons.copy),
          ),
          const Spacer(),
          if (pendingChange != null) ...[
            ToneBadge(pendingChange == 'DELETE' ? 'Chờ duyệt xóa' : 'Chờ duyệt sửa', tone: 'amber'),
            const SizedBox(width: 6),
          ],
          ToneBadge(st.$1, tone: st.$2),
        ]),
        Text('${v['name'] ?? ''}', style: const TextStyle(fontSize: 13, color: AppColors.slate600, fontWeight: FontWeight.w500)),
        const SizedBox(height: 10),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Mức giảm', style: TextStyle(fontSize: 11, color: AppColors.slate400)),
              Text(
                type == 'PERCENTAGE' ? '${toNum(v['discountValue'])}%' : type == 'FIXED_AMOUNT' ? _currency(toNum(v['discountValue'])) : 'Miễn phí ship',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.emerald600),
              ),
              if (toNum(v['maxDiscountAmount']) > 0)
                Text('Tối đa ${_currency(toNum(v['maxDiscountAmount']))}', style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
            ]),
          ),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Đơn tối thiểu', style: TextStyle(fontSize: 11, color: AppColors.slate400)),
              Text(_currency(toNum(v['minOrderValue'] ?? v['minOrderAmount'])), style: const TextStyle(fontSize: 13, fontFamily: 'monospace')),
            ]),
          ),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Hạn sử dụng', style: TextStyle(fontSize: 11, color: AppColors.slate400)),
              // end_date is nullable: no expiry
              Text(end == null ? 'Không thời hạn' : formatDate(end.toIso8601String()),
                  style: TextStyle(fontSize: 13, color: expired ? AppColors.rose700 : AppColors.slate600, fontWeight: expired ? FontWeight.w600 : FontWeight.w400)),
              if (expired) const Text('Hết hạn', style: TextStyle(fontSize: 10, color: AppColors.rose500)),
            ]),
          ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Text('${formatNumber(used)} / ${formatNumber(max)}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppColors.slate600)),
          const SizedBox(width: 8),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(value: (pct / 100).clamp(0, 1).toDouble(), minHeight: 6, color: AppColors.primary, backgroundColor: AppColors.slate100),
            ),
          ),
          const SizedBox(width: 8),
          Text('$pct%', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppColors.slate600)),
        ]),
        const SizedBox(height: 10),
        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          if (canToggle) _actionBtn(Icons.power_settings_new, v['status'] == 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt', () => _toggle(v)),
          if (pendingChange == null) ...[
            _actionBtn(Icons.edit_outlined, 'Sửa voucher', () => _edit(v)),
            _actionBtn(Icons.delete_outline, 'Xóa voucher', () => _delete(v), color: AppColors.rose700),
          ],
        ]),
      ]),
    );
  }
}

class _VoucherForm extends StatefulWidget {
  final Map<String, dynamic>? voucher;
  const _VoucherForm({this.voucher});

  @override
  State<_VoucherForm> createState() => _VoucherFormState();
}

class _VoucherFormState extends State<_VoucherForm> {
  late final _v = widget.voucher;
  late final _code = TextEditingController(text: '${_v?['code'] ?? ''}');
  late final _name = TextEditingController(text: '${_v?['name'] ?? ''}');
  late final _value = TextEditingController(text: _num(_v?['discountValue']));
  late final _maxDiscount = TextEditingController(text: _num(_v?['maxDiscountAmount']));
  late final _minOrder = TextEditingController(text: _num(_v?['minOrderValue'] ?? _v?['minOrderAmount']));
  late final _maxUsage = TextEditingController(text: _v == null ? '100' : _num(_v['maxUsage'] ?? _v['maxUses']));
  late String _type = '${_v?['discountType'] ?? 'PERCENTAGE'}';
  // Prefilling 1970 for a voucher without expiry would expire it on save.
  late DateTime? _expires = _v == null ? DateTime.now() : parseDate(_v['expiresAt'] ?? _v['endDate']);
  late bool _public = _v?['isPublic'] != false;
  bool _saving = false;

  static String _num(dynamic v) => v == null || toNum(v) == 0 ? '' : '${toNum(v).round()}';

  @override
  void dispose() {
    for (final c in [_code, _name, _value, _maxDiscount, _minOrder, _maxUsage]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(context: context, initialDate: _expires ?? now, firstDate: DateTime(now.year - 1), lastDate: DateTime(now.year + 5));
    if (d == null || !mounted) return;
    final t = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_expires ?? now));
    setState(() => _expires = DateTime(d.year, d.month, d.day, t?.hour ?? 23, t?.minute ?? 59));
  }

  Future<void> _save() async {
    if (_code.text.trim().isEmpty || _name.text.trim().isEmpty) return Toast.error('Vui lòng điền mã và tên voucher');
    if (_expires == null) return Toast.error('Vui lòng chọn hạn sử dụng');
    final isEdit = _v != null;
    final payload = {
      'code': _code.text.toUpperCase().trim(),
      'name': _name.text.trim(),
      'discountType': _type,
      'discountValue': num.tryParse(_value.text) ?? 0,
      'minOrderValue': num.tryParse(_minOrder.text) ?? 0,
      'maxUsage': num.tryParse(_maxUsage.text) ?? 0,
      'maxDiscountAmount': num.tryParse(_maxDiscount.text) ?? 0,
      'expiresAt': _expires!.toUtc().toIso8601String(),
      'isPublic': _public,
    };
    setState(() => _saving = true);
    try {
      final pending = await _sendForApproval(isEdit ? 'PUT' : 'POST',
          isEdit ? '/api/marketing/admin/vouchers/${_v['id']}' : '/api/marketing/admin/vouchers',
          body: payload, fallbackError: 'Lỗi khi lưu voucher');
      // New vouchers from marketing staff wait in the store owner approval queue before going live;
      // edits of an approved voucher become a change request and the live voucher stays as it was.
      Toast.success(!isEdit
          ? 'Đã tạo voucher và gửi chủ cửa hàng phê duyệt'
          : pending
              ? 'Đã gửi yêu cầu sửa, voucher giữ nguyên đến khi chủ cửa hàng duyệt'
              : (_v['status'] == 'REVISION_REQUESTED' || _v['status'] == 'REJECTED')
                  ? 'Đã chỉnh sửa và gửi lại chủ cửa hàng phê duyệt'
                  : 'Cập nhật voucher thành công');
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không thể lưu voucher');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: Text(_v != null ? 'Chỉnh Sửa Voucher' : 'Tạo Voucher Mới', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: AppColors.slate200)),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _lbl('Mã Voucher', true),
            TextField(
              controller: _code,
              textCapitalization: TextCapitalization.characters,
              style: const TextStyle(fontFamily: 'monospace'),
              decoration: const InputDecoration(hintText: 'VD: SUMMER2026'),
            ),
            const SizedBox(height: 12),
            _lbl('Loại giảm giá'),
            _dropdown<String>(_type, const [('PERCENTAGE', 'Theo Phần Trăm (%)'), ('FIXED_AMOUNT', 'Số Tiền Cố Định (VND)'), ('FREE_SHIP', 'Miễn Phí Vận Chuyển')],
                (v) => setState(() => _type = v)),
            const SizedBox(height: 12),
            _lbl('Tên chương trình / Mô tả', true),
            TextField(controller: _name, decoration: const InputDecoration(hintText: 'VD: Giảm giá mùa hè cho đơn từ 500k')),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _lbl(_type == 'PERCENTAGE' ? 'Mức giảm (%)' : 'Số tiền giảm (VND)', true),
                  TextField(controller: _value, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '0')),
                ]),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _lbl('Giảm tối đa (VND)'),
                  TextField(
                    controller: _maxDiscount,
                    enabled: _type == 'PERCENTAGE',
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(hintText: '0 là không giới hạn'),
                  ),
                ]),
              ),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _lbl('Đơn hàng tối thiểu (VND)'),
                  TextField(controller: _minOrder, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '0')),
                ]),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _lbl('Số lượt dùng tối đa'),
                  TextField(controller: _maxUsage, keyboardType: TextInputType.number),
                ]),
              ),
            ]),
            const SizedBox(height: 12),
            _lbl('Hạn sử dụng', true),
            InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: const InputDecoration(suffixIcon: Icon(Icons.event, size: 18)),
                child: Text(_expires == null ? 'Chọn ngày giờ' : formatDateTime(_expires!.toIso8601String())),
              ),
            ),
            const SizedBox(height: 8),
            CheckboxListTile(
              value: _public,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              onChanged: (v) => setState(() => _public = v ?? true),
              title: const Text('Hiển thị công khai trong danh sách voucher khách hàng', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            ),
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
                  style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Đang lưu…' : (_v != null ? 'Cập nhật voucher' : 'Tạo voucher')),
                ),
              ),
            ]),
          ),
        ),
      );
}

// ─── Email campaigns ────────────────────────────────────────────────────────

String _pct(num a, num b) => b > 0 ? '${(a / b * 100).round()}%' : '-';

/// Port of web staff/dashboard/marketing/email/page.tsx (consented customers only).
class EmailCampaignsScreen extends StatefulWidget {
  const EmailCampaignsScreen({super.key});

  @override
  State<EmailCampaignsScreen> createState() => _EmailCampaignsScreenState();
}

class _EmailCampaignsScreenState extends State<EmailCampaignsScreen> {
  List<Map<String, dynamic>> _campaigns = [];
  List<Map<String, dynamic>> _segments = [];
  List<Map<String, dynamic>> _vouchers = [];
  int _subscribers = 0;
  final _name = TextEditingController(), _subject = TextEditingController(), _intro = TextEditingController();
  String _voucherId = '', _segment = 'ALL_SUBSCRIBERS';
  int? _audience;
  bool _busy = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    Api.instance.send('GET', '/api/marketing/vouchers').then((r) {
      if (mounted && r.ok) setState(() => _vouchers = asList(r.data).whereType<Map<String, dynamic>>().toList());
    }).catchError((_) {});
    _countAudience();
  }

  @override
  void dispose() {
    _poll?.cancel();
    for (final c in [_name, _subject, _intro]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await Api.instance.get('/api/staff/marketing/email-campaigns') as Map;
      setState(() {
        _campaigns = asList(d['campaigns']).whereType<Map<String, dynamic>>().toList();
        _segments = asList(d['segments']).whereType<Map<String, dynamic>>().toList();
        _subscribers = toInt(d['subscribers']);
      });
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không tải được chiến dịch');
    }
    // a campaign being sent finishes in the background: refresh until none is SENDING
    _poll?.cancel();
    if (_campaigns.any((c) => (c['campaign'] as Map?)?['status'] == 'SENDING')) {
      _poll = Timer(const Duration(seconds: 3), _load);
    }
  }

  Future<void> _countAudience() async {
    setState(() => _audience = null);
    try {
      final d = await Api.instance.get('/api/staff/marketing/email-campaigns/audience', query: {'segment': _segment});
      if (mounted) setState(() => _audience = toInt((d as Map)['count']));
    } catch (_) {}
  }

  Future<void> _create() async {
    if (_name.text.trim().isEmpty || _subject.text.trim().isEmpty) return Toast.error('Vui lòng nhập tên và tiêu đề email');
    setState(() => _busy = true);
    try {
      await Api.instance.post('/api/staff/marketing/email-campaigns', {
        'name': _name.text,
        'subject': _subject.text,
        'intro': _intro.text,
        'voucherId': _voucherId.isEmpty ? null : _voucherId,
        'segment': _segment,
      });
      Toast.success('Đã lưu chiến dịch nháp');
      _name.clear();
      _subject.clear();
      _intro.clear();
      _load();
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không lưu được');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send(Map<String, dynamic> c) async {
    final camp = c['campaign'] as Map;
    if (!await confirmDialog(context, 'Gửi chiến dịch', 'Gửi "${camp['name']}" tới nhóm "${c['segmentLabel']}"? Không thể hoàn tác.', confirm: 'Gửi')) return;
    try {
      await Api.instance.post('/api/staff/marketing/email-campaigns/${camp['id']}/send');
      Toast.success('Đang gửi…');
      _load();
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không gửi được');
    }
  }

  @override
  Widget build(BuildContext context) {
    return MarketingShell(
      path: '/staff/marketing/email',
      title: 'Chiến dịch email',
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Chỉ gửi cho khách đã đồng ý nhận email; mỗi email có link hủy đăng ký', style: TextStyle(fontSize: 13, color: AppColors.slate500)),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
              child: Row(children: [
                const Icon(Icons.people_outline, color: AppColors.slate500),
                const SizedBox(width: 10),
                Expanded(
                  child: Text.rich(TextSpan(style: const TextStyle(fontSize: 13, color: AppColors.slate700), children: [
                    TextSpan(text: '$_subscribers', style: const TextStyle(fontWeight: FontWeight.w700)),
                    const TextSpan(text: ' địa chỉ đang đồng ý nhận email ưu đãi.'),
                  ])),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Row(children: [
                  Icon(Icons.mail_outline, size: 17),
                  SizedBox(width: 6),
                  Text('Chiến dịch mới', style: TextStyle(fontWeight: FontWeight.w700)),
                ]),
                const SizedBox(height: 14),
                _lbl('Tên (nội bộ)'),
                TextField(controller: _name, maxLength: 150, decoration: const InputDecoration(counterText: '')),
                const SizedBox(height: 10),
                _lbl('Tiêu đề email'),
                TextField(controller: _subject, maxLength: 200, decoration: const InputDecoration(counterText: '')),
                const SizedBox(height: 10),
                _lbl('Nội dung mở đầu'),
                TextField(controller: _intro, maxLength: 2000, maxLines: 3, decoration: const InputDecoration(counterText: '')),
                const SizedBox(height: 10),
                _lbl('Voucher kèm theo (toàn hệ thống)'),
                _dropdown<String>(
                  _voucherId,
                  [('', 'Không kèm voucher'), for (final v in _vouchers) ('${v['id']}', '${v['code']} - ${v['name']}')],
                  (v) => setState(() => _voucherId = v),
                ),
                const SizedBox(height: 10),
                _lbl('Nhóm khách nhận'),
                _dropdown<String>(
                  _segments.any((s) => s['id'] == _segment) ? _segment : (_segments.isNotEmpty ? '${_segments.first['id']}' : _segment),
                  _segments.isEmpty ? [(_segment, 'Tất cả người đăng ký')] : [for (final s in _segments) ('${s['id']}', '${s['label']}')],
                  (v) {
                    setState(() => _segment = v);
                    _countAudience();
                  },
                ),
                const SizedBox(height: 4),
                Text(_audience == null ? 'Đang đếm…' : '$_audience người nhận nếu gửi bây giờ', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                const SizedBox(height: 14),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                    onPressed: _busy ? null : _create,
                    child: const Text('Lưu nháp'),
                  ),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            if (_campaigns.isEmpty)
              const StaffPanel(padding: EdgeInsets.all(24), child: Text('Chưa có chiến dịch nào.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate500)))
            else
              for (final c in _campaigns) _campaignTile(c),
            const SizedBox(height: 10),
            const Text(
              '* Số lượt mở là ước tính (một số ứng dụng mail tự tải ảnh hoặc chặn ảnh). “Đơn dùng mã” đếm người nhận đã dùng voucher sau khi email được gửi: cho thấy sự liên quan, không chứng minh email là nguyên nhân.',
              style: TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _campaignTile(Map<String, dynamic> c) {
    final camp = (c['campaign'] as Map?) ?? {};
    final stats = (c['stats'] as Map?) ?? {};
    final sent = toNum(stats['sent']);
    final status = camp['status'];
    final sentLabel = status == 'DRAFT'
        ? 'Nháp'
        : status == 'SENDING'
            ? 'Đang gửi…'
            : '${formatNumber(sent)}${toNum(stats['failed']) > 0 ? ' (lỗi ${stats['failed']})' : ''}';
    Widget cell(String label, String value) => Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
            Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ]),
        );
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${camp['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('${camp['subject'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
            ]),
          ),
          if (status == 'DRAFT')
            FilledButton.icon(
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary, visualDensity: VisualDensity.compact, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              onPressed: () => _send(c),
              icon: const Icon(Icons.send, size: 14),
              label: const Text('Gửi'),
            ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          cell('Nhóm', '${c['segmentLabel'] ?? ''}'),
          cell('Voucher', '${c['voucherCode'] ?? '-'}'),
          cell('Đã gửi', sentLabel),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          cell('Mở*', sent > 0 ? '${formatNumber(toNum(stats['opened']))} (${_pct(toNum(stats['opened']), sent)})' : '-'),
          cell('Đơn dùng mã*', c['voucherCode'] != null && sent > 0 ? '${stats['redeemedOrders']} · ${formatNumber(toNum(stats['redeemedRevenue']))}đ' : '-'),
          const Expanded(child: SizedBox()),
        ]),
      ]),
    );
  }
}
