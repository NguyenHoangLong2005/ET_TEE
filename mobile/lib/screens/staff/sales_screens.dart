import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../models/product.dart';
import '../../services/product_service.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';
import 'staff_common.dart';

/// Sales workspace (web staff/dashboard/sales/*), on /api/staff/sales.

const _base = '/api/staff/sales';
final _api = Api.instance;

const _cancelPresets = [
  'Khách yêu cầu hủy',
  'Không gọi được cho khách hàng',
  'Địa chỉ không chính xác',
  'Sản phẩm tạm hết hàng trong kho',
  'Lý do khác',
];

const _paymentStatusLabel = {
  'UNPAID': 'Chưa thanh toán',
  'PENDING': 'Chờ thanh toán',
  'WAITING_TRANSFER': 'Chờ chuyển khoản',
  'COD_PENDING': 'Thu khi giao hàng',
  'COD_COLLECTED': 'Đã thu COD',
  'PAID': 'Đã thanh toán',
  'FAILED': 'Thanh toán lỗi',
  'REFUND_PENDING': 'Chờ hoàn tiền',
  'REFUNDED': 'Đã hoàn tiền',
};

/// Statuses sales may set by hand; DELIVERED only as "reject the return".
const _salesScope = ['CONFIRMED', 'CANCELLED', 'RETURNED', 'REFUNDED'];
const _returnActionLabel = {
  'RETURNED': 'Chấp nhận trả hàng',
  'DELIVERED': 'Từ chối trả hàng',
  'REFUNDED': 'Đã hoàn tiền cho khách',
};

Widget _orderCard(BuildContext context, Map o, {Widget? trailing}) => RecordCard(
      onTap: () => context.push('/staff/sales/orders/${o['id']}'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('${o['orderCode']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800))),
          orderStatusBadge(o['status'] as String?),
        ]),
        // The dashboard summary carries fewer fields than the order list; show what is there.
        InfoLine(Icons.person_outline,
            [o['customerName'] ?? 'Khách hàng', o['phone'] ?? o['customerPhone']].whereType<Object>().join(' · ')),
        InfoLine(Icons.payments_outlined, [
          vnd(toNum(o['total'] ?? o['totalAmount'])),
          if (o['paymentMethod'] != null) paymentMethodLabel[o['paymentMethod']] ?? o['paymentMethod'],
        ].join(' · ')),
        if (o['createdAt'] != null) InfoLine(Icons.schedule, formatDateTime(o['createdAt'])),
        ?trailing,
      ]),
    );

// ─── Dashboard ──────────────────────────────────────────────────────────────

class SalesDashboardScreen extends StatefulWidget {
  const SalesDashboardScreen({super.key});

  @override
  State<SalesDashboardScreen> createState() => _SalesDashboardScreenState();
}

class _SalesDashboardScreenState extends State<SalesDashboardScreen> {
  final _loader = GlobalKey<LoaderState<Map<String, dynamic>>>();
  int? _busy;

