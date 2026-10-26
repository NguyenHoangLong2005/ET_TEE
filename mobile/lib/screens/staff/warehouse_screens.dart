import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';
import 'staff_common.dart';

/// Warehouse workspace (web staff/dashboard/warehouse/*), on /api/staff/warehouse.

const _base = '/api/staff/warehouse';
final _api = Api.instance;

Future<List<Map<String, dynamic>>> _list(String path) async =>
    asList(await _api.get('$_base$path')).whereType<Map<String, dynamic>>().toList();

int _available(Map i) => toInt(i['quantityOnHand']) - toInt(i['quantityReserved']);

// ─── Dashboard ──────────────────────────────────────────────────────────────

class WarehouseDashboardScreen extends StatelessWidget {
  const WarehouseDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/warehouse',
        title: 'Tổng quan kho hàng',
        body: Loader<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>(
          load: () async => (await _list('/orders'), await _list('/replenishment')),
          builder: (context, data, reload) {
            final (orders, low) = data;
            int count(String s) => orders.where((o) => o['status'] == s).length;
            return ListView(padding: const EdgeInsets.all(16), children: [
              const SectionLabel('Đơn đang chờ ở từng bước'),
              StatGrid([
                StatTile(label: 'Chờ lấy hàng', value: '${count('CONFIRMED')}', icon: Icons.assignment_outlined,
                    onTap: () => context.go('/staff/warehouse/fulfillment?tab=CONFIRMED')),
                StatTile(label: 'Chờ đóng gói', value: '${count('PICKING')}', icon: Icons.inventory_2_outlined,
                    onTap: () => context.go('/staff/warehouse/fulfillment?tab=PICKING')),
                StatTile(label: 'Chờ bàn giao', value: '${count('PACKED')}', icon: Icons.local_shipping_outlined,
                    onTap: () => context.go('/staff/warehouse/fulfillment?tab=PACKED')),
                StatTile(label: 'Tồn kho thấp', value: '${low.length}', icon: Icons.warning_amber_rounded, alert: low.isNotEmpty,
                    hint: 'Chạm ngưỡng nhập lại', onTap: () => context.go('/staff/warehouse/replenishment')),
              ]),
              const SectionLabel('Thao tác nhanh'),
              for (final (label, href, icon) in const [
                ('Xuất hàng', '/staff/warehouse/fulfillment', Icons.local_shipping_outlined),
                ('Nhập hàng', '/staff/warehouse/receiving', Icons.move_to_inbox_outlined),
                ('Tồn kho & vị trí', '/staff/warehouse/inventory', Icons.inventory_2_outlined),
              ])
                RecordCard(
                  onTap: () => context.go(href),
                  child: Row(children: [
                    Icon(icon, color: AppColors.slate500),
                    const SizedBox(width: 12),
                    Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
                    const Icon(Icons.chevron_right, color: AppColors.slate300),
                  ]),
                ),
            ]);
          },
        ),
      );
}

// ─── Fulfillment ────────────────────────────────────────────────────────────

const _steps = [
  ('CONFIRMED', 'Lấy hàng', 'Bấm "Bắt đầu lấy hàng" để giữ tồn kho, rồi đi lấy hàng theo vị trí kệ.'),
  ('PICKING', 'Đóng gói', 'Đối chiếu hàng đã lấy, đóng gói rồi bấm "Đã đóng gói". Tồn kho sẽ được trừ.'),
  ('PACKED', 'Bàn giao', 'Xem tem dán lên kiện, đưa cho đơn vị vận chuyển rồi bấm "Bàn giao".'),
];

class FulfillmentScreen extends StatefulWidget {
  final String initialTab;
  const FulfillmentScreen({super.key, this.initialTab = 'CONFIRMED'});

  @override
  State<FulfillmentScreen> createState() => _FulfillmentScreenState();
}

class _FulfillmentScreenState extends State<FulfillmentScreen> {
  late String _tab = _steps.any((s) => s.$1 == widget.initialTab) ? widget.initialTab : 'CONFIRMED';
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _q = '';
  int? _busy;

  Future<void> _run(Map o, String path, String success) async {
    setState(() => _busy = toInt(o['id']));
    await runAction(() => _api.post('$_base/orders/${o['id']}/$path'), success);
    if (mounted) setState(() => _busy = null);
    await _loader.currentState?.reload();
  }

