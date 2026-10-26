import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';
import 'staff_common.dart';

/// Shipping workspace (web staff/dashboard/shipping/*), on /api/staff/shipping.

const _base = '/api/staff/shipping';
final _api = Api.instance;

Future<List<Map<String, dynamic>>> _list(String path) async => asList(await _api.get('$_base$path')).whereType<Map<String, dynamic>>().toList();

/// Flattens a Shipment entity (order nested under `order`), like web lib/shipping.ts toShipment.
Map<String, dynamic> _shipment(Map raw) {
  final o = (raw['order'] as Map?) ?? const {};
  return {
    'id': raw['id'],
    'status': raw['status'] ?? 'PENDING',
    'trackingCode': raw['trackingCode'],
    'carrierName': raw['carrierName'],
    'codAmount': toNum(raw['codAmount']),
    'codReconciled': raw['codReconciled'] == true,
    'handoverAt': raw['handoverAt'],
    'deliveredAt': raw['deliveredAt'],
    'orderCode': o['orderCode'],
    'customerName': o['customerName'],
    'customerPhone': o['customerPhone'] ?? o['phone'],
    'shippingAddress': o['shippingAddress'] ?? o['shippingAddressSnapshot'],
    'createdAt': o['createdAt'],
  };
}

const _shipmentStatus = {
  'PENDING': ('Chờ bàn giao ĐVVC', 'gray'),
  'HANDED_OVER': ('Đã bàn giao ĐVVC', 'gray'),
  'IN_TRANSIT': ('Đang giao hàng', 'gray'),
  'DELIVERED': ('Đã giao', 'green'),
  'EXCEPTION': ('Có sự cố', 'red'),
  'RETURNED': ('Hoàn về kho', 'amber'),
};

Widget _shipmentBadge(String s) => ToneBadge(_shipmentStatus[s]?.$1 ?? s, tone: _shipmentStatus[s]?.$2 ?? 'gray');

const _exceptionTypes = [
  ('WRONG_ADDRESS', 'Sai địa chỉ'),
  ('NOT_AT_HOME', 'Vắng nhà'),
  ('REFUSED', 'Từ chối nhận'),
  ('DAMAGED', 'Hàng hỏng'),
  ('LOST', 'Thất lạc'),
  ('WRONG_ITEM', 'Sai hàng'),
  ('PHONE_OFF', 'Không liên lạc được'),
  ('CARRIER_DELAY', 'Hãng trễ'),
  ('OTHER', 'Khác'),
];

String _exceptionLabel(String? t) =>
    _exceptionTypes.where((e) => e.$1 == t).firstOrNull?.$2 ??
    const {'ADDRESS_NOT_FOUND': 'Không tìm thấy địa chỉ', 'DELAY': 'Giao trễ', 'FAILED_DELIVERY': 'Giao thất bại'}[t] ??
    t ??
    'Khác';

const _carriers = [('GHN', 'GHN'), ('GHTK', 'GHTK'), ('J&T', 'J&T Express'), ('VIETTEL_POST', 'Viettel Post'), ('VNPOST', 'VNPost')];

// Carrier names are typed by hand, so "GHN" and "GIAO_HANG_NHANH" both exist (web lib/shipping.ts carrierLabel).
const _carrierNames = {
  'GHN': 'GHN',
  'GIAO_HANG_NHANH': 'GHN',
  'GIAO HANG NHANH': 'GHN',
  'GHTK': 'GHTK',
  'GIAO_HANG_TIET_KIEM': 'GHTK',
  'GIAO HANG TIET KIEM': 'GHTK',
  'VIETTEL_POST': 'Viettel Post',
  'VIETTELPOST': 'Viettel Post',
  'VTP': 'Viettel Post',
  'VNPOST': 'VNPost',
  'VN_POST': 'VNPost',
  'JNT': 'J&T Express',
  'J&T': 'J&T Express',
  'JT_EXPRESS': 'J&T Express',
  'NINJAVAN': 'Ninja Van',
  'NINJA_VAN': 'Ninja Van',
  'BEST': 'BEST Express',
  'BEST_EXPRESS': 'BEST Express',
};

String? _carrierLabel(dynamic name) => name == null ? null : _carrierNames['$name'.trim().toUpperCase()] ?? '$name';