  Future<void> _confirm(Map o) async {
    setState(() => _busy = toInt(o['id']));
    await runAction(() => _api.post('$_base/orders/${o['id']}/confirm', {}), 'Đã xác nhận đơn ${o['orderCode']}');
    if (mounted) setState(() => _busy = null);
    await _loader.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/sales',
        title: 'Tổng quan bán hàng',
        body: Loader<Map<String, dynamic>>(
          key: _loader,
          load: () async => Map<String, dynamic>.from(await _api.get('$_base/dashboard') as Map),
          builder: (context, d, reload) {
            final counts = (d['countByStatus'] as Map?) ?? const {};
            int sum(List<String> s) => s.fold(0, (a, k) => a + toInt(counts[k]));
            final urgent = asList(d['urgentOrders']).whereType<Map>().toList();
            final recent = asList(d['recentOrders']).whereType<Map>().toList();
            final sla = toInt(d['slaWarningCount']);
            return ListView(padding: const EdgeInsets.all(16), children: [
              StatGrid([
                StatTile(label: 'Chờ xác nhận', value: '${sum(['PENDING_CONFIRMATION'])}', icon: Icons.hourglass_empty,
                    onTap: () => context.go('/staff/sales/orders?filter=new')),
                StatTile(label: 'Quá hạn xử lý', value: '$sla', icon: Icons.timer_off_outlined, alert: sla > 0,
                    onTap: () => context.go('/staff/sales/orders?filter=sla')),
                StatTile(label: 'Chờ thanh toán', value: '${sum(['PENDING_PAYMENT'])}', icon: Icons.account_balance_outlined),
                StatTile(label: 'Trả hàng / hoàn tiền', value: '${sum(['RETURN_REQUESTED', 'RETURNED', 'REFUNDED'])}', icon: Icons.undo),
                StatTile(label: 'Đơn hôm nay', value: '${toInt(d['todayCount'])}', icon: Icons.today_outlined),
                if (d['todayRevenue'] != null)
                  StatTile(label: 'Doanh thu hôm nay', value: fmtMoneyShort(toNum(d['todayRevenue'])), icon: Icons.payments_outlined)
                else
                  StatTile(label: 'Đang xử lý', value: '${sum(['CONFIRMED', 'PICKING', 'PACKED', 'HANDED_TO_CARRIER', 'SHIPPING'])}',
                      icon: Icons.local_shipping_outlined),
              ]),
              SectionLabel('Cần xử lý ngay', trailing: TextButton(onPressed: () => context.go('/staff/sales/orders'), child: const Text('Tất cả đơn'))),
              if (urgent.isEmpty) const Text('Không có đơn nào đang chờ.', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
              for (final o in urgent)
                _orderCard(context, o,
                    trailing: o['status'] == 'PENDING_CONFIRMATION'
                        ? Padding(
                            padding: const EdgeInsets.only(top: 10),
                            child: StaffButton('Xác nhận đơn', height: 40, expand: true, loading: _busy == toInt(o['id']),
                                onPressed: _busy != null ? null : () => _confirm(o)),
                          )
                        : null),
              if (recent.isNotEmpty) const SectionLabel('Đơn mới nhất'),
              for (final o in recent.take(10)) _orderCard(context, o),
            ]);
          },
        ),
      );
}

// ─── Orders ─────────────────────────────────────────────────────────────────

class SalesOrdersScreen extends StatefulWidget {
  final String initialFilter;
  const SalesOrdersScreen({super.key, this.initialFilter = 'all'});