  Future<void> _showLabel(Map o) async {
    try {
      final l = await _api.get('$_base/orders/${o['id']}/label') as Map;
      if (!mounted) return;
      final cod = toNum(l['codAmount']) > 0;
      await showDialog(
        context: context,
        builder: (c) => AlertDialog(
          title: Text('${l['orderCode']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800)),
          content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Người nhận: ${l['receiver'] ?? ''}'),
            Text('SĐT: ${l['phone'] ?? ''}'),
            Text('Địa chỉ: ${l['address'] ?? ''}'),
            Text('Số lượng: ${l['itemCount'] ?? ''} sản phẩm'),
            const SizedBox(height: 10),
            Text(cod ? 'THU HỘ (COD): ${vnd(toNum(l['codAmount']))}' : 'ĐÃ THANH TOÁN - KHÔNG THU HỘ',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          ]),
          actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('Đóng'))],
        ),
      );
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không lấy được tem');
    }
  }

  @override
  Widget build(BuildContext context) {
    return StaffShell(
      path: '/staff/warehouse/fulfillment',
      title: 'Xuất hàng',
      body: Loader<List<Map<String, dynamic>>>(
        key: _loader,
        load: () => _list('/orders'),
        builder: (context, orders, reload) {
          final step = _steps.firstWhere((s) => s.$1 == _tab);
          final q = _q.toLowerCase();
          final visible = orders.where((o) => o['status'] == _tab).where((o) {
            if (q.isEmpty) return true;
            final items = asList(o['items']).map((i) => '${(i as Map)['productName'] ?? ''}').join(' ');
            return '${o['orderCode']} ${o['customerName']} ${o['phone']} $items'.toLowerCase().contains(q);
          }).toList()
            ..sort((a, b) => '${a['createdAt'] ?? ''}'.compareTo('${b['createdAt'] ?? ''}'));
          return ListView(padding: const EdgeInsets.all(16), children: [
            Row(children: [
              for (var i = 0; i < _steps.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _tab = _steps[i].$1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                      decoration: BoxDecoration(
                        color: _tab == _steps[i].$1 ? AppColors.slate900 : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _tab == _steps[i].$1 ? AppColors.slate900 : AppColors.slate200),
                      ),
                      child: Column(children: [
                        Text('BƯỚC ${i + 1}', style: labelCaps(size: 9, color: _tab == _steps[i].$1 ? AppColors.slate400 : AppColors.slate400)),
                        Text(_steps[i].$2,
                            style: TextStyle(fontWeight: FontWeight.w700, color: _tab == _steps[i].$1 ? Colors.white : AppColors.slate700)),
                        Text('${orders.where((o) => o['status'] == _steps[i].$1).length}',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: _tab == _steps[i].$1 ? Colors.white : AppColors.slate900)),
                      ]),
                    ),
                  ),
                ),
              ],
            ]),
            const SizedBox(height: 12),
            Text(step.$3, style: const TextStyle(fontSize: 12.5, color: AppColors.slate600)),
            const SizedBox(height: 12),
            StaffSearch(hint: 'Tìm mã đơn, khách hàng, sản phẩm...', onChanged: (v) => setState(() => _q = v)),
            const SizedBox(height: 12),
            if (visible.isEmpty)
              EmptyPanel(icon: Icons.check_circle_outline, title: _q.isEmpty ? 'Đã xử lý hết đơn ở bước này' : 'Không tìm thấy đơn phù hợp')
            else
              for (final o in visible) _orderCard(o),
          ]);
        },
      ),
    );
  }

  Widget _orderCard(Map<String, dynamic> o) {
    final lines = asList(o['items']).whereType<Map>().toList()
      ..sort((a, b) => '${a['warehouseLocation'] ?? '￿'}'.compareTo('${b['warehouseLocation'] ?? '￿'}'));
    final short = lines.where((l) => l['availableQuantity'] != null && toInt(l['availableQuantity']) < toInt(l['quantity'])).toList();
    final cod = toNum(o['codAmount']) > 0;
    final busy = _busy == toInt(o['id']);
    return RecordCard(
      accent: short.isNotEmpty ? const Color(0xFFFECACA) : null,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('${o['orderCode']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w900, fontSize: 15))),
          ToneBadge(cod ? 'Thu hộ ${vnd(toNum(o['codAmount']))}' : 'Đã thanh toán', tone: 'gray', dot: false),
        ]),
        InfoLine(Icons.person_outline, '${o['customerName'] ?? 'Khách hàng'}${o['phone'] != null ? ' · ${o['phone']}' : ''}'),
        if (_tab == 'PACKED' && o['shippingAddress'] != null) InfoLine(Icons.place_outlined, '${o['shippingAddress']}'),
        if (o['createdAt'] != null) InfoLine(Icons.schedule, 'Đặt lúc ${formatDateTime(o['createdAt'])}'),
        if (short.isNotEmpty) ...[
          const SizedBox(height: 8),
          const NoticeBox('Không đủ tồn để lấy hàng. Nhập thêm hàng hoặc báo quản lý xử lý đơn này.'),
        ],
        const Divider(height: 22, color: AppColors.slate100),
        for (final l in lines)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(width: 46, height: 46, child: NetImage(resolveImageUrl(l['image'] as String?))),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${l['productName'] ?? ''}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  Wrap(spacing: 6, children: [
                    if ([l['color'], l['size']].any((x) => x != null))
                      Text([l['color'], l['size']].whereType<Object>().join(' / '), style: const TextStyle(fontSize: 11.5, color: AppColors.slate500)),
                    Text(l['warehouseLocation'] != null ? '📍 ${l['warehouseLocation']}' : 'Chưa gán vị trí',
                        style: const TextStyle(fontSize: 11.5, color: AppColors.slate500)),
                  ]),
                ]),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(8)),
                child: Text('× ${l['quantity']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
              ),
            ]),
          ),
        const SizedBox(height: 4),
        if (_tab == 'CONFIRMED')
          StaffButton('Bắt đầu lấy hàng', expand: true, height: 44, loading: busy, icon: Icons.play_arrow,
              onPressed: _busy != null || short.isNotEmpty
                  ? null
                  : () => _run(o, 'picking', 'Đã bắt đầu lấy hàng đơn ${o['orderCode']}')),
        if (_tab == 'PICKING')
          StaffButton('Đã đóng gói', expand: true, height: 44, loading: busy, icon: Icons.inventory, onPressed: _busy != null
              ? null
              : () async {
                  if (await confirmDialog(context, 'Xác nhận đóng gói',
                      'Đã lấy đủ ${o['itemCount']} sản phẩm và đóng gói xong đơn ${o['orderCode']}? Tồn kho sẽ được trừ ngay.',
                      confirm: 'Đã đóng gói', danger: false)) {
                    await _run(o, 'packing', 'Đã đóng gói đơn ${o['orderCode']}');
                  }
                }),
        if (_tab == 'PACKED')
          Row(children: [
            Expanded(child: StaffButton('Xem tem', style: PillStyle.outline, height: 44, icon: Icons.receipt_outlined, onPressed: () => _showLabel(o))),
            const SizedBox(width: 10),
            Expanded(
              child: StaffButton('Bàn giao', height: 44, loading: busy, icon: Icons.local_shipping_outlined, onPressed: _busy != null
                  ? null
                  : () async {
                      if (await confirmDialog(context, 'Xác nhận bàn giao', 'Bàn giao đơn ${o['orderCode']} cho vận chuyển? Không thể hoàn tác.',
                          confirm: 'Bàn giao', danger: false)) {
                        await _run(o, 'handover', 'Đã bàn giao đơn ${o['orderCode']} cho vận chuyển');
                      }
                    }),
            ),
          ]),
      ]),
    );
  }
}