// ─── Dashboard ──────────────────────────────────────────────────────────────

class ShippingDashboardScreen extends StatelessWidget {
  const ShippingDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/staff/shipping',
    title: 'Tổng quan vận chuyển',
    body: Loader<(int, List<Map<String, dynamic>>, int)>(
      load: () async {
        final r = await Future.wait([_list('/orders'), _list('/shipments'), _list('/exceptions')]);
        return (r[0].length, r[1].map(_shipment).toList(), r[2].where((e) => e['status'] == 'OPEN').length);
      },
      builder: (context, data, reload) {
        final (ready, shipments, openExc) = data;
        int by(String s) => shipments.where((x) => x['status'] == s).length;
        final codPending = shipments.where((s) => s['status'] == 'DELIVERED' && toNum(s['codAmount']) > 0 && s['codReconciled'] != true);
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            StatGrid([
              StatTile(label: 'Chờ tạo vận đơn', value: '$ready', icon: Icons.assignment_outlined, onTap: () => context.go('/staff/shipping/orders')),
              StatTile(
                label: 'Chờ bàn giao ĐVVC',
                value: '${by('PENDING')}',
                icon: Icons.inventory_2_outlined,
                onTap: () => context.go('/staff/shipping/shipments?status=PENDING'),
              ),
              StatTile(
                label: 'Đang giao',
                value: '${by('HANDED_OVER') + by('IN_TRANSIT')}',
                icon: Icons.local_shipping_outlined,
                onTap: () => context.go('/staff/shipping/shipments?status=IN_TRANSIT'),
              ),
              StatTile(
                label: 'Sự cố đang mở',
                value: '$openExc',
                icon: Icons.report_problem_outlined,
                alert: openExc > 0,
                onTap: () => context.go('/staff/shipping/exceptions'),
              ),
              StatTile(
                label: 'Đã giao',
                value: '${by('DELIVERED')}',
                icon: Icons.check_circle_outline,
                onTap: () => context.go('/staff/shipping/shipments?status=DELIVERED'),
              ),
              StatTile(
                label: 'COD chờ đối soát',
                value: fmtMoneyShort(codPending.fold<num>(0, (a, s) => a + toNum(s['codAmount']))),
                hint: '${codPending.length} kiện',
                icon: Icons.payments_outlined,
                onTap: () => context.go('/staff/shipping/cod'),
              ),
            ]),
          ],
        );
      },
    ),
  );
}

// ─── Orders awaiting a waybill ──────────────────────────────────────────────

class ShippingOrdersScreen extends StatefulWidget {
  const ShippingOrdersScreen({super.key});

  @override
  State<ShippingOrdersScreen> createState() => _ShippingOrdersScreenState();
}

