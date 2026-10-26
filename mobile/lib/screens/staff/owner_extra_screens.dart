import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../widgets/common.dart';
import 'crud_screen.dart';
import 'owner_admin_screens.dart' show roleLabel;
import 'staff_common.dart';

/// Store-owner catalog and admin pages (web store-owner/categories, manufacturers, suppliers,
/// shifts, logs) on top of [CrudScreen].

final _api = Api.instance;

List<Map<String, dynamic>> _rows(dynamic d) => asList(d).whereType<Map<String, dynamic>>().toList();

String? _blankToNull(String? v) => v == null || v.trim().isEmpty ? null : v.trim();

const _vnFrom = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
const _vnTo = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';

/// "Áo thun Nam" -> "ao-thun-nam" (same rule as the web slug helper).
String slugify(String s) {
  final lower = s.toLowerCase();
  final b = StringBuffer();
  for (final ch in lower.split('')) {
    final i = _vnFrom.indexOf(ch);
    b.write(i >= 0 ? _vnTo[i] : ch);
  }
  return b.toString().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-+|-+$'), '');
}

// ─── Categories ─────────────────────────────────────────────────────────────

class OwnerCategoriesScreen extends StatefulWidget {
  const OwnerCategoriesScreen({super.key});

  @override
  State<OwnerCategoriesScreen> createState() => _OwnerCategoriesScreenState();
}

class _OwnerCategoriesScreenState extends State<OwnerCategoriesScreen> {
  List<Map<String, dynamic>> _all = [];

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/owner/categories',
    title: 'Danh mục sản phẩm',
    noun: 'danh mục',
    searchHint: 'Tìm danh mục...',
    load: (_) async => _all = _rows(await _api.get('/api/store-owner/categories?page=0&size=200')),
    searchText: (c) => '${c['name']} ${c['slug']} ${c['parentName'] ?? ''}',
    itemTitle: (c) => '${c['name']}',
    itemLines: (c) => [
      (Icons.link, '/${c['slug'] ?? ''}'),
      if (c['parentName'] != null) (Icons.subdirectory_arrow_right, 'Thuộc: ${c['parentName']}'),
      if ('${c['description'] ?? ''}'.isNotEmpty) (Icons.notes, '${c['description']}'),
    ],
    badge: (c) => activeBadge(c['active'] != false, off: 'Đang ẩn'),
    fields: (c) => [
      FormFieldSpec('name', 'Tên danh mục', initial: '${c?['name'] ?? ''}', required: true),
      FormFieldSpec('slug', 'Slug (để trống sẽ tự tạo)', initial: '${c?['slug'] ?? ''}'),
      FormFieldSpec(
        'parentId',
        'Danh mục cha',
        initial: '${c?['parentId'] ?? ''}',
        options: [
          ('', 'Không có (cấp gốc)'),
          for (final p in _all.where((p) => p['parentId'] == null && p['id'] != c?['id'])) ('${p['id']}', '${p['name']}'),
        ],
      ),
      FormFieldSpec('displayOrder', 'Thứ tự hiển thị', initial: '${c?['displayOrder'] ?? 0}', type: TextInputType.number),
      FormFieldSpec('description', 'Mô tả', initial: '${c?['description'] ?? ''}', lines: 2),
      boolField('active', 'Hiển thị', c?['active'] != false, on: 'Đang hiển thị', off: 'Ẩn'),
    ],
    save: (c, v) {
      final body = {
        'name': v['name'],
        'slug': v['slug']!.isEmpty ? slugify(v['name']!) : v['slug'],
        'description': _blankToNull(v['description']),
        'parentId': v['parentId']!.isEmpty ? null : int.parse(v['parentId']!),
        'displayOrder': int.tryParse(v['displayOrder']!) ?? 0,
        'active': v['active'] == 'true',
        // the update endpoint overwrites imageUrl, so send the current one back
        'imageUrl': c?['imageUrl'],
      };
      return c == null ? _api.post('/api/store-owner/categories', body) : _api.put('/api/store-owner/categories/${c['id']}', body);
    },
    deleteBlocker: (c) async {
      final d = await _api.get('/api/store-owner/categories/${c['id']}/delete-check') as Map;
      if (d['canDelete'] == true) return null;
      return '${d['reason'] ?? 'Không thể xóa'} (${d['childCount'] ?? 0} danh mục con, ${d['productCount'] ?? 0} sản phẩm)';
    },
    delete: (c) => _api.delete('/api/store-owner/categories/${c['id']}'),
  );
}

// ─── Manufacturers ──────────────────────────────────────────────────────────