// ─── Inventory ──────────────────────────────────────────────────────────────

class InventoryScreen extends StatefulWidget {
  /// The owner workspace reuses it (web store-owner/inventory): view and receive stock, no shelf or count changes.
  final bool ownerMode;
  const InventoryScreen({super.key, this.ownerMode = false});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _q = '';
  String _filter = 'all';

  String _state(Map i) {
    final a = _available(i);
    if (a <= 0) return 'out';
    return a <= toInt(i['reorderLevel'], 10) ? 'low' : 'ok';
  }

  Future<void> _editLocation(Map i) async {
    await formSheet(context,
        title: 'Đổi vị trí kệ',
        subtitle: '${i['productName']}',
        fields: [FormFieldSpec('location', 'Vị trí', initial: '${i['warehouseLocation'] ?? ''}', required: true, hint: 'VD: A1-02')],
        confirm: 'Lưu',
        submit: (v) => _api.put('$_base/inventory/${i['id']}/location', {'location': v['location']}));
    await _loader.currentState?.reload();
  }

  Future<void> _adjust(Map i) async {
    final r = await formSheet(context,
        title: 'Đề nghị điều chỉnh tồn',
        subtitle: '${i['productName']} · thực tế ${i['quantityOnHand']}. Chủ cửa hàng duyệt trước khi tồn thay đổi.',
        fields: const [
          FormFieldSpec('difference', 'Chênh lệch (+ thừa, − thiếu)', required: true, type: TextInputType.numberWithOptions(signed: true), hint: 'VD: -2'),
          FormFieldSpec('reason', 'Lý do', required: true, lines: 2, hint: 'Hàng hỏng, kiểm kê lệch...'),
        ],
        confirm: 'Gửi đề nghị',
        submit: (v) {
          final d = int.tryParse(v['difference']!.replaceAll('+', ''));
          if (d == null || d == 0) throw ApiException('Chênh lệch phải là số nguyên khác 0');
          return _api.post('$_base/inventory/${i['id']}/adjustments', {'difference': d, 'reason': v['reason']});
        });
    if (r != null) Toast.success('Đã gửi đề nghị điều chỉnh, chờ chủ cửa hàng duyệt');
  }