  @override
  State<SalesOrdersScreen> createState() => _SalesOrdersScreenState();
}

class _SalesOrdersScreenState extends State<SalesOrdersScreen> {
  late String _filter = widget.initialFilter;
  String _q = '';
  Timer? _debounce;
  final _items = <Map<String, dynamic>>[];
  int _page = 0;
  int _total = 0;
  bool _last = false;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _load({bool reset = false}) async {
    if (_loading && !reset) return;
    if (reset) {
      _page = 0;
      _last = false;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final q = _q.trim().isEmpty ? '' : '&q=${Uri.encodeQueryComponent(_q.trim())}';
      final res = await _api.get('$_base/orders/page?page=$_page&size=20&filter=$_filter$q') as Map;
      final list = asList(res).whereType<Map<String, dynamic>>().toList();
      if (!mounted) return;
      setState(() {
        if (reset) _items.clear();
        _items.addAll(list);
        _total = toInt(res['totalElements']);
        _last = _page + 1 >= toInt(res['totalPages']);
        _page++;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiException ? e.message : 'Không tải được đơn hàng');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/sales/orders',
        title: 'Đơn hàng',
        floatingAction: FloatingActionButton.extended(
          backgroundColor: AppColors.slate900,
          foregroundColor: Colors.white,
          onPressed: () async {
            await context.push('/staff/sales/orders/new');
            await _load(reset: true);
          },
          icon: const Icon(Icons.add),
          label: const Text('Tạo đơn'),
        ),
        body: RefreshIndicator(
          onRefresh: () => _load(reset: true),
          child: NotificationListener<ScrollNotification>(
            onNotification: (n) {
              if (n.metrics.extentAfter < 400 && !_last && !_loading) _load();
              return false;
            },
            child: ListView(padding: const EdgeInsets.all(16), children: [
              StaffSearch(
                hint: 'Tìm mã đơn, tên, SĐT...',
                onChanged: (v) {
                  _q = v;
                  _debounce?.cancel();
                  _debounce = Timer(const Duration(milliseconds: 400), () => _load(reset: true));
                },
              ),
              const SizedBox(height: 10),
              FilterTabs(
                tabs: const [('all', 'Tất cả'), ('new', 'Chờ xác nhận'), ('sla', 'Quá hạn')],
                value: _filter,
                activeColor: AppColors.slate900,
                onChanged: (v) {
                  setState(() => _filter = v);
                  _load(reset: true);
                },
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Text('$_total đơn', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
              ),
              if (_error != null) NoticeBox(_error!),
              if (!_loading && _items.isEmpty && _error == null) const EmptyPanel(icon: Icons.receipt_long_outlined, title: 'Không có đơn phù hợp'),
              for (final o in _items) _orderCard(context, o),
              if (_loading) const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
            ]),
          ),
        ),
      );
}

// ─── Order detail ───────────────────────────────────────────────────────────

class SalesOrderDetailScreen extends StatefulWidget {
  final int id;
  const SalesOrderDetailScreen({super.key, required this.id});

  @override
  State<SalesOrderDetailScreen> createState() => _SalesOrderDetailScreenState();
}

class _SalesOrderDetailScreenState extends State<SalesOrderDetailScreen> {
  final _loader = GlobalKey<LoaderState<(Map<String, dynamic>, List<Map<String, dynamic>>)>>();
  String get _path => '$_base/orders/${widget.id}';

  // Orders sales may still cancel (backend cancelOrder).
  static bool _cancellable(Map o) => const ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED'].contains(o['status']);

  Future<void> _after(Future<Map<String, String>?> sheet, String msg) async {
    if (await sheet != null) {
      Toast.success(msg);
      await _loader.currentState?.reload();
    }
  }

  void _verify(Map o) => _after(
      formSheet(context,
          title: 'Xác minh thông tin giao hàng',
          subtitle: 'Gọi cho khách để xác nhận, sửa lại nếu sai.',
          fields: [
            FormFieldSpec('customerName', 'Tên người nhận', initial: '${o['customerName'] ?? ''}', required: true),
            FormFieldSpec('phone', 'Số điện thoại', initial: '${o['phone'] ?? ''}', required: true, type: TextInputType.phone),
            FormFieldSpec('shippingAddress', 'Địa chỉ', initial: '${o['shippingAddress'] ?? ''}', required: true, lines: 2),
          ],
          confirm: 'Lưu xác minh',
          submit: (v) => _api.put('$_path/verify', v)),
      'Đã cập nhật thông tin giao hàng');

  void _cancel(Map o) => _after(
      formSheet(context,
          title: 'Hủy đơn ${o['orderCode']}',
          fields: [
            FormFieldSpec('preset', 'Lý do', options: [for (final p in _cancelPresets) (p, p)]),
            const FormFieldSpec('detail', 'Chi tiết thêm', lines: 2),
          ],
          confirm: 'Hủy đơn',
          danger: true,
          submit: (v) => _api.post('$_path/cancel', {'reason': v['detail']!.isEmpty ? v['preset'] : '${v['preset']}: ${v['detail']}'})),
      'Đã hủy đơn hàng');

  Future<void> _status(Map o) async {
    List<String> allowed;
    try {
      allowed = asList(await _api.get('$_path/transitions'))
          .map((e) => '$e')
          .where((s) => _salesScope.contains(s) || (s == 'DELIVERED' && o['status'] == 'RETURN_REQUESTED'))
          // Cancelling has its own sheet with a reason; never preselect a destructive status here.
          .where((s) => !(s == 'CANCELLED' && _cancellable(o)))
          .toList()
        ..sort((a, b) => (a == 'CANCELLED' ? 1 : 0).compareTo(b == 'CANCELLED' ? 1 : 0));
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không lấy được trạng thái hợp lệ');
      return;
    }
    if (!mounted) return;
    if (allowed.isEmpty) return Toast.info('Đơn ở trạng thái này không còn thao tác nào cho bộ phận bán hàng');
    String label(String s) => o['status'] == 'RETURN_REQUESTED' ? (_returnActionLabel[s] ?? orderStatusLabel[s] ?? s) : (orderStatusLabel[s] ?? s);
    await _after(
        formSheet(context,
            title: 'Đổi trạng thái đơn',
            subtitle: 'Hiện tại: ${orderStatusLabel[o['status']] ?? o['status']}',
            fields: [
              FormFieldSpec('status', 'Trạng thái mới', options: [for (final s in allowed) (s, label(s))]),
              FormFieldSpec('reason', o['status'] == 'RETURN_REQUESTED' ? 'Lý do (bắt buộc khi từ chối trả hàng)' : 'Ghi chú', lines: 2),
            ],
            confirm: 'Cập nhật',
            submit: (v) {
              if (v['status'] == 'DELIVERED' && v['reason']!.isEmpty) throw ApiException('Vui lòng nhập lý do từ chối trả hàng');
              return _api.put('$_path/status', {'status': v['status'], if (v['reason']!.isNotEmpty) 'reason': v['reason']});
            }),
        'Đã cập nhật trạng thái đơn');
  }

  Future<void> _confirmPayment(Map o) async {
    if (await confirmDialog(context, 'Xác nhận đã nhận tiền',
        'Đã nhận ${vnd(toNum(o['total'] ?? o['totalAmount']))} chuyển khoản cho đơn ${o['orderCode']}? Chỉ xác nhận sau khi đối chiếu sao kê.',
        confirm: 'Đã nhận tiền', danger: false)) {
      await runAction(() => _api.post('$_path/confirm-payment'), 'Đã ghi nhận thanh toán');
      await _loader.currentState?.reload();
    }
  }

  void _note() => _after(
      formSheet(context,
          title: 'Thêm ghi chú nội bộ',
          fields: const [FormFieldSpec('content', 'Nội dung', required: true, lines: 3)],
          confirm: 'Lưu ghi chú',
          submit: (v) => _api.post('$_path/notes', {'content': v['content']})),
      'Đã thêm ghi chú');

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/sales/orders',
        title: 'Chi tiết đơn',
        body: Loader<(Map<String, dynamic>, List<Map<String, dynamic>>)>(
          key: _loader,
          load: () async {
            final r = await Future.wait([_api.get(_path), _api.get('$_path/notes').catchError((_) => const [])]);
            return (Map<String, dynamic>.from(r[0] as Map), asList(r[1]).whereType<Map<String, dynamic>>().toList());
          },
          builder: (context, data, reload) {
            final (o, notes) = data;
            final st = '${o['status']}';
            final items = asList(o['items']).whereType<Map>().toList();
            final canVerify = st == 'PENDING_PAYMENT' || st == 'PENDING_CONFIRMATION';
            final canCancel = _cancellable(o);
            return ListView(padding: const EdgeInsets.all(16), children: [
              Row(children: [
                Expanded(child: Text('${o['orderCode']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w900, fontSize: 17))),
                orderStatusBadge(st),
              ]),
              const SizedBox(height: 6),
              InfoLine(Icons.schedule, 'Đặt lúc ${formatDateTime(o['createdAt'])}'),
              const SectionLabel('Người nhận'),
              AppCard(
                radius: 14,
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${o['customerName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  InfoLine(Icons.phone_outlined, '${o['phone'] ?? o['customerPhone'] ?? ''}'),
                  InfoLine(Icons.place_outlined, '${o['shippingAddress'] ?? ''}'),
                  if ('${o['note'] ?? ''}'.isNotEmpty) InfoLine(Icons.sticky_note_2_outlined, 'Khách ghi chú: ${o['note']}'),
                ]),
              ),
              SectionLabel('Sản phẩm (${items.length})'),
              AppCard(
                radius: 14,
                padding: const EdgeInsets.all(14),
                child: Column(children: [
                  for (final i in items)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(width: 46, height: 56, child: NetImage(resolveImageUrl(i['imageSnapshot'] ?? i['image']))),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${i['productNameSnapshot'] ?? i['productName'] ?? ''}', maxLines: 2, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                            Text([i['colorSnapshot'] ?? i['color'], i['sizeSnapshot'] ?? i['size']].whereType<Object>().join(' / '),
                                style: const TextStyle(fontSize: 11.5, color: AppColors.slate500)),
                            Text('${vnd(toNum(i['salePrice'] ?? i['unitPrice']))} × ${i['quantity']}', style: const TextStyle(fontSize: 12)),
                          ]),
                        ),
                        Text(vnd(toNum(i['totalPrice'])), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      ]),
                    ),
                  const Divider(color: AppColors.slate100),
                  _row('Phí vận chuyển', vnd(toNum(o['shippingFee']))),
                  if (toNum(o['discountAmount']) > 0) _row('Giảm giá', '-${vnd(toNum(o['discountAmount']))}'),
                  _row('Tổng cộng', vnd(toNum(o['total'] ?? o['totalAmount'])), bold: true),
                  _row('Thanh toán', [paymentMethodLabel[o['paymentMethod']] ?? o['paymentMethod'], _paymentStatusLabel[o['paymentStatus']] ?? o['paymentStatus']].whereType<Object>().join(' · ')),
                ]),
              ),
              const SectionLabel('Thao tác'),
              Wrap(spacing: 8, runSpacing: 8, children: [
                if (st == 'PENDING_PAYMENT' && o['paymentMethod'] == 'BANK_TRANSFER')
                  StaffButton('Đã nhận tiền', height: 40, icon: Icons.account_balance_outlined, onPressed: () => _confirmPayment(o)),
                // Final orders have nothing left for sales to change (web isFinal).
                if (!const ['DELIVERED', 'CANCELLED', 'REFUNDED'].contains(st))
                  StaffButton('Đổi trạng thái', height: 40, icon: Icons.swap_horiz, onPressed: () => _status(o)),
                if (canVerify) StaffButton('Xác minh', style: PillStyle.outline, height: 40, icon: Icons.fact_check_outlined, onPressed: () => _verify(o)),
                StaffButton('Ghi chú', style: PillStyle.outline, height: 40, icon: Icons.note_add_outlined, onPressed: _note),
                if (canCancel) StaffButton('Hủy đơn', style: PillStyle.danger, height: 40, icon: Icons.close, onPressed: () => _cancel(o)),
              ]),
              SectionLabel('Ghi chú nội bộ (${notes.length})'),
              if (notes.isEmpty) const Text('Chưa có ghi chú.', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
              for (final n in notes)
                RecordCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${n['content'] ?? ''}', style: const TextStyle(fontSize: 13)),
                    InfoLine(Icons.person_outline, '${n['createdBy'] ?? n['authorName'] ?? ''} · ${formatDateTime(n['createdAt'])}'),
                  ]),
                ),
            ]);
          },
        ),
      );

  Widget _row(String k, String v, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Expanded(child: Text(k, style: const TextStyle(fontSize: 13, color: AppColors.slate500))),
          Text(v, style: TextStyle(fontSize: bold ? 15 : 13, fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
        ]),
      );
}

