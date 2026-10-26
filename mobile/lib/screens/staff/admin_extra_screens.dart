import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'crud_screen.dart';
import 'marketing_shell.dart';
import 'owner_extra_screens.dart' show slugify;
import 'staff_common.dart';

/// Admin pages beyond users/audit/monitoring (web admin/rbac, shops, categories, ai-config,
/// ai-feature-flags, mailing, logs, backup).

final _api = Api.instance;

List<Map<String, dynamic>> _rows(dynamic d) => asList(d).whereType<Map<String, dynamic>>().toList();

// ─── Branches ───────────────────────────────────────────────────────────────

class ShopsScreen extends StatelessWidget {
  const ShopsScreen({super.key});

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/admin/shops',
    title: 'Chi nhánh',
    noun: 'chi nhánh',
    searchHint: 'Tìm chi nhánh...',
    load: (_) async => _rows(await _api.get('/api/admin/shops')),
    itemTitle: (s) => '${s['name']}',
    itemLines: (s) => [(Icons.place_outlined, '${s['address'] ?? ''}'), (Icons.phone_outlined, '${s['phone'] ?? ''}')],
    badge: (s) => activeBadge(s['isActive'] != false),
    fields: (s) => [
      FormFieldSpec('name', 'Tên chi nhánh', initial: '${s?['name'] ?? ''}', required: true),
      FormFieldSpec('address', 'Địa chỉ', initial: '${s?['address'] ?? ''}', lines: 2),
      FormFieldSpec('phone', 'Số điện thoại', initial: '${s?['phone'] ?? ''}', type: TextInputType.phone),
      boolField('isActive', 'Trạng thái', s?['isActive'] != false),
    ],
    save: (s, v) {
      final body = {
        'name': v['name'],
        'address': v['address']!.isEmpty ? null : v['address'],
        'phone': v['phone']!.isEmpty ? null : v['phone'],
        'isActive': v['isActive'] == 'true',
      };
      return s == null ? _api.post('/api/admin/shops', body) : _api.put('/api/admin/shops/${s['id']}', body);
    },
  );
}

// ─── System-wide categories (tree) ──────────────────────────────────────────

class AdminCategoriesScreen extends StatefulWidget {
  const AdminCategoriesScreen({super.key});

  @override
  State<AdminCategoriesScreen> createState() => _AdminCategoriesScreenState();
}

class _AdminCategoriesScreenState extends State<AdminCategoriesScreen> {
  List<Map<String, dynamic>> _flat = [];

  /// Tree -> flat list in display order, each row tagged with its depth and children count.
  List<Map<String, dynamic>> _flatten(List nodes, int depth) => [
    for (final n in nodes.whereType<Map<String, dynamic>>()) ...[
      {...n, '_depth': depth, '_children': asList(n['children']).length},
      ..._flatten(asList(n['children']), depth + 1),
    ],
  ];

  List<FormFieldSpec> _fields(Map<String, dynamic>? c) => [
    FormFieldSpec('name', 'Tên danh mục', initial: '${c?['name'] ?? ''}', required: true),
    FormFieldSpec('slug', 'Slug (để trống sẽ tự tạo)', initial: '${c?['slug'] ?? ''}'),
    if (c == null)
      FormFieldSpec(
        'parentId',
        'Danh mục cha',
        options: [
          ('', 'Không có (cấp gốc)'),
          for (final p in _flat.where((p) => toInt(p['_depth']) < 2)) ('${p['id']}', '${'— ' * toInt(p['_depth'])}${p['name']}'),
        ],
      ),
    FormFieldSpec('displayOrder', 'Thứ tự hiển thị', initial: '${c?['displayOrder'] ?? 0}', type: TextInputType.number),
    FormFieldSpec('imageUrl', 'Ảnh (đường dẫn)', initial: '${c?['imageUrl'] ?? ''}', type: TextInputType.url),
    FormFieldSpec('description', 'Mô tả', initial: '${c?['description'] ?? ''}', lines: 2),
    boolField('active', 'Hiển thị', c?['active'] != false, on: 'Đang hiển thị', off: 'Ẩn'),
  ];

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/admin/categories',
    title: 'Danh mục toàn hệ thống',
    noun: 'danh mục',
    searchHint: 'Tìm danh mục...',
    load: (_) async => _flat = _flatten(asList(await _api.get('/api/admin/categories/tree')), 0),
    searchText: (c) => '${c['name']} ${c['slug']}',
    itemTitle: (c) => '${'— ' * toInt(c['_depth'])}${c['name']}',
    itemLines: (c) => [
      (Icons.link, '/${c['slug'] ?? ''}'),
      if (toInt(c['_children']) > 0) (Icons.account_tree_outlined, '${c['_children']} danh mục con'),
    ],
    badge: (c) => activeBadge(c['active'] != false, off: 'Đang ẩn'),
    fields: _fields,
    save: (c, v) {
      final body = {
        'name': v['name'],
        'slug': v['slug']!.isEmpty ? slugify(v['name']!) : v['slug'],
        'description': v['description'],
        'imageUrl': v['imageUrl'],
        'parentId': c != null ? c['parentId'] : (v['parentId']!.isEmpty ? null : int.parse(v['parentId']!)),
        'displayOrder': int.tryParse(v['displayOrder']!) ?? 0,
        'active': v['active'] == 'true',
      };
      return c == null ? _api.post('/api/admin/categories', body) : _api.put('/api/admin/categories/${c['id']}', body);
    },
    deleteBlocker: (c) async => toInt(c['_children']) > 0 ? 'Danh mục còn ${c['_children']} danh mục con, hãy xóa hoặc chuyển chúng trước' : null,
    delete: (c) => _api.delete('/api/admin/categories/${c['id']}'),
  );
}