  @override
  Widget build(BuildContext context) => StaffShell(
        path: widget.ownerMode ? '/owner/inventory' : '/staff/warehouse/inventory',
        title: 'Tồn kho & vị trí',
        body: Loader<List<Map<String, dynamic>>>(
          key: _loader,
          load: () => _list('/inventory'),
          builder: (context, items, reload) {
            final q = _q.toLowerCase();
            final shown = items
                .where((i) => _filter == 'all' || _state(i) == _filter)
                .where((i) => q.isEmpty || '${i['productName']} ${i['productId']} ${i['warehouseLocation'] ?? ''}'.toLowerCase().contains(q))
                .toList();
            return ListView(padding: const EdgeInsets.all(16), children: [
              StaffSearch(hint: 'Tìm sản phẩm, mã, vị trí kệ...', onChanged: (v) => setState(() => _q = v)),
              const SizedBox(height: 10),
              FilterTabs(
                tabs: [
                  ('all', 'Tất cả (${items.length})'),
                  ('low', 'Sắp hết (${items.where((i) => _state(i) == 'low').length})'),
                  ('out', 'Hết hàng (${items.where((i) => _state(i) == 'out').length})'),
                ],
                value: _filter,
                activeColor: AppColors.slate900,
                onChanged: (v) => setState(() => _filter = v),
              ),
              const SizedBox(height: 12),
              if (shown.isEmpty) const EmptyPanel(icon: Icons.inventory_2_outlined, title: 'Không có mặt hàng phù hợp'),
              for (final i in shown.take(200))
                RecordCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text('${i['productName']}', style: const TextStyle(fontWeight: FontWeight.w700))),
                      ToneBadge(
                        switch (_state(i)) { 'out' => 'Hết hàng', 'low' => 'Sắp hết', _ => 'Còn hàng' },
                        tone: switch (_state(i)) { 'out' => 'red', 'low' => 'amber', _ => 'green' },
                      ),
                    ]),
                    InfoLine(Icons.place_outlined, i['warehouseLocation'] != null ? '${i['warehouseLocation']}' : 'Chưa gán vị trí'),
                    InfoLine(Icons.inventory_2_outlined,
                        'Khả dụng ${_available(i).clamp(0, 1 << 30)} · thực tế ${i['quantityOnHand']} · giữ ${i['quantityReserved']} · ngưỡng ${i['reorderLevel']}'),
                    const SizedBox(height: 10),
                    Row(children: [
                      if (!widget.ownerMode) ...[
                        Expanded(
                            child: StaffButton('Vị trí', style: PillStyle.outline, height: 38, icon: Icons.place_outlined, onPressed: () => _editLocation(i))),
                        const SizedBox(width: 8),
                        Expanded(child: StaffButton('Điều chỉnh', style: PillStyle.outline, height: 38, icon: Icons.tune, onPressed: () => _adjust(i))),
                        const SizedBox(width: 8),
                      ],
                      Expanded(
                        child: StaffButton('Nhập', style: PillStyle.outline, height: 38, icon: Icons.add,
                            onPressed: () => context.go('${widget.ownerMode ? '/owner/inventory/receiving' : '/staff/warehouse/receiving'}?productId=${i['productId']}')),
                      ),
                    ]),
                  ]),
                ),
              if (shown.length > 200)
                const Padding(padding: EdgeInsets.all(8), child: Text('Hiển thị 200 dòng đầu, hãy tìm để thu hẹp.', textAlign: TextAlign.center)),
            ]);
          },
        ),
      );
}