class _ShippingOrdersScreenState extends State<ShippingOrdersScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _q = '';

  Future<void> _create(Map o) async {
    final orderId = o['id'] ?? o['orderId'];
    final code = '${o['orderCode'] ?? orderId}';
    final carrier = '${o['shippingProvider'] ?? 'GHN'}';
    // Internal code when the carrier has not issued one yet: carrier prefix + order code (unique), as on the web.
    final suffix = DateTime.now().millisecondsSinceEpoch.toString().substring(7);
    String auto(String c) {
      final prefix = c.toUpperCase().replaceAll(RegExp('[^A-Z]'), '');
      return '${prefix.isEmpty ? 'ET' : prefix.substring(0, prefix.length.clamp(0, 4))}-$code-$suffix';
    }

    final r = await formSheet(
      context,
      title: 'Tạo vận đơn',
      subtitle: 'Đơn $code · ${o['customerName'] ?? ''}\nĐể trống mã vận đơn sẽ tự tạo mã nội bộ theo hãng đã chọn.',
      fields: [
        FormFieldSpec('carrier', 'Hãng vận chuyển', options: _carriers, initial: _carriers.any((c) => c.$1 == carrier) ? carrier : 'GHN'),
        FormFieldSpec('tracking', 'Mã vận đơn', initial: '${o['trackingCode'] ?? ''}', hint: 'VD: ${auto(carrier)}'),
      ],
      confirm: 'Tạo vận đơn',
      submit: (v) => _api.post('$_base/shipments', {
        'orderId': orderId,
        'carrierName': v['carrier'],
        'trackingCode': v['tracking']!.isEmpty ? auto(v['carrier']!) : v['tracking'],
      }),
    );
    if (r != null) {
      Toast.success('Đã tạo vận đơn cho đơn $code. Tiếp tục ở mục Kiện hàng.');
      await _loader.currentState?.reload();
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/staff/shipping/orders',
    title: 'Đơn chờ tạo vận đơn',
    body: Loader<List<Map<String, dynamic>>>(
      key: _loader,
      load: () => _list('/orders'),
      builder: (context, orders, reload) {
        final q = _q.toLowerCase();
        final shown = orders
            .where((o) => q.isEmpty || '${o['orderCode']} ${o['customerName']} ${o['customerPhone'] ?? o['phone']}'.toLowerCase().contains(q))
            .toList();
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Đơn kho đã bàn giao: chọn hãng và tạo vận đơn để bắt đầu giao.', style: TextStyle(fontSize: 12.5, color: AppColors.slate600)),
            const SizedBox(height: 10),
            StaffSearch(hint: 'Tìm mã đơn, khách hàng, SĐT...', onChanged: (v) => setState(() => _q = v)),
            const SizedBox(height: 12),
            if (shown.isEmpty) const EmptyPanel(icon: Icons.check_circle_outline, title: 'Không có đơn chờ tạo vận đơn'),
            for (final o in shown)
              RecordCard(
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
                        Text(vnd(toNum(o['totalAmount'] ?? o['total'])), style: const TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                    InfoLine(Icons.person_outline, '${o['customerName'] ?? ''} · ${o['customerPhone'] ?? o['phone'] ?? ''}'),
                    if (o['shippingAddress'] != null) InfoLine(Icons.place_outlined, '${o['shippingAddress']}'),
                    InfoLine(Icons.payments_outlined, paymentMethodLabel[o['paymentMethod']] ?? '${o['paymentMethod'] ?? ''}'),
                    const SizedBox(height: 10),
                    StaffButton('Tạo vận đơn', expand: true, height: 42, icon: Icons.local_shipping_outlined, onPressed: () => _create(o)),
                  ],
                ),
              ),
          ],
        );
      },
    ),
  );
}

// ─── Shipments ──────────────────────────────────────────────────────────────

class ShipmentsScreen extends StatefulWidget {
  final String initialStatus;
  const ShipmentsScreen({super.key, this.initialStatus = 'ACTIVE'});

  @override
  State<ShipmentsScreen> createState() => _ShipmentsScreenState();
}