// ─── Create order (POS / phone order) ───────────────────────────────────────

class _Line {
  final Product product;
  final ProductVariant variant;
  int quantity;
  _Line(this.product, this.variant, this.quantity);
  num get unitPrice =>
      (variant.salePrice != null && variant.salePrice! > 0) ? variant.salePrice! : (variant.price > 0 ? variant.price : product.displayPrice);
}

/// Web sales "Tạo đơn": customer, payment and lines. The web asks for raw variant ids;
/// here staff search the catalogue and pick colour / size.
class SalesCreateOrderScreen extends StatefulWidget {
  const SalesCreateOrderScreen({super.key});

  @override
  State<SalesCreateOrderScreen> createState() => _SalesCreateOrderScreenState();
}

class _SalesCreateOrderScreenState extends State<SalesCreateOrderScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();
  final _note = TextEditingController();
  String _payment = 'CASH';
  final _lines = <_Line>[];
  bool _saving = false;

  static const _payments = [
    ('CASH', 'Tiền mặt tại quầy'),
    ('CARD', 'Thẻ tại quầy'),
    ('COD', 'COD'),
    ('BANK_TRANSFER', 'Chuyển khoản'),
    ('MOMO', 'MoMo'),
  ];

  @override
  void dispose() {
    for (final c in [_name, _phone, _email, _address, _note]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _addLine() async {
    final picked = await showModalBottomSheet<(Product, ProductVariant)>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (_) => const _VariantPicker(),
    );
    if (picked == null) return;
    final (p, v) = picked;
    setState(() {
      final same = _lines.where((l) => l.variant.id == v.id).firstOrNull;
      if (same != null) {
        same.quantity++;
      } else {
        _lines.add(_Line(p, v, 1));
      }
    });
  }

  num get _total => _lines.fold<num>(0, (a, l) => a + l.unitPrice * l.quantity);

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty || _phone.text.trim().isEmpty) return Toast.error('Vui lòng nhập tên khách hàng và số điện thoại.');
    if (!RegExp(r'^[0-9+\s-]{8,15}$').hasMatch(_phone.text.trim())) return Toast.error('Số điện thoại không hợp lệ.');
    if (_lines.isEmpty) return Toast.error('Thêm ít nhất một sản phẩm.');
    final over = _lines.where((l) => l.variant.availableQuantity != null && l.quantity > l.variant.availableQuantity!).firstOrNull;
    if (over != null) return Toast.error('"${over.product.name}" chỉ còn ${over.variant.availableQuantity} sản phẩm.');
    setState(() => _saving = true);
    try {
      final saved = await _api.post('$_base/orders', {
        'customerName': _name.text.trim(),
        'phone': _phone.text.trim(),
        if (_email.text.trim().isNotEmpty) 'customerEmail': _email.text.trim(),
        'shippingAddress': _address.text.trim().isEmpty ? 'Thanh toán & nhận tại cửa hàng (POS)' : _address.text.trim(),
        'paymentMethod': _payment,
        'items': [
          for (final l in _lines) {'variantId': l.variant.id, 'quantity': l.quantity},
        ],
        if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(),
      });
      Toast.success('Đã tạo đơn ${saved is Map ? saved['orderCode'] ?? '' : ''}');
      if (!mounted) return;
      if (saved is Map && saved['id'] != null) {
        context.pushReplacement('/staff/sales/orders/${saved['id']}');
      } else {
        context.pop();
      }
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không tạo được đơn hàng');
    }
    if (mounted) setState(() => _saving = false);
  }

  Widget _field(String label, TextEditingController c, {bool required = false, TextInputType? type, int lines = 1, String? hint}) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          FieldLabel(label, required: required),
          TextField(
            controller: c,
            keyboardType: type,
            maxLines: lines,
            decoration: InputDecoration(isDense: true, hintText: hint, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
          ),
        ]),
      );

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/sales/orders',
        title: 'Tạo đơn hàng',
        body: ListView(padding: const EdgeInsets.all(16), children: [
          AppCard(
            radius: 14,
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Khách hàng', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              _field('Họ tên', _name, required: true),
              _field('Số điện thoại', _phone, required: true, type: TextInputType.phone),
              _field('Email', _email, type: TextInputType.emailAddress),
              _field('Địa chỉ giao hàng', _address, lines: 2, hint: 'Để trống nếu khách nhận tại cửa hàng'),
            ]),
          ),
          const SectionLabel('Thanh toán'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final (v, l) in _payments)
              ChoiceChip(
                label: Text(l, style: TextStyle(fontSize: 12.5, color: _payment == v ? Colors.white : AppColors.slate700)),
                selected: _payment == v,
                selectedColor: AppColors.slate900,
                showCheckmark: false,
                onSelected: (_) => setState(() => _payment = v),
              ),
          ]),
          SectionLabel('Sản phẩm (${_lines.length})'),
          for (final l in _lines)
            RecordCard(
              child: Row(children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: SizedBox(width: 46, height: 56, child: NetImage(l.product.primaryImage)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(l.product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    Text([l.variant.color, l.variant.size].where((s) => s.isNotEmpty).join(' / '),
                        style: const TextStyle(fontSize: 11.5, color: AppColors.slate500)),
                    Text(vnd(l.unitPrice), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                  ]),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => setState(() => l.quantity > 1 ? l.quantity-- : _lines.remove(l)),
                  icon: Icon(l.quantity > 1 ? Icons.remove : Icons.delete_outline, size: 18),
                ),
                Text('${l.quantity}', style: const TextStyle(fontWeight: FontWeight.w800)),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => setState(() => l.quantity++),
                  icon: const Icon(Icons.add, size: 18),
                ),
              ]),
            ),
          StaffButton('Thêm sản phẩm', style: PillStyle.outline, height: 42, icon: Icons.add, expand: true, onPressed: _addLine),
          const SizedBox(height: 10),
          _field('Ghi chú', _note, lines: 2),
          Row(children: [
            const Expanded(child: Text('Tạm tính', style: TextStyle(color: AppColors.slate500))),
            Text(vnd(_total), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 12),
          StaffButton('Tạo đơn hàng', expand: true, height: 48, loading: _saving, onPressed: _saving ? null : _submit),
          const SizedBox(height: 24),
        ]),
      );
}