// ─── Receiving ──────────────────────────────────────────────────────────────

class ReceivingScreen extends StatefulWidget {
  final int? productId;
  final int? quantity;
  final String shellPath;
  const ReceivingScreen({super.key, this.productId, this.quantity, this.shellPath = '/staff/warehouse/receiving'});

  @override
  State<ReceivingScreen> createState() => _ReceivingScreenState();
}

class _ReceivingScreenState extends State<ReceivingScreen> {
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _history = [];
  bool _loading = true;
  Map<String, dynamic>? _selected;
  List<Map<String, dynamic>> _variants = [];
  int? _variantId;
  late final _qty = TextEditingController(text: '${widget.quantity ?? 10}');
  final _location = TextEditingController();
  final _note = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _qty.dispose();
    _location.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final r = await Future.wait([_list('/products'), _list('/inbound')]);
      if (!mounted) return;
      setState(() {
        _products = r[0];
        _history = r[1];
        _loading = false;
      });
      if (widget.productId != null) {
        final p = _products.where((p) => toInt(p['id']) == widget.productId).firstOrNull;
        if (p != null) {
          await _select(p);
        } else {
          Toast.info('Sản phẩm #${widget.productId} không còn trong danh mục, hãy chọn sản phẩm khác');
        }
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
      Toast.error(e is ApiException ? e.message : 'Không tải được dữ liệu kho');
    }
  }

  Future<void> _select(Map<String, dynamic> p) async {
    setState(() {
      _selected = p;
      _variants = [];
      _variantId = null;
    });
    try {
      final v = await _list('/products/${p['id']}/variants');
      if (mounted) setState(() => _variants = v);
    } catch (_) {}
  }

  Future<void> _pickProduct() async {
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (c) {
        var q = '';
        return StatefulBuilder(builder: (c, set) {
          final shown = _products.where((p) => '${p['name']} ${p['id']}'.toLowerCase().contains(q.toLowerCase())).take(80).toList();
          return SizedBox(
            height: MediaQuery.of(c).size.height * 0.8,
            child: Column(children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: StaffSearch(hint: 'Tìm sản phẩm theo tên hoặc mã...', onChanged: (v) => set(() => q = v)),
              ),
              Expanded(
                child: ListView(children: [
                  for (final p in shown)
                    ListTile(
                      title: Text('${p['name']}', style: const TextStyle(fontSize: 14)),
                      subtitle: Text('SP #${p['id']}', style: const TextStyle(fontSize: 12)),
                      onTap: () => Navigator.pop(c, p),
                    ),
                ]),
              ),
            ]),
          );
        });
      },
    );
    if (picked != null) await _select(picked);
  }

  Future<void> _submit() async {
    final p = _selected;
    if (p == null) return Toast.error('Vui lòng chọn sản phẩm');
    final qty = int.tryParse(_qty.text.trim());
    if (qty == null || qty <= 0) return Toast.error('Số lượng phải là số nguyên lớn hơn 0');
    if (_variants.isNotEmpty && _variantId == null) return Toast.error('Vui lòng chọn màu / size cần nhập');
    setState(() => _saving = true);
    final ok = await runAction(
        () => _api.post('$_base/inbound', {
              'productId': p['id'],
              'variantId': ?_variantId,
              'quantity': qty,
              if (_location.text.trim().isNotEmpty) 'location': _location.text.trim(),
              if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(),
            }),
        'Đã nhập $qty × "${p['name']}" vào kho');
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) {
      setState(() {
        _selected = null;
        _variants = [];
        _variantId = null;
        _location.clear();
        _note.clear();
      });
      try {
        final h = await _list('/inbound');
        if (mounted) setState(() => _history = h);
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
        path: widget.shellPath,
        title: 'Nhập kho',
        body: _loading
            ? const LoadingView()
            : ListView(padding: const EdgeInsets.all(16), children: [
                AppCard(
                  radius: 14,
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Tạo phiếu nhập', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    const FieldLabel('Sản phẩm', required: true),
                    OutlinedButton(
                      onPressed: _pickProduct,
                      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46), alignment: Alignment.centerLeft),
                      child: Text(_selected == null ? 'Chọn sản phẩm...' : '${_selected!['name']}',
                          maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: _selected == null ? AppColors.slate400 : AppColors.slate900)),
                    ),
                    if (_variants.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      const FieldLabel('Màu / size', required: true),
                      Wrap(spacing: 8, runSpacing: 8, children: [
                        for (final v in _variants)
                          ChoiceChip(
                            label: Text([v['color'], v['size']].whereType<Object>().join(' / ').isEmpty ? '${v['sku']}' : [v['color'], v['size']].whereType<Object>().join(' / '),
                                style: TextStyle(fontSize: 12.5, color: _variantId == toInt(v['id']) ? Colors.white : AppColors.slate700)),
                            selected: _variantId == toInt(v['id']),
                            selectedColor: AppColors.slate900,
                            showCheckmark: false,
                            onSelected: (_) => setState(() => _variantId = toInt(v['id'])),
                          ),
                      ]),
                    ],
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const FieldLabel('Số lượng', required: true),
                          TextField(controller: _qty, keyboardType: TextInputType.number, decoration: const InputDecoration(isDense: true, border: OutlineInputBorder())),
                        ]),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const FieldLabel('Vị trí kệ'),
                          TextField(controller: _location, decoration: const InputDecoration(isDense: true, hintText: 'A1-02', border: OutlineInputBorder())),
                        ]),
                      ),
                    ]),
                    const SizedBox(height: 12),
                    const FieldLabel('Ghi chú'),
                    TextField(controller: _note, decoration: const InputDecoration(isDense: true, border: OutlineInputBorder())),
                    const SizedBox(height: 14),
                    StaffButton('Tạo phiếu nhập kho', expand: true, height: 46, loading: _saving, icon: Icons.move_to_inbox, onPressed: _saving ? null : _submit),
                  ]),
                ),
                const SectionLabel('Vừa nhập gần đây'),
                if (_history.isEmpty) const EmptyPanel(icon: Icons.history, title: 'Chưa có phiếu nhập nào'),
                for (final h in _history.take(30))
                  RecordCard(
                    child: Row(children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${h['productName']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                          InfoLine(Icons.schedule, [formatDateTime(h['createdAt']), h['location'], h['note']].where((x) => x != null && '$x'.isNotEmpty).join(' · ')),
                        ]),
                      ),
                      Text('+${h['quantity']}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                    ]),
                  ),
              ]),
      );
}

