import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';
import 'staff_common.dart';

/// Store-owner workspace (web store-owner/*) and admin workspace (web admin/*).

const _owner = '/api/store-owner';
final _api = Api.instance;

const roleLabel = {
  'SUPER_ADMIN': 'Quản trị cấp cao',
  'ADMIN': 'Quản trị viên',
  'SHOP_OWNER': 'Chủ cửa hàng',
  'SALES_STAFF': 'NV bán hàng',
  'STAFF': 'Nhân viên',
  'WAREHOUSE_STAFF': 'NV kho',
  'SHIPPING_STAFF': 'NV vận chuyển',
  'MARKETING_STAFF': 'NV marketing',
  'CSKH_STAFF': 'NV CSKH',
  'CUSTOMER': 'Khách hàng',
};

const _approvalType = {
  'PROMOTION': 'Khuyến mãi',
  'VOUCHER': 'Voucher',
  'RESTOCK_REQUEST': 'Đề xuất nhập hàng',
  'INVENTORY_ADJUSTMENT': 'Điều chỉnh tồn kho',
  'VOUCHER_UPDATE': 'Sửa voucher',
  'VOUCHER_DELETE': 'Xóa voucher',
  'PRODUCT': 'Sản phẩm',
  'PRICE_CHANGE': 'Đổi giá',
  'EMAIL_CAMPAIGN': 'Chiến dịch email',
  'POST': 'Bài viết',
};

/// Same labels as web admin/audit-logs ACTION_LABELS.
const _auditAction = {
  'USER_LOGIN': 'Đăng nhập',
  'LOGIN_FAILED': 'Đăng nhập thất bại',
  'USER_REGISTER': 'Đăng ký tài khoản',
  'ACCESS_DENIED': 'Bị từ chối truy cập',
  'LOCK_USER': 'Khóa tài khoản',
  'UNLOCK_USER': 'Mở khóa tài khoản',
  'DELETE_USER': 'Xóa tài khoản',
  'GRANT_PERMISSION': 'Cấp quyền',
  'REVOKE_PERMISSION': 'Thu hồi quyền',
  'API_POST': 'Gửi/tạo (POST)',
  'API_PUT': 'Cập nhật (PUT)',
  'API_PATCH': 'Cập nhật (PATCH)',
  'API_DELETE': 'Xóa (DELETE)',
};