// ─── Feature flags ──────────────────────────────────────────────────────────

class FeatureFlagsScreen extends StatelessWidget {
  const FeatureFlagsScreen({super.key});

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/admin/feature-flags',
    title: 'Cờ tính năng AI',
    noun: 'cờ tính năng',
    searchHint: 'Tìm theo khóa...',
    intro: 'Bật / tắt các tính năng gợi ý và AI mà không cần triển khai lại.',
    editable: false,
    load: (_) async => _rows(await _api.get('/api/admin/feature-flags')),
    searchText: (f) => '${f['key']} ${f['description']}',
    itemTitle: (f) => '${f['key']}',
    itemLines: (f) => [
      (Icons.notes, '${f['description'] ?? ''}'),
      if (f['updatedAt'] != null) (Icons.schedule, 'Cập nhật ${formatDateTime(f['updatedAt'])}'),
    ],
    badge: (f) => ToneBadge(f['enabled'] == true ? 'Đang bật' : 'Đang tắt', tone: f['enabled'] == true ? 'green' : 'gray'),
    fields: (_) => [
      const FormFieldSpec('key', 'Khóa (VD: RECOMMENDATION_V2)', required: true),
      const FormFieldSpec('description', 'Mô tả', lines: 2),
      boolField('enabled', 'Trạng thái', true, on: 'Bật', off: 'Tắt'),
    ],
    save: (_, v) {
      final key = v['key']!.trim().toUpperCase().replaceAll(RegExp(r'[^A-Z0-9_]+'), '_');
      return _api.post('/api/admin/feature-flags', {'key': key, 'description': v['description'], 'enabled': v['enabled'] == 'true'});
    },
    actions: [
      (
        'Bật / tắt',
        Icons.toggle_on_outlined,
        (f) => runAction(
          () => _api.post('/api/admin/feature-flags/${f['key']}', {'enabled': f['enabled'] != true}),
          f['enabled'] == true ? 'Đã tắt ${f['key']}' : 'Đã bật ${f['key']}',
        ),
      ),
    ],
    delete: (f) => _api.delete('/api/admin/feature-flags/${f['key']}'),
  );
}

// ─── AI model versions ──────────────────────────────────────────────────────