class _ShipmentsScreenState extends State<ShipmentsScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  late String _status = widget.initialStatus;
  String _q = '';

  bool _match(Map s) => switch (_status) {
    'ALL' => true,
    'ACTIVE' => const ['PENDING', 'HANDED_OVER', 'IN_TRANSIT'].contains(s['status']),
    'IN_TRANSIT' => s['status'] == 'IN_TRANSIT' || s['status'] == 'HANDED_OVER',
    _ => s['status'] == _status,
  };

  Future<void> _post(Map s, String path, String msg, [Map<String, dynamic>? body]) async {
    await runAction(() => _api.post('$_base/shipments/${s['id']}/$path', body), msg);
    await _loader.currentState?.reload();
  }

  Future<void> _proof(Map s) async {
    final cod = toNum(s['codAmount']) > 0;
    final r = await formSheet(
      context,
      title: 'Xác nhận giao thành công',
      subtitle: 'Đơn ${s['orderCode']}${cod ? ' · Thu hộ ${vnd(toNum(s['codAmount']))}' : ''}',
      fields: [
        FormFieldSpec('receiver', 'Người nhận', initial: '${s['customerName'] ?? ''}', required: true),
        const FormFieldSpec('image', 'Link ảnh bằng chứng', type: TextInputType.url, hint: 'https://...'),
        const FormFieldSpec('note', 'Ghi chú', lines: 2),
      ],
      confirm: 'Đã giao',
      submit: (v) => _api.post('$_base/shipments/${s['id']}/proof', {
        'receiverName': v['receiver'],
        if (v['image']!.isNotEmpty) 'imageUrl': v['image'],
        if (v['note']!.isNotEmpty) 'note': v['note'],
      }),
    );
    if (r != null) {
      Toast.success('Đã xác nhận giao đơn ${s['orderCode']}');
      await _loader.currentState?.reload();
    }
  }

  Future<void> _report(Map s) async {
    final r = await formSheet(
      context,
      title: 'Báo sự cố giao hàng',
      subtitle: 'Đơn ${s['orderCode']} · ${s['trackingCode'] ?? ''}',
      fields: const [
        FormFieldSpec('type', 'Loại sự cố', options: _exceptionTypes),
        FormFieldSpec('desc', 'Mô tả', required: true, lines: 3),
      ],
      confirm: 'Báo sự cố',
      danger: true,
      submit: (v) => _api.post('$_base/exceptions', {'shipmentId': s['id'], 'type': v['type'], 'description': v['desc']}),
    );
    if (r != null) {
      Toast.success('Đã ghi nhận sự cố');
      await _loader.currentState?.reload();
    }
  }

  Future<void> _editTracking(Map s) async {
    final r = await formSheet(
      context,
      title: 'Sửa mã vận đơn',
      fields: [FormFieldSpec('code', 'Mã vận đơn', initial: '${s['trackingCode'] ?? ''}', required: true)],
      confirm: 'Lưu',
      submit: (v) => _api.put('$_base/shipments/${s['id']}/tracking-code', {'trackingCode': v['code']}),
    );
    if (r != null) {
      Toast.success('Đã cập nhật mã vận đơn');
      await _loader.currentState?.reload();
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/staff/shipping/shipments',
    title: 'Kiện hàng',
    body: Loader<List<Map<String, dynamic>>>(
      key: _loader,
      load: () async => (await _list('/shipments')).map(_shipment).toList(),
      builder: (context, all, reload) {
        final q = _q.toLowerCase();
        final shown = all
            .where(_match)
            .where((s) => q.isEmpty || '${s['orderCode']} ${s['trackingCode']} ${s['customerName']} ${s['customerPhone']}'.toLowerCase().contains(q))
            .toList();
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            StaffSearch(hint: 'Tìm mã đơn, mã vận đơn, khách hàng...', onChanged: (v) => setState(() => _q = v)),
            const SizedBox(height: 10),
            FilterTabs(
              tabs: const [
                ('ACTIVE', 'Đang xử lý'),
                ('PENDING', 'Chờ bàn giao'),
                ('IN_TRANSIT', 'Đang giao'),
                ('DELIVERED', 'Đã giao'),
                ('EXCEPTION', 'Sự cố'),
                ('RETURNED', 'Hoàn kho'),
                ('ALL', 'Tất cả'),
              ],
              value: _status,
              activeColor: AppColors.slate900,
              onChanged: (v) => setState(() => _status = v),
            ),
            const SizedBox(height: 12),
            if (shown.isEmpty) const EmptyPanel(icon: Icons.local_shipping_outlined, title: 'Không có kiện hàng'),
            for (final s in shown.take(150)) _card(s),
          ],
        );
      },
    ),
  );

  Widget _card(Map<String, dynamic> s) {
    final st = '${s['status']}';
    final canReport = const ['PENDING', 'HANDED_OVER', 'IN_TRANSIT'].contains(st);
    return RecordCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${s['orderCode'] ?? '#${s['id']}'}',
                  style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800),
                ),
              ),
              _shipmentBadge(st),
            ],
          ),
          InfoLine(Icons.qr_code_2, '${_carrierLabel(s['carrierName']) ?? '—'} · ${s['trackingCode'] ?? 'chưa có mã'}', mono: true),
          InfoLine(Icons.person_outline, '${s['customerName'] ?? ''} · ${s['customerPhone'] ?? ''}'),
          if (s['shippingAddress'] != null) InfoLine(Icons.place_outlined, '${s['shippingAddress']}'),
          if (toNum(s['codAmount']) > 0) InfoLine(Icons.payments_outlined, 'Thu hộ ${vnd(toNum(s['codAmount']))}'),
          if (st == 'DELIVERED' && s['deliveredAt'] != null) InfoLine(Icons.check, 'Giao lúc ${formatDateTime(s['deliveredAt'])}'),
          if (st != 'DELIVERED' && s['handoverAt'] != null) InfoLine(Icons.handshake_outlined, 'Bàn giao lúc ${formatDateTime(s['handoverAt'])}'),
          if (st == 'PENDING' || st == 'HANDED_OVER' || st == 'IN_TRANSIT') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                if (st == 'PENDING')
                  Expanded(
                    child: StaffButton(
                      'Bàn giao ĐVVC',
                      height: 40,
                      icon: Icons.handshake_outlined,
                      onPressed: () => _post(s, 'handover', 'Đã bàn giao kiện ${s['orderCode']} cho ${_carrierLabel(s['carrierName']) ?? 'hãng'}'),
                    ),
                  ),
                if (st == 'HANDED_OVER')
                  Expanded(
                    child: StaffButton(
                      'Bắt đầu giao',
                      height: 40,
                      icon: Icons.local_shipping_outlined,
                      onPressed: () => _post(s, 'shipping', 'Kiện ${s['orderCode']} đang được giao'),
                    ),
                  ),
                if (st == 'IN_TRANSIT')
                  Expanded(
                    child: StaffButton('Đã giao', height: 40, icon: Icons.check, onPressed: () => _proof(s)),
                  ),
                const SizedBox(width: 8),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_horiz, color: AppColors.slate500),
                  onSelected: (v) => v == 'tracking' ? _editTracking(s) : _report(s),
                  itemBuilder: (_) => [
                    if (st == 'PENDING' || st == 'HANDED_OVER') const PopupMenuItem(value: 'tracking', child: Text('Sửa mã vận đơn')),
                    if (canReport) const PopupMenuItem(value: 'report', child: Text('Báo sự cố')),
                  ],
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Exceptions ─────────────────────────────────────────────────────────────