/// Search the catalogue, open a product, pick one of its variants.
class _VariantPicker extends StatefulWidget {
  const _VariantPicker();

  @override
  State<_VariantPicker> createState() => _VariantPickerState();
}

class _VariantPickerState extends State<_VariantPicker> {
  Timer? _debounce;
  List<Product> _results = [];
  Product? _product;
  bool _loading = false;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _search(String q) async {
    if (q.trim().length < 2) return setState(() => _results = []);
    setState(() => _loading = true);
    try {
      final page = await ProductService.getProducts({'q': q.trim(), 'pageSize': 20});
      if (mounted) setState(() => _results = page.items);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _open(Product p) async {
    setState(() => _loading = true);
    final full = await ProductService.bySlug(p.slug);
    if (!mounted) return;
    setState(() {
      _product = full ?? p;
      _loading = false;
    });
  }

  String _variantLabel(ProductVariant v) {
    final s = [v.color, v.size].where((s) => s.isNotEmpty).join(' / ');
    return s.isEmpty ? v.sku : s;
  }

  @override
  Widget build(BuildContext context) {
    final p = _product;
    final variants = p?.variants.where((v) => v.id != null).toList() ?? const <ProductVariant>[];
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.85,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: p == null
              ? StaffSearch(
                  hint: 'Tìm sản phẩm theo tên...',
                  onChanged: (v) {
                    _debounce?.cancel();
                    _debounce = Timer(const Duration(milliseconds: 350), () => _search(v));
                  },
                )
              : Row(children: [
                  IconButton(onPressed: () => setState(() => _product = null), icon: const Icon(Icons.arrow_back)),
                  Expanded(child: Text(p.name, maxLines: 2, style: const TextStyle(fontWeight: FontWeight.w700))),
                ]),
        ),
        if (_loading) const LinearProgressIndicator(minHeight: 2),
        Expanded(
          child: p == null
              ? ListView(children: [
                  if (_results.isEmpty && !_loading)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('Gõ ít nhất 2 ký tự để tìm.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate500)),
                    ),
                  for (final r in _results)
                    ListTile(
                      leading: ClipRRect(borderRadius: BorderRadius.circular(6), child: SizedBox(width: 40, height: 48, child: NetImage(r.primaryImage))),
                      title: Text(r.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13.5)),
                      subtitle: Text(vnd(r.displayPrice), style: const TextStyle(fontSize: 12)),
                      onTap: () => _open(r),
                    ),
                ])
              : ListView(children: [
                  if (variants.isEmpty)
                    const Padding(padding: EdgeInsets.all(24), child: Text('Sản phẩm chưa có biến thể để bán.', textAlign: TextAlign.center)),
                  for (final v in variants)
                    ListTile(
                      enabled: (v.availableQuantity ?? v.stock) > 0,
                      title: Text(_variantLabel(v)),
                      subtitle: Text('${v.sku} · còn ${v.availableQuantity ?? v.stock}'),
                      trailing: Text(vnd((v.salePrice != null && v.salePrice! > 0) ? v.salePrice! : (v.price > 0 ? v.price : p.displayPrice)),
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      onTap: () => Navigator.pop(context, (p, v)),
                    ),
                ]),
        ),
      ]),
    );
  }
}