class AiModelsScreen extends StatelessWidget {
  const AiModelsScreen({super.key});

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/admin/ai-models',
    title: 'Mô hình AI',
    noun: 'phiên bản mô hình',
    searchHint: 'Tìm mô hình...',
    intro: 'Mỗi mô hình chỉ có một phiên bản đang dùng; kích hoạt phiên bản khác sẽ thay thế phiên bản hiện tại.',
    editable: false,
    load: (_) async => _rows(await _api.get('/api/admin/model-versions'))..sort((a, b) => '${b['createdAt']}'.compareTo('${a['createdAt']}')),
    searchText: (m) => '${m['modelName']} ${m['version']} ${m['description']}',
    itemTitle: (m) => '${m['modelName']} · ${m['version']}',
    itemLines: (m) => [(Icons.notes, '${m['description'] ?? ''}'), (Icons.schedule, formatDateTime(m['createdAt']))],
    badge: (m) => m['active'] == true ? const ToneBadge('Đang dùng', tone: 'green') : null,
    fields: (_) => [
      const FormFieldSpec('modelName', 'Tên mô hình', required: true, hint: 'sasrec'),
      const FormFieldSpec('version', 'Phiên bản', required: true, hint: 'v2'),
      const FormFieldSpec('description', 'Mô tả', lines: 2),
      boolField('active', 'Kích hoạt ngay', false, on: 'Có', off: 'Không'),
    ],
    save: (_, v) => _api.post('/api/admin/model-versions', {...v, 'active': v['active'] == 'true'}),
    actions: [
      (
        'Kích hoạt phiên bản này',
        Icons.play_circle_outline,
        (m) async {
          if (m['active'] == true) return Toast.info('Phiên bản này đang được dùng');
          await runAction(() => _api.post('/api/admin/model-versions/${m['id']}/activate', {}), 'Đã kích hoạt ${m['modelName']} ${m['version']}');
        },
      ),
    ],
  );
}

// ─── Roles & permissions ────────────────────────────────────────────────────

const _protectedRoles = ['ADMIN', 'SHOP_OWNER', 'USER', 'STAFF'];
const _permGroups = {
  'ADMIN': 'Quản trị Hệ thống',
  'SHOP_OWNER': 'Chủ cửa hàng & Chi nhánh',
  'SALES_STAFF': 'Bán hàng & Đơn hàng',
  'CSKH_STAFF': 'Chăm sóc Khách hàng (CSKH)',
  'WAREHOUSE_STAFF': 'Kho vận & Tồn kho',
  'SHIPPING_STAFF': 'Vận chuyển & Vận đơn',
  'MARKETING_STAFF': 'Marketing & Khuyến mãi',
  'OTHER': 'Quyền chung',
};

class RbacScreen extends StatefulWidget {
  const RbacScreen({super.key});

  @override
  State<RbacScreen> createState() => _RbacScreenState();
}

class _RbacScreenState extends State<RbacScreen> {
  final _loader = GlobalKey<LoaderState<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>>();
  String? _role;
  String _q = '';
  String? _busy;

  Future<void> _toggle(Map role, String perm, bool has) async {
    setState(() => _busy = perm);
    await runAction(
      () => has
          ? _api.delete('/api/admin/rbac/roles/${role['code']}/permissions/$perm')
          : _api.post('/api/admin/rbac/roles/${role['code']}/permissions', {'permission': perm}),
      has ? 'Đã thu hồi quyền $perm' : 'Đã cấp quyền $perm',
    );
    if (mounted) setState(() => _busy = null);
    await _loader.currentState?.reload();
  }

  Future<void> _createRole() async {
    final r = await formSheet(
      context,
      title: 'Tạo vai trò',
      fields: const [
        FormFieldSpec('code', 'Mã vai trò (VD: INVENTORY_AUDITOR)', required: true),
        FormFieldSpec('name', 'Tên hiển thị', required: true),
        FormFieldSpec('description', 'Mô tả', lines: 2),
      ],
      confirm: 'Tạo',
      submit: (v) => _api.post('/api/admin/rbac/roles', {
        'code': v['code']!.trim().toUpperCase().replaceAll(RegExp(r'[^A-Z0-9_]+'), '_'),
        'name': v['name'],
        'description': v['description'],
      }),
    );
    if (r != null) {
      Toast.success('Đã tạo vai trò');
      await _loader.currentState?.reload();
    }
  }