String _dateParam(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

// ─── Owner: dashboard ───────────────────────────────────────────────────────

class OwnerDashboardScreen extends StatefulWidget {
  const OwnerDashboardScreen({super.key});

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  final _loader = GlobalKey<LoaderState<Map<String, dynamic>>>();
  int _days = 30;

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/owner',
    title: 'Tổng quan cửa hàng',
    body: Loader<Map<String, dynamic>>(
      key: _loader,
      load: () async {
        final now = DateTime.now();
        final from = now.subtract(Duration(days: _days - 1));
        return Map<String, dynamic>.from(await _api.get('$_owner/dashboard?from=${_dateParam(from)}&to=${_dateParam(now)}') as Map);
      },
      builder: (context, d, reload) {
        // Nested payload: orders{total,pending,delivered,...}, revenue{total}, inventory{...}, approvals{pendingCount}.
        Map sec(String k) => (d[k] as Map?) ?? const {};
        final orders = sec('orders');
        final change = toNum(d['revenueChange']);
        final pending = toInt(sec('approvals')['pendingCount']);
        final lowStock = toInt(sec('inventory')['lowStockAlerts']);
        final recent = asList(d['recentOrders']).whereType<Map>().toList();
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            FilterTabs(
              tabs: const [('7', '7 ngày'), ('30', '30 ngày'), ('90', '90 ngày')],
              value: '$_days',
              activeColor: AppColors.slate900,
              onChanged: (v) {
                setState(() => _days = int.parse(v));
                _loader.currentState?.reload();
              },
            ),
            const SizedBox(height: 12),
            StatGrid([
              StatTile(
                label: 'Doanh thu',
                value: fmtMoneyShort(toNum(sec('revenue')['total'])),
                icon: Icons.payments_outlined,
                hint: d['revenueChange'] == null ? null : '${change >= 0 ? '+' : ''}${change.toStringAsFixed(1)}% so với kỳ trước',
              ),
              StatTile(
                label: 'Đơn hàng',
                value: '${toInt(orders['total'])}',
                icon: Icons.receipt_long_outlined,
                hint: '${toInt(orders['delivered'])} đã giao · ${toInt(orders['cancelled'])} hủy',
                onTap: () => context.go('/owner/orders'),
              ),
              StatTile(
                label: 'Đơn chờ xử lý',
                value: '${toInt(orders['pending'])}',
                icon: Icons.hourglass_empty,
                hint: '${toInt(orders['confirmed'])} đã xác nhận · ${toInt(orders['shipped'])} đang giao',
                onTap: () => context.go('/owner/orders'),
              ),
              StatTile(
                label: 'Chờ duyệt',
                value: '$pending',
                icon: Icons.fact_check_outlined,
                alert: pending > 0,
                onTap: () => context.go('/owner/approvals'),
              ),
              StatTile(
                label: 'Sản phẩm',
                value: '${toInt(sec('inventory')['totalProducts'])}',
                icon: Icons.checkroom,
                onTap: () => context.go('/owner/products'),
              ),
              StatTile(label: 'Tồn kho thấp', value: '$lowStock', icon: Icons.warning_amber_rounded, alert: lowStock > 0),
              StatTile(
                label: 'Nhân viên',
                value: '${toInt(sec('staff')['active'])}/${toInt(sec('staff')['total'])}',
                hint: 'đang hoạt động',
                icon: Icons.groups_outlined,
                onTap: () => context.go('/owner/staff'),
              ),
            ]),
            if (recent.isNotEmpty) const SectionLabel('Đơn gần đây'),
            for (final o in recent)
              RecordCard(
                onTap: () => context.go('/owner/orders'),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${o['orderCode']}',
                            style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700),
                          ),
                          InfoLine(Icons.person_outline, '${o['customerName'] ?? ''} · ${formatDateTime(o['createdAt'])}'),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(vnd(toNum(o['totalAmount'])), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        const SizedBox(height: 4),
                        orderStatusBadge(o['status'] as String?),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    ),
  );
}

// ─── Owner: approvals ───────────────────────────────────────────────────────

class OwnerApprovalsScreen extends StatefulWidget {
  const OwnerApprovalsScreen({super.key});

  @override
  State<OwnerApprovalsScreen> createState() => _OwnerApprovalsScreenState();
}

class _OwnerApprovalsScreenState extends State<OwnerApprovalsScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();

  Future<void> _decide(Map a, String action) async {
    final labels = {'APPROVED': 'Duyệt', 'REJECTED': 'Từ chối', 'REVISION_REQUESTED': 'Yêu cầu sửa'};
    final r = await formSheet(
      context,
      title: '${labels[action]} yêu cầu',
      subtitle: '${a['title'] ?? ''}',
      fields: [FormFieldSpec('note', action == 'APPROVED' ? 'Ghi chú' : 'Lý do', required: action != 'APPROVED', lines: 2)],
      confirm: labels[action]!,
      danger: action == 'REJECTED',
      submit: (v) => _api.put('$_owner/approvals/${a['approvalId']}', {'action': action, if (v['note']!.isNotEmpty) 'note': v['note']}),
    );
    if (r != null) {
      Toast.success(
        action == 'APPROVED'
            ? 'Đã duyệt'
            : action == 'REJECTED'
            ? 'Đã từ chối'
            : 'Đã gửi yêu cầu chỉnh sửa',
      );
      await _loader.currentState?.reload();
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/owner/approvals',
    title: 'Chờ duyệt',
    body: Loader<List<Map<String, dynamic>>>(
      key: _loader,
      load: () async => asList(await _api.get('$_owner/approvals/pending')).whereType<Map<String, dynamic>>().toList(),
      isEmpty: (l) => l.isEmpty,
      empty: const EmptyPanel(icon: Icons.check_circle_outline, title: 'Không có yêu cầu nào chờ duyệt'),
      builder: (context, list, reload) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final a in list)
            RecordCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      ToneBadge(_approvalType[a['type']] ?? '${a['type'] ?? ''}', tone: 'gray', dot: false),
                      const Spacer(),
                      Text(formatDateTime(a['createdAt']), style: const TextStyle(fontSize: 11.5, color: AppColors.slate500)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('${a['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  if ('${a['description'] ?? ''}'.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('${a['description']}', style: const TextStyle(fontSize: 12.5, color: AppColors.slate600, height: 1.4)),
                    ),
                  if (a['requestedBy'] != null) InfoLine(Icons.person_outline, 'Đề xuất bởi ${a['requestedBy']}'),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: StaffButton('Từ chối', style: PillStyle.outline, height: 38, onPressed: () => _decide(a, 'REJECTED')),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: StaffButton('Yêu cầu sửa', style: PillStyle.outline, height: 38, onPressed: () => _decide(a, 'REVISION_REQUESTED')),
                      ),
                      const SizedBox(width: 6),
                      Expanded(child: StaffButton('Duyệt', height: 38, onPressed: () => _decide(a, 'APPROVED'))),
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

// ─── Owner: orders ──────────────────────────────────────────────────────────

class OwnerOrdersScreen extends StatefulWidget {
  const OwnerOrdersScreen({super.key});

  @override
  State<OwnerOrdersScreen> createState() => _OwnerOrdersScreenState();
}

class _OwnerOrdersScreenState extends State<OwnerOrdersScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _status = '';
  String _q = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _detail(Map o) async {
    Map d;
    try {
      d = await _api.get('$_owner/orders/${o['id']}') as Map;
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không tải được đơn');
      return;
    }
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (c) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        builder: (c, scroll) => ListView(
          controller: scroll,
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${d['orderCode']}',
                    style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                ),
                orderStatusBadge(d['status'] as String?),
              ],
            ),
            InfoLine(Icons.person_outline, [d['customerName'], d['customerPhone'] ?? d['phone']].whereType<Object>().join(' · ')),
            if (d['shippingAddress'] != null) InfoLine(Icons.place_outlined, '${d['shippingAddress']}'),
            InfoLine(Icons.schedule, formatDateTime(d['createdAt'])),
            const SizedBox(height: 12),
            for (final i in asList(d['items']).whereType<Map>())
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(width: 44, height: 54, child: NetImage(resolveImageUrl(i['image']))),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${i['productName'] ?? ''}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          Text(
                            '${[i['color'], i['size']].whereType<Object>().join(' / ')} · ${vnd(toNum(i['unitPrice']))} × ${i['quantity']}',
                            style: const TextStyle(fontSize: 11.5, color: AppColors.slate500),
                          ),
                        ],
                      ),
                    ),
                    Text(vnd(toNum(i['totalPrice'])), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  ],
                ),
              ),
            const Divider(color: AppColors.slate100),
            Row(
              children: [
                const Expanded(
                  child: Text('Tổng cộng', style: TextStyle(color: AppColors.slate500)),
                ),
                Text(vnd(toNum(d['totalAmount'] ?? d['total'])), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/owner/orders',
    title: 'Đơn hàng',
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(
            children: [
              StaffSearch(
                hint: 'Tìm mã đơn, khách hàng, SĐT...',
                onChanged: (v) {
                  _q = v;
                  _debounce?.cancel();
                  _debounce = Timer(const Duration(milliseconds: 400), () => _loader.currentState?.reload());
                },
              ),
              const SizedBox(height: 10),
              FilterTabs(
                tabs: const [
                  ('', 'Tất cả'),
                  ('PENDING_CONFIRMATION', 'Chờ xác nhận'),
                  ('CONFIRMED', 'Đã xác nhận'),
                  ('SHIPPING', 'Đang giao'),
                  ('DELIVERED', 'Đã giao'),
                  ('CANCELLED', 'Đã hủy'),
                  ('RETURN_REQUESTED', 'Yêu cầu trả'),
                ],
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
          child: Loader<List<Map<String, dynamic>>>(
            key: _loader,
            load: () async {
              final q = [
                'page=0',
                'size=50',
                if (_status.isNotEmpty) 'status=$_status',
                if (_q.trim().isNotEmpty) 'search=${Uri.encodeQueryComponent(_q.trim())}',
              ].join('&');
              return asList(await _api.get('$_owner/orders?$q')).whereType<Map<String, dynamic>>().toList();
            },
            isEmpty: (l) => l.isEmpty,
            empty: const EmptyPanel(icon: Icons.receipt_long_outlined, title: 'Không có đơn phù hợp'),
            builder: (context, list, reload) => ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final o in list)
                  RecordCard(
                    onTap: () => _detail(o),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${o['orderCode']}',
                                style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800),
                              ),
                            ),
                            orderStatusBadge(o['status'] as String?),
                          ],
                        ),
                        InfoLine(Icons.person_outline, [o['customerName'], o['customerPhone']].whereType<Object>().join(' · ')),
                        InfoLine(
                          Icons.payments_outlined,
                          '${vnd(toNum(o['totalAmount']))} · ${paymentMethodLabel[o['paymentMethod']] ?? o['paymentMethod'] ?? ''}',
                        ),
                        InfoLine(Icons.schedule, formatDateTime(o['createdAt'])),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

// ─── Owner: products (pricing) ──────────────────────────────────────────────

class OwnerProductsScreen extends StatefulWidget {
  const OwnerProductsScreen({super.key});

  @override
  State<OwnerProductsScreen> createState() => _OwnerProductsScreenState();
}

class _OwnerProductsScreenState extends State<OwnerProductsScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _q = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _pricing(Map p) async {
    final r = await formSheet(
      context,
      title: 'Giá bán',
      subtitle: '${p['name']}\nGiá phải là bội số của 1.000₫. Để trống giá khuyến mãi nếu không giảm.',
      fields: [
        FormFieldSpec('price', 'Giá gốc', initial: '${toInt(p['basePrice'])}', required: true, type: TextInputType.number),
        FormFieldSpec(
          'sale',
          'Giá khuyến mãi',
          initial: p['baseSalePrice'] == null ? '' : '${toInt(p['baseSalePrice'])}',
          type: TextInputType.number,
        ),
        FormFieldSpec(
          'active',
          'Trạng thái bán',
          options: const [('true', 'Đang bán'), ('false', 'Ngừng bán')],
          initial: p['isAvailableForSale'] == false ? 'false' : 'true',
        ),
      ],
      confirm: 'Lưu',
      submit: (v) {
        final price = int.tryParse(v['price']!.replaceAll(RegExp(r'[.,\s]'), ''));
        final sale = v['sale']!.isEmpty ? null : int.tryParse(v['sale']!.replaceAll(RegExp(r'[.,\s]'), ''));
        if (price == null || price <= 0 || price % 1000 != 0) throw ApiException('Giá gốc phải là số dương, bội số của 1.000');
        if (v['sale']!.isNotEmpty && (sale == null || sale <= 0 || sale % 1000 != 0 || sale >= price)) {
          throw ApiException('Giá khuyến mãi phải là bội số của 1.000 và nhỏ hơn giá gốc');
        }
        return _api.put('$_owner/products/${p['id']}/pricing', {'price': price, 'salePrice': sale, 'active': v['active'] == 'true'});
      },
    );
    if (r != null) {
      Toast.success('Đã cập nhật giá');
      await _loader.currentState?.reload();
    }
  }

  final _picked = <int>{};
  String _status = '';

  Future<void> _delete(Map p) async {
    try {
      final d = await _api.get('$_owner/products/${p['id']}/delete-check');
      if (d is Map && d['canDelete'] == false) return Toast.error('${d['reason'] ?? 'Sản phẩm đang được sử dụng, không thể xóa'}');
    } catch (e) {
      return Toast.error(e is ApiException ? e.message : 'Không kiểm tra được điều kiện xóa');
    }
    if (!mounted) return;
    if (!await confirmDialog(context, 'Xóa sản phẩm', 'Xóa "${p['name']}"? Sản phẩm sẽ bị ẩn khỏi cửa hàng.', confirm: 'Xóa')) return;
    await runAction(() => _api.delete('$_owner/products/${p['id']}'), 'Đã xóa sản phẩm');
    await _loader.currentState?.reload();
  }

  Future<void> _menu(Map p) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      builder: (c) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text('${p['name']}', style: const TextStyle(fontWeight: FontWeight.w700), maxLines: 2),
            ),
            ListTile(leading: const Icon(Icons.sell_outlined), title: const Text('Sửa giá nhanh'), onTap: () => Navigator.pop(c, 'price')),
            ListTile(leading: const Icon(Icons.edit_outlined), title: const Text('Sửa thông tin & ảnh'), onTap: () => Navigator.pop(c, 'edit')),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.red600),
              title: const Text('Xóa sản phẩm', style: TextStyle(color: AppColors.red600)),
              onTap: () => Navigator.pop(c, 'delete'),
            ),
          ],
        ),
      ),
    );
    if (!mounted) return;
    switch (choice) {
      case 'price':
        await _pricing(p);
      case 'edit':
        await context.push('/owner/products/${p['id']}/edit');
        await _loader.currentState?.reload();
      case 'delete':
        await _delete(p);
    }
  }

  Future<void> _bulk(String action) async {
    final labels = {'ACTIVATE': 'Bật bán', 'DEACTIVATE': 'Tạm ngưng bán', 'CLEAR_SALE': 'Bỏ khuyến mãi'};
    if (!await confirmDialog(
      context,
      labels[action]!,
      '${labels[action]} ${_picked.length} sản phẩm đã chọn?',
      confirm: labels[action]!,
      danger: false,
    )) {
      return;
    }
    final ok = await runAction(
      () => _api.put('$_owner/products/bulk', {'productIds': _picked.toList(), 'action': action}),
      'Đã ${labels[action]!.toLowerCase()} ${_picked.length} sản phẩm',
    );
    if (ok) setState(_picked.clear);
    await _loader.currentState?.reload();
  }

  void _toggle(Map p) => setState(() => _picked.contains(toInt(p['id'])) ? _picked.remove(toInt(p['id'])) : _picked.add(toInt(p['id'])));

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/owner/products',
    title: _picked.isEmpty ? 'Sản phẩm' : 'Đã chọn ${_picked.length}',
    actions: [
      if (_picked.isNotEmpty) ...[
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: _bulk,
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'ACTIVATE', child: Text('Bật bán')),
            PopupMenuItem(value: 'DEACTIVATE', child: Text('Tạm ngưng bán')),
            PopupMenuItem(value: 'CLEAR_SALE', child: Text('Bỏ khuyến mãi')),
          ],
        ),
        IconButton(tooltip: 'Bỏ chọn', onPressed: () => setState(_picked.clear), icon: const Icon(Icons.close)),
      ] else
        IconButton(tooltip: 'Nhập từ file', onPressed: () => context.push('/owner/products/import'), icon: const Icon(Icons.upload_file)),
    ],
    floatingAction: FloatingActionButton.extended(
      backgroundColor: AppColors.slate900,
      foregroundColor: Colors.white,
      onPressed: () async {
        await context.push('/owner/products/new');
        await _loader.currentState?.reload();
      },
      icon: const Icon(Icons.add),
      label: const Text('Thêm sản phẩm'),
    ),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(
            children: [
              StaffSearch(
                hint: 'Tìm sản phẩm...',
                onChanged: (v) {
                  _q = v;
                  _debounce?.cancel();
                  _debounce = Timer(const Duration(milliseconds: 400), () => _loader.currentState?.reload());
                },
              ),
              const SizedBox(height: 10),
              FilterTabs(
                tabs: const [('', 'Tất cả'), ('ACTIVE', 'Đang bán'), ('INACTIVE', 'Ngừng bán')],
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
          child: Loader<List<Map<String, dynamic>>>(
            key: _loader,
            load: () async {
              final kw = _q.trim().isEmpty ? '' : '&keyword=${Uri.encodeQueryComponent(_q.trim())}';
              final st = _status.isEmpty ? '' : '&status=$_status';
              return asList(await _api.get('$_owner/products?page=0&size=100$kw$st')).whereType<Map<String, dynamic>>().toList();
            },
            isEmpty: (l) => l.isEmpty,
            empty: const EmptyPanel(icon: Icons.checkroom, title: 'Không có sản phẩm'),
            builder: (context, list, reload) => ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
              children: [
                const Text('Chạm để sửa, nhấn giữ để chọn nhiều sản phẩm.', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                const SizedBox(height: 10),
                for (final p in list)
                  GestureDetector(
                    onLongPress: () => _toggle(p),
                    child: RecordCard(
                      accent: _picked.contains(toInt(p['id'])) ? AppColors.slate900 : null,
                      onTap: () => _picked.isNotEmpty ? _toggle(p) : _menu(p),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: SizedBox(width: 52, height: 64, child: NetImage(resolveImageUrl(p['imageUrl']))),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${p['name']}',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
                                ),
                                Text('${p['categoryName'] ?? ''}', style: const TextStyle(fontSize: 11.5, color: AppColors.slate500)),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    if (p['baseSalePrice'] != null) ...[
                                      Text(vnd(toNum(p['baseSalePrice'])), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                      const SizedBox(width: 6),
                                      Text(
                                        vnd(toNum(p['basePrice'])),
                                        style: const TextStyle(fontSize: 11.5, color: AppColors.slate400, decoration: TextDecoration.lineThrough),
                                      ),
                                    ] else
                                      Text(vnd(toNum(p['basePrice'])), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          if (p['isAvailableForSale'] == false) const ToneBadge('Ngừng bán', tone: 'red'),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

// ─── Users (owner's staff and admin's users) ────────────────────────────────

class UsersScreen extends StatefulWidget {
  /// true: admin list of every account; false: the owner's own staff.
  final bool admin;
  const UsersScreen({super.key, required this.admin});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _q = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  String get _statusPath => widget.admin ? '/api/admin/users' : '$_owner/staff';

  Future<void> _toggle(Map u) async {
    // Like the web: anything but ACTIVE (LOCKED, INACTIVE...) counts as not active and can be reactivated.
    final lock = u['status'] == 'ACTIVE';
    final r = await formSheet(
      context,
      title: lock ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      subtitle: '${u['fullName'] ?? ''} · ${u['email'] ?? ''}',
      fields: [if (lock) const FormFieldSpec('reason', 'Lý do khóa', required: true, lines: 2)],
      confirm: lock ? 'Khóa' : 'Mở khóa',
      danger: lock,
      submit: (v) => _api.patch('$_statusPath/${u['id']}/status', {'status': lock ? 'LOCKED' : 'ACTIVE', if (lock) 'lockReason': v['reason']}),
    );
    if (r != null) {
      Toast.success(lock ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      await _loader.currentState?.reload();
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: widget.admin ? '/admin/users' : '/owner/staff',
    title: widget.admin ? 'Tài khoản' : 'Nhân viên',
    actions: [
      if (!widget.admin)
        IconButton(tooltip: 'Đánh giá nhân viên', onPressed: () => context.push('/owner/staff/evaluations'), icon: const Icon(Icons.star_outline)),
    ],
    floatingAction: FloatingActionButton.extended(
      backgroundColor: AppColors.slate900,
      foregroundColor: Colors.white,
      onPressed: _create,
      icon: const Icon(Icons.person_add_alt),
      label: Text(widget.admin ? 'Tạo tài khoản' : 'Thêm nhân viên'),
    ),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: StaffSearch(
            hint: 'Tìm tên, email, mã nhân viên...',
            onChanged: (v) {
              if (widget.admin) {
                _q = v;
                _debounce?.cancel();
                _debounce = Timer(const Duration(milliseconds: 400), () => _loader.currentState?.reload());
              } else {
                setState(() => _q = v);
              }
            },
          ),
        ),
        Expanded(
          child: Loader<List<Map<String, dynamic>>>(
            key: _loader,
            load: () async {
              if (widget.admin) {
                final kw = _q.trim().isEmpty ? '' : '&keyword=${Uri.encodeQueryComponent(_q.trim())}';
                return asList(await _api.get('/api/admin/users?page=0&size=50$kw')).whereType<Map<String, dynamic>>().toList();
              }
              return asList(await _api.get('$_owner/staff')).whereType<Map<String, dynamic>>().toList();
            },
            builder: (context, all, reload) {
              final q = _q.toLowerCase();
              final list = widget.admin
                  ? all
                  : all.where((u) => q.isEmpty || '${u['fullName']} ${u['email']} ${u['employeeCode']}'.toLowerCase().contains(q)).toList();
              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                children: [
                  if (list.isEmpty) const EmptyPanel(icon: Icons.people_outline, title: 'Không có tài khoản phù hợp'),
                  for (final u in list)
                    RecordCard(
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.slate100,
                            child: Text(
                              '${u['fullName'] ?? '?'}'.trim().isEmpty ? '?' : '${u['fullName']}'.trim()[0].toUpperCase(),
                              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate700),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${u['fullName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                                Text('${u['email'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                                const SizedBox(height: 4),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: [
                                    ToneBadge(roleLabel[u['role']] ?? '${u['role'] ?? ''}', tone: 'gray', dot: false),
                                    if (u['status'] != 'ACTIVE')
                                      ToneBadge(switch (u['status']) {
                                        'LOCKED' => 'Đã khóa',
                                        'BANNED' => 'Đã xóa',
                                        _ => 'Ngừng hoạt động',
                                      }, tone: 'red'),
                                    if (u['employeeCode'] != null)
                                      Text(
                                        '${u['employeeCode']}',
                                        style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppColors.slate500),
                                      ),
                                  ],
                                ),
                                if (u['status'] != 'ACTIVE' && '${u['lockReason'] ?? ''}'.isNotEmpty)
                                  InfoLine(Icons.lock_outline, '${u['lockReason']}'),
                              ],
                            ),
                          ),
                          // BANNED = deleted by an admin; owners don't manage themselves or other owners.
                          if (u['role'] != 'SUPER_ADMIN' && u['status'] != 'BANNED' && (widget.admin || u['role'] != 'SHOP_OWNER'))
                            PopupMenuButton<String>(
                              icon: const Icon(Icons.more_vert, size: 20, color: AppColors.slate400),
                              onSelected: (a) => switch (a) {
                                'lock' => _toggle(u),
                                'reset' => _resetPassword(u),
                                'edit' => _editUser(u),
                                'quota' => _quota(u),
                                _ => _deleteUser(u),
                              },
                              itemBuilder: (_) => [
                                PopupMenuItem(value: 'lock', child: Text(u['status'] == 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản')),
                                const PopupMenuItem(value: 'reset', child: Text('Đặt lại mật khẩu')),
                                if (widget.admin) const PopupMenuItem(value: 'edit', child: Text('Sửa thông tin & vai trò')),
                                if (widget.admin && u['role'] == 'CSKH_STAFF')
                                  const PopupMenuItem(value: 'quota', child: Text('Hạn mức voucher CSKH')),
                                if (widget.admin)
                                  const PopupMenuItem(
                                    value: 'delete',
                                    child: Text('Xóa tài khoản', style: TextStyle(color: AppColors.red600)),
                                  ),
                              ],
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

  // ── account actions (web admin/users, store-owner/staff) ──

  /// Roles that belong to a branch (backend UserServiceImpl.SHOP_BOUND_ROLES).
  static const _shopBound = ['SHOP_OWNER', 'SALES_STAFF', 'CSKH_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF', 'STAFF'];
  static const _shopRoles = ['SALES_STAFF', 'CSKH_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF', 'MARKETING_STAFF'];

  Future<(List<(String, String)>, List<(String, String)>)> _roleAndShopOptions() async {
    if (!widget.admin) return ([for (final r in _shopRoles) (r, roleLabel[r] ?? r)], const <(String, String)>[]);
    final r = await Future.wait([_api.get('/api/admin/rbac/roles'), _api.get('/api/shops/active')]);
    final roles = [
      for (final x in asList(r[0]).whereType<Map>())
        if (x['code'] != 'SUPER_ADMIN') ('${x['code']}', roleLabel[x['code']] ?? '${x['name'] ?? x['code']}'),
    ];
    final shops = [for (final s in asList(r[1]).whereType<Map>()) ('${s['id']}', '${s['name']}')];
    return (roles, shops);
  }

  Future<void> _showPassword(String name, String pwd) => showDialog(
    context: context,
    builder: (c) => AlertDialog(
      title: const Text('Mật khẩu tạm thời'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Gửi mật khẩu này cho $name. Họ sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên. Mật khẩu chỉ hiện một lần.',
            style: const TextStyle(fontSize: 13, color: AppColors.slate600),
          ),
          const SizedBox(height: 12),
          SelectableText(
            pwd,
            style: const TextStyle(fontFamily: 'monospace', fontSize: 20, fontWeight: FontWeight.w800),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: pwd));
            Toast.success('Đã sao chép mật khẩu');
          },
          child: const Text('Sao chép'),
        ),
        TextButton(onPressed: () => Navigator.pop(c), child: const Text('Đóng')),
      ],
    ),
  );

  Future<void> _create() async {
    (List<(String, String)>, List<(String, String)>) opts;
    try {
      opts = await _roleAndShopOptions();
    } catch (e) {
      return Toast.error(e is ApiException ? e.message : 'Không tải được danh sách vai trò');
    }
    if (!mounted) return;
    final (roles, shops) = opts;
    final user = context.read<AuthProvider>().user;
    String? temp;
    final r = await formSheet(
      context,
      title: widget.admin ? 'Tạo tài khoản' : 'Thêm nhân viên',
      subtitle: 'Để trống mật khẩu để hệ thống tự tạo mật khẩu tạm thời.',
      fields: [
        const FormFieldSpec('fullName', 'Họ tên', required: true),
        const FormFieldSpec('email', 'Email', required: true, type: TextInputType.emailAddress),
        const FormFieldSpec('phone', 'Số điện thoại', type: TextInputType.phone),
        const FormFieldSpec('employeeCode', 'Mã nhân viên'),
        FormFieldSpec('roleCode', 'Vai trò', options: roles, initial: widget.admin ? 'SALES_STAFF' : roles.first.$1),
        if (widget.admin && shops.isNotEmpty) FormFieldSpec('shopId', 'Chi nhánh (vai trò thuộc chi nhánh)', options: shops),
        const FormFieldSpec('initialPassword', 'Mật khẩu ban đầu'),
      ],
      confirm: 'Tạo',
      submit: (v) async {
        if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v['email']!)) throw ApiException('Email không đúng định dạng');
        final bound = _shopBound.contains(v['roleCode']);
        final res = await _api.post(widget.admin ? '/api/admin/users' : '$_owner/staff', {
          'fullName': v['fullName'],
          'email': v['email']!.toLowerCase(),
          if (v['phone']!.isNotEmpty) 'phone': v['phone'],
          if (v['employeeCode']!.isNotEmpty) 'employeeCode': v['employeeCode'],
          'roleCode': v['roleCode'],
          if (widget.admin && bound && (v['shopId'] ?? '').isNotEmpty) 'shopId': int.parse(v['shopId']!),
          if (!widget.admin && user?.shopId != null) 'shopId': user!.shopId,
          if (v['initialPassword']!.isNotEmpty) 'initialPassword': v['initialPassword'],
        });
        if (res is Map && res['temporaryPassword'] != null) temp = '${res['temporaryPassword']}';
      },
    );
    if (r == null) return;
    Toast.success('Đã tạo tài khoản ${r['email']}');
    await _loader.currentState?.reload();
    if (temp != null && mounted) await _showPassword(r['fullName']!, temp!);
  }

  Future<void> _resetPassword(Map u) async {
    if (!await confirmDialog(
      context,
      'Đặt lại mật khẩu',
      'Tạo mật khẩu tạm thời mới cho ${u['fullName']}? Mật khẩu cũ sẽ không dùng được nữa.',
      confirm: 'Đặt lại',
    )) {
      return;
    }
    try {
      final res = await _api.post('${widget.admin ? '/api/admin/users' : '$_owner/staff'}/${u['id']}/reset-password', {}) as Map;
      if (mounted) await _showPassword('${u['fullName']}', '${res['temporaryPassword']}');
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không đặt lại được mật khẩu');
    }
  }

  Future<void> _editUser(Map u) async {
    (List<(String, String)>, List<(String, String)>) opts;
    try {
      opts = await _roleAndShopOptions();
    } catch (e) {
      return Toast.error(e is ApiException ? e.message : 'Không tải được danh sách vai trò');
    }
    if (!mounted) return;
    final (roles, shops) = opts;
    final r = await formSheet(
      context,
      title: 'Sửa tài khoản',
      subtitle: '${u['email']}',
      fields: [
        FormFieldSpec('fullName', 'Họ tên', initial: '${u['fullName'] ?? ''}', required: true),
        FormFieldSpec('phone', 'Số điện thoại', initial: '${u['phone'] ?? ''}', type: TextInputType.phone),
        FormFieldSpec('employeeCode', 'Mã nhân viên', initial: '${u['employeeCode'] ?? ''}'),
        FormFieldSpec('roleCode', 'Vai trò', options: roles, initial: '${u['role'] ?? ''}'),
        if (shops.isNotEmpty) FormFieldSpec('shopId', 'Chi nhánh (vai trò thuộc chi nhánh)', options: shops, initial: '${u['shopId'] ?? ''}'),
      ],
      confirm: 'Lưu',
      submit: (v) => _api.put('/api/admin/users/${u['id']}', {
        'fullName': v['fullName'],
        if (v['phone']!.isNotEmpty) 'phone': v['phone'],
        if (v['employeeCode']!.isNotEmpty) 'employeeCode': v['employeeCode'],
        'roleCode': v['roleCode'],
        if (_shopBound.contains(v['roleCode']) && (v['shopId'] ?? '').isNotEmpty) 'shopId': int.parse(v['shopId']!),
      }),
    );
    if (r != null) {
      Toast.success('Đã cập nhật tài khoản');
      await _loader.currentState?.reload();
    }
  }

  Future<void> _quota(Map u) async {
    final r = await formSheet(
      context,
      title: 'Hạn mức voucher CSKH',
      subtitle: '${u['fullName']} · tổng giá trị voucher tri ân được cấp trong kỳ',
      fields: [
        const FormFieldSpec('quotaAmount', 'Hạn mức (₫)', required: true, type: TextInputType.number, hint: '1000000'),
        FormFieldSpec('period', 'Kỳ (yyyy-mm)', initial: isoLocal(DateTime.now()).substring(0, 7), required: true),
      ],
      confirm: 'Lưu',
      submit: (v) {
        final n = int.tryParse(v['quotaAmount']!);
        if (n == null || n < 0) throw ApiException('Hạn mức phải là số không âm');
        return _api.put('/api/admin/cskh/quota/${u['id']}', {'quotaAmount': n, 'period': v['period']});
      },
    );
    if (r != null) Toast.success('Đã cập nhật hạn mức');
  }

  Future<void> _deleteUser(Map u) async {
    if (!await confirmDialog(
      context,
      'Xóa tài khoản',
      'Xóa tài khoản ${u['fullName']} (${u['email']})? Tài khoản sẽ không đăng nhập được nữa.',
      confirm: 'Xóa',
    )) {
      return;
    }
    await runAction(() => _api.delete('/api/admin/users/${u['id']}'), 'Đã xóa tài khoản');
    await _loader.currentState?.reload();
  }
}

// ─── Owner: staff evaluations ───────────────────────────────────────────────

class StaffEvaluationsScreen extends StatefulWidget {
  const StaffEvaluationsScreen({super.key});

  @override
  State<StaffEvaluationsScreen> createState() => _StaffEvaluationsScreenState();
}

class _StaffEvaluationsScreenState extends State<StaffEvaluationsScreen> {
  final _loader = GlobalKey<LoaderState<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>>();

  Future<void> _create(List<Map<String, dynamic>> staff) async {
    final r = await formSheet(
      context,
      title: 'Đánh giá nhân viên',
      fields: [
        FormFieldSpec('userId', 'Nhân viên', options: [for (final u in staff) ('${u['id']}', '${u['fullName']}')]),
        FormFieldSpec('evaluationPeriod', 'Kỳ đánh giá (yyyy-mm)', initial: isoLocal(DateTime.now()).substring(0, 7), required: true),
        const FormFieldSpec('rating', 'Xếp hạng', options: [('5', '5★'), ('4', '4★'), ('3', '3★'), ('2', '2★'), ('1', '1★')]),
        const FormFieldSpec('salesTargetAchievement', 'Hoàn thành chỉ tiêu (%)', initial: '100', type: TextInputType.number),
        const FormFieldSpec('feedbackNotes', 'Nhận xét', lines: 3),
      ],
      confirm: 'Lưu đánh giá',
      submit: (v) => _api.post('$_owner/evaluations', {
        'userId': v['userId'],
        'evaluationPeriod': v['evaluationPeriod'],
        'rating': int.parse(v['rating']!),
        'salesTargetAchievement': num.tryParse(v['salesTargetAchievement']!) ?? 0,
        if (v['feedbackNotes']!.isNotEmpty) 'feedbackNotes': v['feedbackNotes'],
      }),
    );
    if (r != null) {
      Toast.success('Đã lưu đánh giá');
      await _loader.currentState?.reload();
    }
  }

  List<Map<String, dynamic>> _staff = [];

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/owner/staff',
    title: 'Đánh giá nhân viên',
    floatingAction: FloatingActionButton.extended(
      backgroundColor: AppColors.slate900,
      foregroundColor: Colors.white,
      onPressed: () => _staff.isEmpty ? Toast.info('Chưa có nhân viên đang làm việc để đánh giá') : _create(_staff),
      icon: const Icon(Icons.add),
      label: const Text('Đánh giá'),
    ),
    body: Loader<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>(
      key: _loader,
      load: () async {
        final r = await Future.wait([_api.get('$_owner/evaluations'), _api.get('$_owner/staff')]);
        _staff = asList(r[1]).whereType<Map<String, dynamic>>().where((u) => u['status'] == 'ACTIVE' && u['role'] != 'SHOP_OWNER').toList();
        return (asList(r[0]).whereType<Map<String, dynamic>>().toList(), _staff);
      },
      builder: (context, data, reload) {
        final (evals, _) = data;
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
          children: [
            if (evals.isEmpty) const EmptyPanel(icon: Icons.star_outline, title: 'Chưa có đánh giá nào'),
            for (final e in evals)
              RecordCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text('${e['userFullName'] ?? e['userId']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        Text('${'★' * toInt(e['rating'])}${'☆' * (5 - toInt(e['rating']))}', style: const TextStyle(fontSize: 15)),
                      ],
                    ),
                    InfoLine(Icons.event, 'Kỳ ${e['evaluationPeriod']} · chỉ tiêu ${e['salesTargetAchievement'] ?? 0}%'),
                    if ('${e['feedbackNotes'] ?? ''}'.isNotEmpty) InfoLine(Icons.notes, '${e['feedbackNotes']}'),
                    InfoLine(Icons.person_outline, '${e['evaluatedBy'] ?? ''} · ${formatDateTime(e['createdAt'])}'),
                  ],
                ),
              ),
          ],
        );
      },
    ),
  );
}

// ─── Admin: system health ───────────────────────────────────────────────────

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/admin',
    title: 'Tình trạng hệ thống',
    body: Loader<Map<String, dynamic>>(
      load: () async => Map<String, dynamic>.from(await _api.get('/api/admin/monitoring/metrics') as Map),
      builder: (context, m, reload) {
        final jvm = (m['jvm'] as Map?) ?? const {};
        final db = (m['database'] as Map?) ?? const {};
        final orders = (m['orders'] as Map?) ?? const {};
        final errors = asList(m['recentErrors']);
        final memPct = toNum(jvm['maxMemoryMb']) > 0 ? toNum(jvm['usedMemoryMb']) / toNum(jvm['maxMemoryMb']) : 0;
        final waiting = toInt(db['threadsAwaitingConnection']);
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            StatGrid([
              StatTile(label: 'Thời gian chạy', value: '${(m['uptime'] as Map?)?['uptimeFormatted'] ?? '—'}', icon: Icons.timer_outlined),
              StatTile(
                label: 'Bộ nhớ JVM',
                value: '${toInt(jvm['usedMemoryMb'])}/${toInt(jvm['maxMemoryMb'])} MB',
                icon: Icons.memory,
                alert: memPct > 0.85,
                hint: '${(memPct * 100).round()}% đã dùng',
              ),
              StatTile(
                label: 'Kết nối DB',
                value: '${toInt(db['activeConnections'])}/${toInt(db['maxPoolSize'])}',
                icon: Icons.storage,
                alert: waiting > 0,
                hint: waiting > 0 ? '$waiting luồng đang chờ' : '${toInt(db['idleConnections'])} rảnh',
              ),
              StatTile(
                label: 'Luồng',
                value: '${toInt(jvm['threadCount'])}',
                icon: Icons.account_tree_outlined,
                hint: 'Đỉnh ${toInt(jvm['peakThreadCount'])} · ${toInt(jvm['processors'])} CPU',
              ),
              StatTile(
                label: 'Đơn đang xử lý',
                value: '${toInt(orders['activeOrders'])}',
                icon: Icons.receipt_long_outlined,
                hint: '${toInt(orders['pendingOrders'])} chờ · ${toInt(orders['totalOrders'])} tổng',
              ),
              StatTile(
                label: 'Lỗi gần đây',
                value: '${errors.length}',
                icon: Icons.error_outline,
                alert: errors.isNotEmpty,
                onTap: () => context.go('/admin/audit-logs'),
              ),
            ]),
            if (errors.isNotEmpty) const SectionLabel('Lỗi gần đây'),
            for (final e in errors.take(20))
              RecordCard(
                child: Text(
                  e is Map ? '${e['message'] ?? e['error'] ?? e}' : '$e',
                  style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: AppColors.slate700),
                ),
              ),
          ],
        );
      },
    ),
  );
}

// ─── Admin: audit log ───────────────────────────────────────────────────────

class AuditLogsScreen extends StatefulWidget {
  const AuditLogsScreen({super.key});

  @override
  State<AuditLogsScreen> createState() => _AuditLogsScreenState();
}

class _AuditLogsScreenState extends State<AuditLogsScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _q = '';
  String _result = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/admin/audit-logs',
    title: 'Nhật ký hoạt động',
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(
            children: [
              StaffSearch(
                hint: 'Tìm mô tả, email, đường dẫn...',
                onChanged: (v) {
                  _q = v;
                  _debounce?.cancel();
                  _debounce = Timer(const Duration(milliseconds: 400), () => _loader.currentState?.reload());
                },
              ),
              const SizedBox(height: 10),
              FilterTabs(
                tabs: const [('', 'Mọi kết quả'), ('SUCCESS', 'Thành công'), ('FAILURE', 'Thất bại')],
                value: _result,
                activeColor: AppColors.slate900,
                onChanged: (v) {
                  setState(() => _result = v);
                  _loader.currentState?.reload();
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: Loader<List<Map<String, dynamic>>>(
            key: _loader,
            load: () async {
              final qs = Uri(
                queryParameters: {
                  'page': '0',
                  'size': '50',
                  'sort': 'desc',
                  if (_q.trim().isNotEmpty) 'search': _q.trim(),
                  if (_result.isNotEmpty) 'result': _result,
                },
              ).query;
              return asList(await _api.get('/api/admin/audit-logs?$qs')).whereType<Map<String, dynamic>>().toList();
            },
            isEmpty: (l) => l.isEmpty,
            empty: const EmptyPanel(icon: Icons.history, title: 'Không có hoạt động phù hợp'),
            builder: (context, list, reload) => ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final l in list)
                  Builder(
                    builder: (context) {
                      final failed = l['result'] == 'FAILURE' || toInt(l['statusCode']) >= 400;
                      return RecordCard(
                        accent: failed ? const Color(0xFFFECACA) : null,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    _auditAction[l['action']] ?? l['action'] ?? 'Hoạt động',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                  ),
                                ),
                                if (failed) ToneBadge('${l['statusCode'] ?? 'Lỗi'}', tone: 'red'),
                              ],
                            ),
                            if ('${l['description'] ?? ''}'.isNotEmpty) InfoLine(Icons.notes, '${l['description']}'),
                            InfoLine(
                              Icons.person_outline,
                              '${l['actorEmail'] ?? (l['userId'] != null ? '#${l['userId']}' : 'Hệ thống')}${l['actorRole'] != null ? ' · ${roleLabel[l['actorRole']] ?? l['actorRole']}' : ''}',
                            ),
                            if (l['targetEntity'] != null)
                              InfoLine(Icons.label_outline, '${l['targetEntity']}${l['targetId'] != null ? ' #${l['targetId']}' : ''}'),
                            InfoLine(Icons.schedule, formatDateTime(l['createdAt'])),
                          ],
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}