class ShippingExceptionsScreen extends StatefulWidget {
  const ShippingExceptionsScreen({super.key});

  @override
  State<ShippingExceptionsScreen> createState() => _ShippingExceptionsScreenState();
}

class _ShippingExceptionsScreenState extends State<ShippingExceptionsScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _status = 'OPEN';

  Future<void> _resolve(Map e, bool returnToSender) async {
    final r = await formSheet(
      context,
      title: returnToSender ? 'Hoàn hàng về kho' : 'Đã xử lý xong sự cố',
      subtitle: returnToSender
          ? 'Đơn sẽ bị hủy, hàng được cộng lại vào tồn kho. Không thể hoàn tác.'
          : 'Kiện quay lại bước trước sự cố để tiếp tục giao.',
      fields: const [FormFieldSpec('note', 'Cách xử lý', required: true, lines: 2)],
      confirm: returnToSender ? 'Hoàn về kho' : 'Đã xử lý',
      danger: returnToSender,
      submit: (v) => _api.put('$_base/exceptions/${e['id']}/resolve', {'note': v['note'], 'returnToSender': returnToSender}),
    );
    if (r != null) {
      Toast.success(returnToSender ? 'Đã chuyển kiện hoàn về kho' : 'Đã đóng sự cố');
      await _loader.currentState?.reload();
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/staff/shipping/exceptions',
    title: 'Sự cố giao hàng',
    body: Loader<List<Map<String, dynamic>>>(
      key: _loader,
      load: () => _list('/exceptions'),
      builder: (context, all, reload) {
        final shown = all.where((e) => _status == 'ALL' || e['status'] == _status).toList();
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            FilterTabs(
              tabs: [
                ('OPEN', 'Đang mở (${all.where((e) => e['status'] == 'OPEN').length})'),
                ('RESOLVED', 'Đã xử lý'),
                ('RETURNED', 'Hoàn kho'),
                ('ALL', 'Tất cả'),
              ],
              value: _status,
              activeColor: AppColors.slate900,
              onChanged: (v) => setState(() => _status = v),
            ),
            const SizedBox(height: 12),
            if (shown.isEmpty) const EmptyPanel(icon: Icons.check_circle_outline, title: 'Không có sự cố'),
            for (final e in shown)
              Builder(
                builder: (context) {
                  final s = e['shipment'] is Map ? _shipment(e['shipment'] as Map) : const <String, dynamic>{};
                  final open = e['status'] == 'OPEN';
                  return RecordCard(
                    accent: open ? const Color(0xFFFECACA) : null,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(_exceptionLabel(e['exceptionType'] as String?), style: const TextStyle(fontWeight: FontWeight.w700)),
                            ),
                            ToneBadge(
                              const {'OPEN': 'Đang mở', 'RESOLVED': 'Đã xử lý', 'RETURNED': 'Hoàn kho'}[e['status']] ?? '${e['status']}',
                              tone: switch (e['status']) {
                                'OPEN' => 'red',
                                'RESOLVED' => 'green',
                                _ => 'amber',
                              },
                            ),
                          ],
                        ),
                        InfoLine(
                          Icons.receipt_long_outlined,
                          '${s['orderCode'] ?? ''} · ${_carrierLabel(s['carrierName']) ?? ''} ${s['trackingCode'] ?? ''}',
                        ),
                        if (s['customerName'] != null) InfoLine(Icons.person_outline, '${s['customerName']} · ${s['customerPhone'] ?? ''}'),
                        if ('${e['description'] ?? ''}'.isNotEmpty) InfoLine(Icons.notes, '${e['description']}'),
                        if ('${e['resolutionNote'] ?? ''}'.isNotEmpty) InfoLine(Icons.done_all, 'Xử lý: ${e['resolutionNote']}'),
                        InfoLine(Icons.schedule, formatDateTime(e['createdAt'])),
                        if (open) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: StaffButton('Hoàn về kho', style: PillStyle.outline, height: 40, onPressed: () => _resolve(e, true)),
                              ),
                              const SizedBox(width: 8),
                              Expanded(child: StaffButton('Đã xử lý', height: 40, onPressed: () => _resolve(e, false))),
                            ],
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
          ],
        );
      },
    ),
  );
}