  Future<void> _deleteRole(Map role) async {
    if (!await confirmDialog(
      context,
      'Xóa vai trò',
      'Xóa vai trò ${role['code']}? Tài khoản đang dùng vai trò này có thể mất quyền truy cập.',
      confirm: 'Xóa',
    )) {
      return;
    }
    await runAction(() => _api.delete('/api/admin/rbac/roles/${role['code']}'), 'Đã xóa vai trò');
    setState(() => _role = null);
    await _loader.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/admin/rbac',
    title: 'Phân quyền (RBAC)',
    actions: [IconButton(tooltip: 'Tạo vai trò', onPressed: _createRole, icon: const Icon(Icons.add))],
    body: Loader<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>(
      key: _loader,
      load: () async {
        final r = await Future.wait([_api.get('/api/admin/rbac/roles'), _api.get('/api/admin/rbac/permissions')]);
        return (_rows(r[0]), _rows(r[1]));
      },
      builder: (context, data, reload) {
        final (roles, catalog) = data;
        if (roles.isEmpty) return const EmptyPanel(icon: Icons.admin_panel_settings_outlined, title: 'Chưa có vai trò');
        final role = roles.firstWhere((r) => r['code'] == _role, orElse: () => roles.first);
        final has = asList(role['permissions']).map((e) => '$e').toSet();
        final q = _q.toLowerCase();
        final perms = catalog.where((p) => q.isEmpty || '${p['code']} ${p['name']} ${p['description']}'.toLowerCase().contains(q)).toList();
        final groups = <String, List<Map<String, dynamic>>>{};
        for (final p in perms) {
          groups.putIfAbsent('${p['group'] ?? 'OTHER'}', () => []).add(p);
        }
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const FieldLabel('Vai trò'),
            DropdownButtonFormField<String>(
              initialValue: '${role['code']}',
              isExpanded: true,
              decoration: InputDecoration(isDense: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
              items: [for (final r in roles) DropdownMenuItem(value: '${r['code']}', child: Text('${r['name'] ?? r['code']} (${r['code']})'))],
              onChanged: (v) => setState(() => _role = v),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${has.length} quyền · ${role['description'] ?? ''}',
                    style: const TextStyle(fontSize: 12.5, color: AppColors.slate600),
                  ),
                ),
                if (!_protectedRoles.contains(role['code']))
                  TextButton.icon(
                    onPressed: () => _deleteRole(role),
                    icon: const Icon(Icons.delete_outline, size: 18),
                    label: const Text('Xóa vai trò'),
                  ),
              ],
            ),
            if (role['code'] == 'ADMIN') const NoticeBox('Vai trò ADMIN luôn có toàn quyền; bật / tắt ở đây chỉ để hiển thị.'),
            const SizedBox(height: 10),
            StaffSearch(hint: 'Tìm quyền...', onChanged: (v) => setState(() => _q = v)),
            for (final e in groups.entries) ...[
              SectionLabel(_permGroups[e.key] ?? e.key),
              AppCard(
                radius: 14,
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    for (final p in e.value)
                      SwitchListTile(
                        dense: true,
                        title: Text('${p['name'] ?? p['code']}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                        subtitle: Text(
                          '${p['code']}${'${p['description'] ?? ''}'.isNotEmpty ? ' · ${p['description']}' : ''}',
                          style: const TextStyle(fontSize: 11.5),
                        ),
                        value: has.contains(p['code']),
                        activeThumbColor: AppColors.slate900,
                        onChanged: _busy != null ? null : (_) => _toggle(role, '${p['code']}', has.contains(p['code'])),
                      ),
                  ],
                ),
              ),
            ],
          ],
        );
      },
    ),
  );
}

// ─── Email log ──────────────────────────────────────────────────────────────

class MailingLogsScreen extends StatefulWidget {
  const MailingLogsScreen({super.key});

  @override
  State<MailingLogsScreen> createState() => _MailingLogsScreenState();
}