class ManufacturersScreen extends StatelessWidget {
  const ManufacturersScreen({super.key});

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/owner/manufacturers',
    title: 'Nhà sản xuất',
    noun: 'nhà sản xuất',
    searchHint: 'Tìm nhà sản xuất...',
    serverSearch: true,
    load: (q) async => _rows(await _api.get('/api/manufacturers?page=0&size=200&keyword=${Uri.encodeQueryComponent(q)}')),
    itemTitle: (m) => '${m['name']}',
    itemLines: (m) => [
      (Icons.public, '${m['country'] ?? ''}'),
      (Icons.mail_outline, '${m['contactEmail'] ?? ''}'),
      (Icons.language, '${m['website'] ?? ''}'),
      if (m['productCount'] != null) (Icons.checkroom, '${m['productCount']} sản phẩm'),
    ],
    fields: (m) => [
      FormFieldSpec('name', 'Tên nhà sản xuất', initial: '${m?['name'] ?? ''}', required: true),
      FormFieldSpec('contactEmail', 'Email liên hệ', initial: '${m?['contactEmail'] ?? ''}', type: TextInputType.emailAddress),
      FormFieldSpec('country', 'Quốc gia', initial: '${m?['country'] ?? 'Việt Nam'}'),
      FormFieldSpec('website', 'Website', initial: '${m?['website'] ?? ''}', type: TextInputType.url),
      FormFieldSpec('description', 'Mô tả', initial: '${m?['description'] ?? ''}', lines: 2),
    ],
    save: (m, v) {
      final email = v['contactEmail']!;
      if (email.isNotEmpty && !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) throw ApiException('Email không đúng định dạng');
      final body = {
        'name': v['name'],
        'contactEmail': email,
        'country': v['country']!.isEmpty ? 'Việt Nam' : v['country'],
        'website': v['website'],
        'description': v['description'],
      };
      return m == null ? _api.post('/api/manufacturers', body) : _api.put('/api/manufacturers/${m['id']}', body);
    },
    deleteBlocker: (m) async => toInt(m['productCount']) > 0 ? 'Nhà sản xuất đang có ${m['productCount']} sản phẩm, không thể xóa' : null,
    delete: (m) => _api.delete('/api/manufacturers/${m['id']}'),
  );
}

// ─── Suppliers ──────────────────────────────────────────────────────────────

class SuppliersScreen extends StatelessWidget {
  const SuppliersScreen({super.key});

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/owner/suppliers',
    title: 'Nhà cung cấp',
    noun: 'nhà cung cấp',
    searchHint: 'Tìm nhà cung cấp...',
    serverSearch: true,
    load: (q) async => _rows(await _api.get('/api/suppliers?page=0&size=200&keyword=${Uri.encodeQueryComponent(q)}')),
    itemTitle: (s) => '${s['name']}',
    itemLines: (s) => [
      (Icons.phone_outlined, '${s['phone'] ?? ''}'),
      (Icons.mail_outline, '${s['email'] ?? ''}'),
      (Icons.category_outlined, '${s['productType'] ?? ''}'),
      (Icons.place_outlined, '${s['address'] ?? ''}'),
    ],
    fields: (s) => [
      FormFieldSpec('name', 'Tên nhà cung cấp', initial: '${s?['name'] ?? ''}', required: true),
      FormFieldSpec('phone', 'Số điện thoại', initial: '${s?['phone'] ?? ''}', required: true, type: TextInputType.phone),
      FormFieldSpec('email', 'Email', initial: '${s?['email'] ?? ''}', required: true, type: TextInputType.emailAddress),
      FormFieldSpec('productType', 'Mặt hàng cung cấp', initial: '${s?['productType'] ?? ''}', required: true),
      FormFieldSpec('address', 'Địa chỉ', initial: '${s?['address'] ?? ''}', required: true, lines: 2),
      FormFieldSpec('description', 'Ghi chú', initial: '${s?['description'] ?? ''}', lines: 2),
    ],
    save: (s, v) {
      final phone = v['phone']!.replaceAll(RegExp(r'[\s.()-]'), '');
      if (!RegExp(r'^\+?[0-9]{8,15}$').hasMatch(phone)) throw ApiException('Số điện thoại không hợp lệ');
      if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v['email']!)) throw ApiException('Email không đúng định dạng');
      final body = {...v, 'phone': phone};
      return s == null ? _api.post('/api/suppliers', body) : _api.put('/api/suppliers/${s['id']}', body);
    },
    deleteBlocker: (s) async {
      final d = await _api.get('/api/suppliers/${s['id']}/delete-check');
      return d is Map && d['canDelete'] == false ? '${d['reason'] ?? 'Nhà cung cấp đang được sử dụng, không thể xóa'}' : null;
    },
    delete: (s) => _api.delete('/api/suppliers/${s['id']}'),
  );
}