// ─── COD reconciliation ─────────────────────────────────────────────────────

class CodScreen extends StatefulWidget {
  const CodScreen({super.key});

  @override
  State<CodScreen> createState() => _CodScreenState();
}

class _CodScreenState extends State<CodScreen> {
  final _loader = GlobalKey<LoaderState<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>>();
  final _picked = <int>{};

  /// One reconciliation sheet: which parcels it settled.
  Future<void> _detail(Map h) async {
    Map d;
    try {
      d = await _api.get('$_base/cod/reconciliations/${h['id']}') as Map;
    } catch (e) {
      return Toast.error(e is ApiException ? e.message : 'Không thể xem chi tiết phiếu đối soát');
    }
    if (!mounted) return;
    final items = asList(d['items']).whereType<Map>().toList();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (c) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        builder: (c, scroll) => ListView(controller: scroll, padding: const EdgeInsets.all(20), children: [
          Text('${d['reconciliationCode'] ?? h['reconciliationCode']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w900, fontSize: 16)),
          InfoLine(Icons.schedule, '${formatDateTime(d['reconciledAt'])} · ${d['reconciledByName'] ?? ''}'),
          if ('${d['note'] ?? ''}'.isNotEmpty) InfoLine(Icons.notes, '${d['note']}'),
          const SizedBox(height: 10),
          for (final i in items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${i['orderCode'] ?? '#${i['shipmentId']}'}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700)),
                    Text('${i['trackingCode'] ?? ''} · ${i['customerName'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                  ]),
                ),
                Text(vnd(toNum(i['codAmount'])), style: const TextStyle(fontWeight: FontWeight.w700)),
              ]),
            ),
          const Divider(),
          Row(children: [
            Expanded(child: Text('${toInt(d['itemCount'] ?? items.length)} kiện', style: const TextStyle(color: AppColors.slate500))),
            Text(vnd(toNum(d['totalCodAmount'])), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          ]),
        ]),
      ),
    );
  }

  Future<void> _reconcile(List<Map<String, dynamic>> pending) async {
    final chosen = pending.where((s) => _picked.contains(toInt(s['id']))).toList();
    final total = chosen.fold<num>(0, (a, s) => a + toNum(s['codAmount']));
    final r = await formSheet(
      context,
      title: 'Đối soát COD',
      subtitle: '${chosen.length} kiện · tổng ${vnd(total)}. Chỉ xác nhận khi hãng đã chuyển đủ tiền.',
      fields: const [FormFieldSpec('note', 'Ghi chú', hint: 'Mã phiếu chuyển tiền của hãng...')],
      confirm: 'Xác nhận đối soát',
      submit: (v) => _api.post('$_base/cod/reconciliation', {'shipmentIds': _picked.toList(), if (v['note']!.isNotEmpty) 'note': v['note']}),
    );
    if (r != null) {
      Toast.success('Đã đối soát ${chosen.length} kiện (${vnd(total)})');
      setState(_picked.clear);
      await _loader.currentState?.reload();
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/staff/shipping/cod',
    title: 'Đối soát COD',
    body: Loader<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>(
      key: _loader,
      load: () async => (await _list('/cod'), await _list('/cod/reconciliations?page=0&size=50')),
      builder: (context, data, reload) {
        final (pending, history) = data;
        final total = pending.where((s) => _picked.contains(toInt(s['id']))).fold<num>(0, (a, s) => a + toNum(s['codAmount']));
        return Stack(
          children: [
            ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
              children: [
                StatGrid([
                  StatTile(label: 'Kiện chờ đối soát', value: '${pending.length}', icon: Icons.inventory_2_outlined),
                  StatTile(
                    label: 'Tiền COD chờ đối soát',
                    value: fmtMoneyShort(pending.fold<num>(0, (a, s) => a + toNum(s['codAmount']))),
                    icon: Icons.payments_outlined,
                  ),
                ]),
                SectionLabel(
                  'Chờ đối soát',
                  trailing: pending.isEmpty
                      ? null
                      : TextButton(
                          style: TextButton.styleFrom(foregroundColor: AppColors.slate700),
                          onPressed: () =>
                              setState(() => _picked.length == pending.length ? _picked.clear() : _picked.addAll(pending.map((s) => toInt(s['id'])))),
                          child: Text(_picked.length == pending.length ? 'Bỏ chọn' : 'Chọn tất cả'),
                        ),
                ),
                if (pending.isEmpty) const EmptyPanel(icon: Icons.check_circle_outline, title: 'Không còn COD chờ đối soát'),
                for (final s in pending)
                  Builder(
                    builder: (context) {
                      final o = (s['order'] as Map?) ?? const {};
                      final id = toInt(s['id']);
                      return RecordCard(
                        onTap: () => setState(() => _picked.contains(id) ? _picked.remove(id) : _picked.add(id)),
                        child: Row(
                          children: [
                            Checkbox(
                              value: _picked.contains(id),
                              activeColor: AppColors.slate900,
                              onChanged: (_) => setState(() => _picked.contains(id) ? _picked.remove(id) : _picked.add(id)),
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${o['orderCode'] ?? '#$id'}',
                                    style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700),
                                  ),
                                  InfoLine(Icons.qr_code_2, '${_carrierLabel(s['carrierName']) ?? ''} · ${s['trackingCode'] ?? ''}'),
                                  if (s['deliveredAt'] != null) InfoLine(Icons.check, 'Giao ${formatDateTime(s['deliveredAt'])}'),
                                ],
                              ),
                            ),
                            Text(vnd(toNum(s['codAmount'])), style: const TextStyle(fontWeight: FontWeight.w800)),
                          ],
                        ),
                      );
                    },
                  ),
                const SectionLabel('Lịch sử đối soát'),
                if (history.isEmpty) const Text('Chưa có phiên đối soát.', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
                for (final h in history)
                  RecordCard(
                    onTap: () => _detail(h),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${h['reconciliationCode']}',
                                style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700),
                              ),
                              InfoLine(
                                Icons.schedule,
                                '${formatDateTime(h['reconciledAt'])} · ${h['reconciledByName'] ?? ''} · ${h['itemCount']} kiện',
                              ),
                            ],
                          ),
                        ),
                        Text(vnd(toNum(h['totalCodAmount'])), style: const TextStyle(fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
              ],
            ),
            if (_picked.isNotEmpty)
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: StaffButton('Đối soát ${_picked.length} kiện · ${vnd(total)}', height: 50, onPressed: () => _reconcile(pending)),
              ),
          ],
        );
      },
    ),
  );
}