class _MailingLogsScreenState extends State<MailingLogsScreen> {
  final _loader = GlobalKey<LoaderState<Map<String, dynamic>>>();
  String _status = '';
  String _q = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<Map<String, dynamic>> _load() async {
    final p = {'page': '0', 'size': '50', if (_q.trim().isNotEmpty) 'search': _q.trim()};
    if (_status == 'SEEN') {
      p.addAll({'status': 'SENT', 'opened': 'yes'});
    } else if (_status.isNotEmpty) {
      p['status'] = _status;
    }
    final qs = Uri(queryParameters: p).query;
    dynamic res;
    try {
      res = await _api.get('/api/admin/mailing/logs?$qs');
    } catch (_) {
      res = await _api.get('/api/admin/email-logs?$qs'); // legacy path
    }
    return res is Map<String, dynamic> ? res : {'content': res};
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/admin/mailing',
    title: 'Nhật ký email',
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(
            children: [
              StaffSearch(
                hint: 'Tìm người nhận, tiêu đề...',
                onChanged: (v) {
                  _q = v;
                  _debounce?.cancel();
                  _debounce = Timer(const Duration(milliseconds: 400), () => _loader.currentState?.reload());
                },
              ),
              const SizedBox(height: 10),
              FilterTabs(
                tabs: const [('', 'Tất cả'), ('SENT', 'Đã gửi'), ('SEEN', 'Đã mở'), ('FAILED', 'Thất bại'), ('PENDING', 'Đang chờ')],
                value: _status,
                activeColor: AppColors.slate900,
                onChanged: (v) {
                  setState(() => _status = v);
                  _loader.currentState?.reload();
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: Loader<Map<String, dynamic>>(
            key: _loader,
            load: _load,
            builder: (context, d, reload) {
              final logs = asList(d['content'] ?? d['items']).whereType<Map>().toList();
              final s = (d['summary'] as Map?) ?? const {};
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (s.isNotEmpty) ...[
                    StatGrid([
                      StatTile(label: 'Tổng', value: '${toInt(s['total'])}', icon: Icons.mail_outline),
                      StatTile(label: 'Đã gửi', value: '${toInt(s['sent'])}', icon: Icons.send),
                      StatTile(label: 'Thất bại', value: '${toInt(s['failed'])}', icon: Icons.error_outline, alert: toInt(s['failed']) > 0),
                    ]),
                    const SizedBox(height: 12),
                  ],
                  if (logs.isEmpty) const EmptyPanel(icon: Icons.mail_outline, title: 'Không có email nào'),
                  for (final l in logs)
                    RecordCard(
                      accent: l['status'] == 'FAILED' ? const Color(0xFFFECACA) : null,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text('${l['subject'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                              ),
                              ToneBadge(
                                const {'SENT': 'Đã gửi', 'FAILED': 'Thất bại', 'PENDING': 'Đang chờ'}[l['status']] ?? '${l['status']}',
                                tone: switch (l['status']) {
                                  'SENT' => 'green',
                                  'FAILED' => 'red',
                                  _ => 'amber',
                                },
                              ),
                            ],
                          ),
                          InfoLine(Icons.person_outline, '${l['recipient'] ?? l['recipientEmail'] ?? ''}'),
                          if (l['type'] != null || l['emailType'] != null) InfoLine(Icons.label_outline, '${l['type'] ?? l['emailType']}'),
                          InfoLine(Icons.schedule, formatDateTime(l['sentAt'] ?? l['createdAt'])),
                          if (l['openedAt'] != null) InfoLine(Icons.drafts_outlined, 'Đã mở ${formatDateTime(l['openedAt'])}'),
                          if ('${l['errorMessage'] ?? ''}'.isNotEmpty) InfoLine(Icons.error_outline, '${l['errorMessage']}'),
                          if (l['status'] == 'FAILED')
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton.icon(
                                onPressed: () async {
                                  await runAction(() => _api.post('/api/admin/email-logs/${l['id']}/retry', {}), 'Đã gửi lại email');
                                  await _loader.currentState?.reload();
                                },
                                icon: const Icon(Icons.refresh, size: 18),
                                label: const Text('Gửi lại'),
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ],
    ),
  );
}

// ─── Server log ─────────────────────────────────────────────────────────────

class ServerLogsScreen extends StatefulWidget {
  const ServerLogsScreen({super.key});

  @override
  State<ServerLogsScreen> createState() => _ServerLogsScreenState();
}

class _ServerLogsScreenState extends State<ServerLogsScreen> {
  final _loader = GlobalKey<LoaderState<Map<String, dynamic>>>();
  String _level = 'ALL';

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/admin/logs',
    title: 'Nhật ký máy chủ',
    actions: [IconButton(tooltip: 'Tải lại', onPressed: () => _loader.currentState?.reload(), icon: const Icon(Icons.refresh))],
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: FilterTabs(
            tabs: const [('ALL', 'Tất cả'), ('ERROR', 'ERROR'), ('WARN', 'WARN'), ('INFO', 'INFO')],
            value: _level,
            activeColor: AppColors.slate900,
            onChanged: (v) {
              setState(() => _level = v);
              _loader.currentState?.reload();
            },
          ),
        ),
        Expanded(
          child: Loader<Map<String, dynamic>>(
            key: _loader,
            load: () async => Map<String, dynamic>.from(await _api.get('/api/admin/logs?limit=200${_level == 'ALL' ? '' : '&level=$_level'}') as Map),
            builder: (context, d, reload) {
              final lines = asList(d['lines']).reversed.toList();
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (d['file'] != null) InfoLine(Icons.description_outlined, '${d['file']}'),
                  const SizedBox(height: 8),
                  if (lines.isEmpty) const EmptyPanel(icon: Icons.terminal, title: 'Không có dòng log nào'),
                  for (final l in lines)
                    Builder(
                      builder: (context) {
                        final text = l is Map ? '${l['raw'] ?? l['message'] ?? l}' : '$l';
                        final lvl = l is Map ? '${l['level'] ?? ''}' : (RegExp(r'\b(ERROR|WARN|INFO|DEBUG)\b').firstMatch(text)?.group(1) ?? '');
                        return Container(
                          margin: const EdgeInsets.only(bottom: 4),
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: lvl == 'ERROR' ? AppColors.red50 : (lvl == 'WARN' ? const Color(0xFFFFFBEB) : Colors.white),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.slate100),
                          ),
                          child: Text(text, style: const TextStyle(fontFamily: 'monospace', fontSize: 11, height: 1.35)),
                        );
                      },
                    ),
                ],
              );
            },
          ),
        ),
      ],
    ),
  );
}