// ─── Work shifts ────────────────────────────────────────────────────────────

const _shiftTypes = ['Ca Sáng (08:00 - 16:00)', 'Ca Chiều (14:00 - 22:00)', 'Ca Full (08:00 - 21:00)'];

class ShiftsScreen extends StatefulWidget {
  const ShiftsScreen({super.key});

  @override
  State<ShiftsScreen> createState() => _ShiftsScreenState();
}

class _ShiftsScreenState extends State<ShiftsScreen> {
  List<Map<String, dynamic>> _staff = [];
  List<Map<String, dynamic>> _shifts = [];

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/owner/shifts',
    title: 'Lịch làm việc & xếp ca',
    noun: 'ca làm việc',
    searchHint: 'Tìm nhân viên, ngày...',
    editable: false,
    load: (_) async {
      final r = await Future.wait([_api.get('/api/store-owner/work-shifts'), _api.get('/api/store-owner/staff')]);
      _staff = _rows(r[1]).where((u) => u['status'] == 'ACTIVE' && u['role'] != 'SHOP_OWNER').toList();
      return _shifts = _rows(r[0])..sort((a, b) => '${b['shiftDate']}'.compareTo('${a['shiftDate']}'));
    },
    searchText: (s) => '${s['userName']} ${s['userEmail']} ${s['shiftDate']} ${s['shiftType']}',
    itemTitle: (s) => '${s['userName'] ?? s['userEmail']}',
    itemLines: (s) => [
      (Icons.event, '${formatDate(s['shiftDate'])} · ${s['shiftType'] ?? ''}'),
      (Icons.mail_outline, '${s['userEmail'] ?? ''}${s['role'] != null ? ' · ${roleLabel[s['role']] ?? s['role']}' : ''}'),
    ],
    fields: (_) => [
      FormFieldSpec(
        'userEmail',
        'Nhân viên',
        required: true,
        options: [for (final u in _staff) ('${u['email']}'.toLowerCase(), '${u['fullName']} (${roleLabel[u['role']] ?? u['role']})')],
      ),
      FormFieldSpec('shiftDate', 'Ngày làm (yyyy-mm-dd)', initial: isoLocal(DateTime.now()).substring(0, 10), required: true),
      FormFieldSpec('shiftType', 'Ca làm việc', options: [for (final t in _shiftTypes) (t, t)]),
    ],
    save: (_, v) {
      if (DateTime.tryParse(v['shiftDate']!) == null) throw ApiException('Ngày làm không đúng định dạng yyyy-mm-dd');
      final dup = _shifts.any(
        (s) => '${s['userEmail']}'.toLowerCase() == v['userEmail'] && s['shiftDate'] == v['shiftDate'] && s['shiftType'] == v['shiftType'],
      );
      if (dup) throw ApiException('Nhân viên này đã được xếp ca đó vào ngày ${v['shiftDate']}');
      return _api.post('/api/store-owner/work-shifts', v);
    },
    delete: (s) => _api.delete('/api/store-owner/work-shifts/${s['id']}'),
  );
}

// ─── Shop activity log ──────────────────────────────────────────────────────

class OwnerLogsScreen extends StatelessWidget {
  const OwnerLogsScreen({super.key});

  @override
  Widget build(BuildContext context) => CrudScreen(
    path: '/owner/logs',
    title: 'Nhật ký hoạt động',
    noun: 'hoạt động',
    searchHint: 'Lọc theo người, hành động...',
    load: (_) async => _rows(await _api.get('/api/store-owner/audit-logs?page=0&size=100')),
    searchText: (l) => '${l['action']} ${l['actorName']} ${l['description']}',
    itemTitle: (l) => '${l['description'] ?? l['action'] ?? ''}',
    itemLines: (l) => [
      (Icons.person_outline, '${l['actorName'] ?? 'Hệ thống'}${l['actorRole'] != null ? ' · ${roleLabel[l['actorRole']] ?? l['actorRole']}' : ''}'),
      (Icons.label_outline, '${l['action'] ?? ''}'),
      (Icons.schedule, formatDateTime(l['createdAt'])),
    ],
  );
}

/// Read-only one-line text widget used by detail sheets.
Widget kv(String k, String v) => Padding(
  padding: const EdgeInsets.symmetric(vertical: 3),
  child: Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      SizedBox(
        width: 130,
        child: Text(k, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
      ),
      Expanded(
        child: Text(v, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      ),
    ],
  ),
);

/// Shown under a list when the rest lives on the web only.
Widget webOnlyNote(String text) => Padding(padding: const EdgeInsets.only(top: 8), child: NoticeBox(text));