// ─── Replenishment ──────────────────────────────────────────────────────────

/// Restock suggestions from the backend ReplenishmentAdvisor (sales pace of the last 30 days).
class ReplenishmentScreen extends StatefulWidget {
  const ReplenishmentScreen({super.key});

  @override
  State<ReplenishmentScreen> createState() => _ReplenishmentScreenState();
}

class _ReplenishmentScreenState extends State<ReplenishmentScreen> {
  final _loader = GlobalKey<LoaderState<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>>();

  static String basisText(Map r) => r['basis'] == 'SALES'
      ? 'Bán ${r['soldInWindow']} trong ${r['windowDays']} ngày (~${toNum(r['dailyDemand'])}/ngày) · đủ bán ~${r['coverDays']} ngày'
      : 'Chưa bán được trong ${r['windowDays']} ngày · nhập theo ngưỡng (đủ ${r['targetStock']})';

  Future<void> _propose(Map r) async {
    final res = await formSheet(context,
        title: 'Đề xuất nhập thêm',
        subtitle: '${r['productName']}\nGợi ý +${r['suggestedQuantity']} để tồn khả dụng đạt ${r['targetStock']}. ${basisText(r)}.',
        fields: [
          FormFieldSpec('qty', 'Số lượng đề xuất', initial: '${r['suggestedQuantity']}', required: true, type: TextInputType.number),
          const FormFieldSpec('note', 'Ghi chú cho quản lý', lines: 2),
        ],
        confirm: 'Gửi đề xuất',
        submit: (v) {
          final q = int.tryParse(v['qty']!);
          if (q == null || q <= 0) throw ApiException('Số lượng phải lớn hơn 0');
          return _api.post('$_base/replenishment', {'inventoryId': r['id'], 'quantity': q, if (v['note']!.isNotEmpty) 'note': v['note']});
        });
    if (res != null) {
      Toast.success('Đã gửi đề xuất, chờ chủ cửa hàng duyệt');
      await _loader.currentState?.reload();
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/warehouse/replenishment',
        title: 'Đề xuất nhập thêm',
        body: Loader<(List<Map<String, dynamic>>, List<Map<String, dynamic>>)>(
          key: _loader,
          load: () async => (await _list('/replenishment'), await _list('/replenishment/requests')),
          builder: (context, data, reload) {
            final (items, requests) = data;
            final pending = {for (final q in requests.where((q) => q['status'] == 'PENDING')) toInt(q['productId']): q['quantity']};
            final rows = [...items]..sort((a, b) => toInt(a['available']).compareTo(toInt(b['available'])));
            return ListView(padding: const EdgeInsets.all(16), children: [
              const Text('Các mặt hàng khả dụng đã chạm ngưỡng nhập lại. Số gợi ý tính theo lượng bán 30 ngày qua.',
                  style: TextStyle(fontSize: 12.5, color: AppColors.slate600)),
              const SizedBox(height: 12),
              if (rows.isEmpty) const EmptyPanel(icon: Icons.check_circle_outline, title: 'Không có mặt hàng nào cần nhập thêm'),
              for (final r in rows)
                RecordCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text('${r['productName']}', style: const TextStyle(fontWeight: FontWeight.w700))),
                      ToneBadge(toInt(r['available']) <= 0 || toInt(r['available']) < toInt(r['reorderLevel']) / 2 ? 'Nguy cấp' : 'Cần chú ý',
                          tone: toInt(r['available']) <= 0 || toInt(r['available']) < toInt(r['reorderLevel']) / 2 ? 'red' : 'amber'),
                    ]),
                    InfoLine(Icons.inventory_2_outlined, 'Khả dụng ${toInt(r['available']).clamp(0, 1 << 30)} / ngưỡng ${r['reorderLevel']}'),
                    const SizedBox(height: 8),
                    Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('+${r['suggestedQuantity']}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                          Text(basisText(r),
                              style: const TextStyle(fontSize: 11.5, color: AppColors.slate500)),
                        ]),
                      ),
                    ]),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(
                        child: StaffButton('Nhập kho', style: PillStyle.outline, height: 40, icon: Icons.move_to_inbox_outlined,
                            onPressed: () => context.go('/staff/warehouse/receiving?productId=${r['productId']}&qty=${r['suggestedQuantity']}')),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: pending.containsKey(toInt(r['productId']))
                            ? Center(child: Text('Đã đề xuất ${pending[toInt(r['productId'])]}', style: const TextStyle(fontSize: 12.5, color: AppColors.slate600)))
                            : StaffButton('Đề xuất', height: 40, icon: Icons.send, onPressed: () => _propose(r)),
                      ),
                    ]),
                  ]),
                ),
              const SectionLabel('Đề xuất đã gửi'),
              if (requests.isEmpty) const Text('Chưa có đề xuất nào.', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
              for (final q in requests.take(30))
                RecordCard(
                  child: Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${q['productName']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                        InfoLine(Icons.schedule, formatDateTime(q['createdAt'])),
                        if ('${q['reviewNote'] ?? ''}'.isNotEmpty) InfoLine(Icons.comment_outlined, '${q['reviewNote']}'),
                      ]),
                    ),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('+${q['quantity']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      ToneBadge(
                        const {'PENDING': 'Chờ duyệt', 'APPROVED': 'Đã duyệt', 'REJECTED': 'Từ chối', 'REVISION_REQUESTED': 'Cần chỉnh sửa'}[q['status']] ?? '${q['status']}',
                        tone: switch (q['status']) { 'APPROVED' => 'green', 'REJECTED' => 'red', _ => 'amber' },
                      ),
                    ]),
                  ]),
                ),
            ]);
          },
        ),
      );
}