// ─── Backup & restore ───────────────────────────────────────────────────────

class BackupScreen extends StatefulWidget {
  const BackupScreen({super.key});

  @override
  State<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends State<BackupScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  bool _creating = false;

  Future<void> _create() async {
    setState(() => _creating = true);
    await runAction(() => _api.post('/api/admin/backup/create', {}), 'Đã tạo bản sao lưu');
    if (mounted) setState(() => _creating = false);
    await _loader.currentState?.reload();
  }

  Future<void> _restore(Map b) async {
    final r = await formSheet(
      context,
      title: 'Khôi phục dữ liệu',
      subtitle:
          'Toàn bộ dữ liệu hiện tại sẽ bị thay bằng bản sao lưu ${b['fileName']} (${formatDateTime(b['createdAt'])}). '
          'Không thể hoàn tác. Gõ KHOI PHUC để xác nhận.',
      fields: const [FormFieldSpec('confirm', 'Xác nhận', required: true, hint: 'KHOI PHUC')],
      confirm: 'Khôi phục',
      danger: true,
      submit: (v) {
        if (v['confirm']!.trim().toUpperCase() != 'KHOI PHUC') throw ApiException('Gõ đúng "KHOI PHUC" để xác nhận');
        return _api.post('/api/admin/backup/restore/${b['fileName']}', {});
      },
    );
    if (r != null) Toast.success('Đã khôi phục từ ${b['fileName']}');
  }

  Future<void> _delete(Map b) async {
    if (!await confirmDialog(context, 'Xóa bản sao lưu', 'Xóa ${b['fileName']}?', confirm: 'Xóa')) return;
    await runAction(() => _api.delete('/api/admin/backup/${b['fileName']}'), 'Đã xóa bản sao lưu');
    await _loader.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/admin/backup',
    title: 'Sao lưu & khôi phục',
    body: Loader<List<Map<String, dynamic>>>(
      key: _loader,
      load: () async => _rows(await _api.get('/api/admin/backup')),
      builder: (context, list, reload) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StaffButton(
            'Tạo bản sao lưu ngay',
            expand: true,
            height: 46,
            icon: Icons.backup_outlined,
            loading: _creating,
            onPressed: _creating ? null : _create,
          ),
          const SizedBox(height: 8),
          const Text('Tải file sao lưu về máy thực hiện trên bản web.', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
          const SectionLabel('Các bản sao lưu'),
          if (list.isEmpty) const EmptyPanel(icon: Icons.backup_outlined, title: 'Chưa có bản sao lưu'),
          for (final b in list)
            RecordCard(
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${b['fileName']}',
                          style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700, fontSize: 12.5),
                        ),
                        InfoLine(Icons.schedule, '${formatDateTime(b['createdAt'])} · ${b['sizeFormatted'] ?? ''}'),
                        InfoLine(Icons.label_outline, b['type'] == 'SCHEDULED' ? 'Tự động' : 'Thủ công'),
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 20, color: AppColors.slate400),
                    onSelected: (a) => a == 'restore' ? _restore(b) : _delete(b),
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'restore', child: Text('Khôi phục từ bản này')),
                      PopupMenuItem(
                        value: 'delete',
                        child: Text('Xóa', style: TextStyle(color: AppColors.red600)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    ),
  );
}
