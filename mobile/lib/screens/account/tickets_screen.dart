import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../services/shop_service.dart';
import '../../widgets/common.dart';
import '../../widgets/store_scaffold.dart';

const _statusCfg = <String, (String, Color, Color, IconData)>{
  'OPEN': ('Chờ tiếp nhận', AppColors.amber50, AppColors.amber700, Icons.schedule),
  'IN_PROGRESS': ('Đang xử lý', AppColors.blue50, AppColors.blue700, Icons.autorenew),
  'WAITING_CUSTOMER': ('Chờ bạn phản hồi', AppColors.purple50, AppColors.purple700, Icons.chat_bubble_outline),
  'RESOLVED': ('Đã giải quyết', AppColors.emerald50, AppColors.emerald700, Icons.check_circle_outline),
  'CLOSED': ('Đã đóng', AppColors.slate100, AppColors.slate600, Icons.check_circle_outline),
};

const _priorityCfg = <int, (String, Color)>{
  1: ('Thấp', AppColors.slate400),
  2: ('Bình thường', Color(0xFF3B82F6)),
  3: ('Cao', AppColors.amber500),
  4: ('Khẩn cấp', Color(0xFFEF4444)),
};

Widget _statusPill(String? status) {
  final s = _statusCfg[status];
  if (s == null) return StatusPill(status ?? '', bg: AppColors.slate100, fg: AppColors.slate700);
  return StatusPill(s.$1, bg: s.$2, fg: s.$3, border: s.$3.withValues(alpha: 0.25), icon: s.$4);
}

/// Port of web app/account/tickets/page.tsx (backend CustomerTicketController).
class TicketsScreen extends StatefulWidget {
  const TicketsScreen({super.key});

  @override
  State<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends State<TicketsScreen> {
  List<Map<String, dynamic>> _tickets = [];
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String _filter = 'ALL';

  @override
  void initState() {
    super.initState();
    _load();
    OrderService.myOrders().then((o) {
      if (mounted) setState(() => _orders = o);
    }).catchError((_) {});
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final d = await Api.instance.get('/api/customer/tickets/my-tickets', query: {'page': 0, 'size': 50});
      // PaginatedResponseDto returns the page in `items`
      _tickets = asList(d).whereType<Map<String, dynamic>>().toList();
    } catch (_) {
      Toast.error('Không thể tải danh sách khiếu nại & hỗ trợ');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openDetail(String id) async {
    try {
      final d = await Api.instance.get('/api/customer/tickets/$id');
      if (!mounted || d is! Map) return;
      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => _TicketDetail(ticket: Map<String, dynamic>.from(d))));
      _load(silent: true);
    } catch (_) {
      Toast.error('Không thể xem chi tiết yêu cầu hỗ trợ');
    }
  }

  Future<void> _create() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _CreateTicketSheet(orders: _orders),
    );
    if (created == true) _load(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final list = _filter == 'ALL' ? _tickets : _tickets.where((t) => t['status'] == _filter).toList();
    return SubPageScaffold(
      title: 'Hỗ trợ & Khiếu nại',
      background: const Color(0x80F8FAFC),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
          children: [
            FilterTabs(
              tabs: const [('ALL', 'Tất cả'), ('OPEN', 'Chờ tiếp nhận'), ('IN_PROGRESS', 'Đang xử lý'), ('RESOLVED', 'Đã giải quyết'), ('CLOSED', 'Đã đóng')],
              value: _filter,
              activeColor: AppColors.slate900,
              onChanged: (v) => setState(() => _filter = v),
            ),
            const SizedBox(height: 14),
            PillButton('Tạo yêu cầu hỗ trợ', icon: Icons.add, expand: true, onPressed: _create),
            const SizedBox(height: 16),
            if (_loading)
              const LoadingView()
            else if (list.isEmpty)
              EmptyPanel(
                icon: Icons.chat_bubble_outline,
                title: 'Chưa có yêu cầu hỗ trợ nào',
                message: 'Nếu bạn gặp khó khăn với đơn hàng hoặc dịch vụ, hãy bấm tạo yêu cầu để đội ngũ ET.TEE hỗ trợ kịp thời.',
                action: PillButton('Tạo yêu cầu ngay', style: PillStyle.dark, icon: Icons.add, height: 42, onPressed: _create),
              )
            else
              for (final t in list)
                GestureDetector(
                  onTap: () => _openDetail('${t['id']}'),
                  child: AppCard(
                    radius: 16,
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Wrap(spacing: 8, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(6)),
                          child: Text('#${t['ticketCode']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800, fontSize: 13)),
                        ),
                        _statusPill(t['status'] as String?),
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Container(width: 8, height: 8, decoration: BoxDecoration(color: (_priorityCfg[toInt(t['priority'], 2)] ?? _priorityCfg[2]!).$2, shape: BoxShape.circle)),
                          const SizedBox(width: 5),
                          Text('Ưu tiên ${(_priorityCfg[toInt(t['priority'], 2)] ?? _priorityCfg[2]!).$1}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                        ]),
                        if (t['orderCode'] != null)
                          StatusPill('Đơn hàng: ${t['orderCode']}', bg: AppColors.red50, fg: AppColors.primary, border: AppColors.red100),
                      ]),
                      const SizedBox(height: 10),
                      Text('${t['subject'] ?? ''}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Wrap(spacing: 14, children: [
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.slate500),
                          const SizedBox(width: 4),
                          Text(formatDateTime(t['createdAt']), style: const TextStyle(fontSize: 13, color: AppColors.slate500)),
                        ]),
                        if (t['assignedToName'] != null)
                          Text.rich(TextSpan(style: const TextStyle(fontSize: 13, color: AppColors.slate500), children: [
                            const TextSpan(text: 'Hỗ trợ viên: '),
                            TextSpan(text: '${t['assignedToName']}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate700)),
                          ])),
                      ]),
                      const SizedBox(height: 8),
                      const Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                        Text('Xem hội thoại', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.slate600)),
                        Icon(Icons.chevron_right, size: 18, color: AppColors.slate400),
                      ]),
                    ]),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _TicketDetail extends StatefulWidget {
  final Map<String, dynamic> ticket;
  const _TicketDetail({required this.ticket});

  @override
  State<_TicketDetail> createState() => _TicketDetailState();
}

class _TicketDetailState extends State<_TicketDetail> {
  late final Map<String, dynamic> t = widget.ticket;
  late final List<Map<String, dynamic>> _messages = asList(t['messages']).whereType<Map<String, dynamic>>().toList();
  final _reply = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _reply.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final msg = _reply.text.trim();
    if (msg.isEmpty) return;
    setState(() => _sending = true);
    try {
      final d = await Api.instance.post('/api/customer/tickets/${t['id']}/messages', {'message': msg});
      Toast.success('Đã gửi phản hồi thành công');
      _reply.clear();
      if (d is Map) setState(() => _messages.add(Map<String, dynamic>.from(d)));
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Lỗi khi gửi phản hồi');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final closed = t['status'] == 'CLOSED';
    return SubPageScaffold(
      title: '#${t['ticketCode']}',
      body: Column(children: [
        Container(
          width: double.infinity,
          color: const Color(0x80F8FAFC),
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 8, runSpacing: 6, children: [
              _statusPill(t['status'] as String?),
              if (t['orderCode'] != null) StatusPill('Đơn: ${t['orderCode']}', bg: AppColors.red50, fg: AppColors.primary, border: AppColors.red100),
            ]),
            const SizedBox(height: 8),
            Text('${t['subject'] ?? ''}', style: headline(18)),
          ]),
        ),
        const Divider(height: 1),
        Expanded(
          child: _messages.isEmpty
              ? const Center(child: Text('Chưa có tin nhắn phản hồi nào trong yêu cầu này.', style: TextStyle(color: AppColors.slate400, fontSize: 13)))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    for (final m in _messages)
                      Builder(builder: (_) {
                        final mine = m['senderType'] == 'CUSTOMER';
                        final d = parseDate(m['createdAt']);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: Column(crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start, children: [
                            Row(mainAxisSize: MainAxisSize.min, children: [
                              Text(mine ? 'Bạn' : '${m['senderName'] ?? 'Hỗ trợ viên ET.TEE'}',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.slate600)),
                              const SizedBox(width: 6),
                              if (d != null)
                                Text('${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
                            ]),
                            const SizedBox(height: 4),
                            ConstrainedBox(
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: mine ? AppColors.slate900 : Colors.white,
                                  border: mine ? null : Border.all(color: AppColors.slate200),
                                  borderRadius: BorderRadius.only(
                                    topLeft: Radius.circular(mine ? 16 : 0),
                                    topRight: Radius.circular(mine ? 0 : 16),
                                    bottomLeft: const Radius.circular(16),
                                    bottomRight: const Radius.circular(16),
                                  ),
                                ),
                                child: Text('${m['message'] ?? ''}',
                                    style: TextStyle(fontSize: 14, height: 1.5, color: mine ? Colors.white : AppColors.slate800)),
                              ),
                            ),
                          ]),
                        );
                      }),
                  ],
                ),
        ),
        SafeArea(
          top: false,
          child: closed
              ? Container(
                  width: double.infinity,
                  color: AppColors.slate100,
                  padding: const EdgeInsets.all(16),
                  child: const Text('Yêu cầu hỗ trợ này đã được đóng. Nếu vẫn cần trợ giúp, bạn vui lòng tạo một yêu cầu mới.',
                      textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: AppColors.slate500, fontWeight: FontWeight.w500)),
                )
              : Container(
                  decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.slate200))),
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                  child: Row(children: [
                    Expanded(
                      child: TextField(
                        controller: _reply,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(hintText: 'Nhập nội dung phản hồi tới CSKH...'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      height: 46,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                        onPressed: _sending || _reply.text.trim().isEmpty ? null : _send,
                        icon: const Icon(Icons.send, size: 16),
                        label: Text(_sending ? 'Đang gửi...' : 'Gửi'),
                      ),
                    ),
                  ]),
                ),
        ),
      ]),
    );
  }
}

class _CreateTicketSheet extends StatefulWidget {
  final List<Map<String, dynamic>> orders;
  const _CreateTicketSheet({required this.orders});

  @override
  State<_CreateTicketSheet> createState() => _CreateTicketSheetState();
}

class _CreateTicketSheetState extends State<_CreateTicketSheet> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  String _orderId = '';
  int _priority = 2;
  bool _creating = false;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_subject.text.trim().isEmpty || _message.text.trim().isEmpty) return Toast.error('Vui lòng điền tiêu đề và nội dung yêu cầu');
    setState(() => _creating = true);
    try {
      await Api.instance.post('/api/customer/tickets', {
        'subject': _subject.text.trim(),
        'initialMessage': _message.text.trim(),
        'priority': _priority,
        'channel': 'WEB',
        if (_orderId.isNotEmpty) 'orderId': int.tryParse(_orderId),
      });
      Toast.success('Tạo yêu cầu hỗ trợ thành công! Đội ngũ CSKH sẽ phản hồi sớm nhất.');
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Lỗi máy chủ khi tạo yêu cầu');
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            const Icon(Icons.support_outlined, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(child: Text('TẠO YÊU CẦU HỖ TRỢ MỚI', style: headline(17))),
            IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
          ]),
          const SizedBox(height: 14),
          const FieldLabel('Tiêu đề yêu cầu', required: true),
          TextField(controller: _subject, decoration: const InputDecoration(hintText: 'Ví dụ: Cần hỗ trợ đổi kích cỡ sản phẩm, chậm giao hàng...')),
          const SizedBox(height: 14),
          const FieldLabel('Đơn hàng liên quan'),
          DropdownButtonFormField<String>(
            initialValue: _orderId,
            isExpanded: true,
            items: [
              const DropdownMenuItem(value: '', child: Text('-- Không gắn đơn hàng cụ thể --')),
              for (final o in widget.orders.where((o) => o['id'] != null))
                DropdownMenuItem(
                  value: '${o['id']}',
                  child: Text('${o['orderCode']} - ${formatNumber(toNum(o['totalAmount']))}₫ (${formatDate(o['createdAt'])})', overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (v) => setState(() => _orderId = v ?? ''),
          ),
          const SizedBox(height: 14),
          const FieldLabel('Mức độ ưu tiên'),
          DropdownButtonFormField<int>(
            initialValue: _priority,
            isExpanded: true,
            items: const [
              DropdownMenuItem(value: 1, child: Text('Thấp - Cần giải đáp chung')),
              DropdownMenuItem(value: 2, child: Text('Bình thường - Thắc mắc về đơn hoặc sản phẩm')),
              DropdownMenuItem(value: 3, child: Text('Cao - Lỗi giao nhận / Cần hỗ trợ gấp')),
              DropdownMenuItem(value: 4, child: Text('Khẩn cấp - Sự cố thanh toán / Hàng hư hỏng')),
            ],
            onChanged: (v) => setState(() => _priority = v ?? 2),
          ),
          const SizedBox(height: 14),
          const FieldLabel('Nội dung chi tiết', required: true),
          TextField(
            controller: _message,
            maxLines: 5,
            decoration: const InputDecoration(hintText: 'Mô tả cụ thể sự cố hoặc thắc mắc của bạn để chúng tôi phục vụ nhanh nhất...'),
          ),
          const SizedBox(height: 20),
          PillButton(_creating ? 'Đang gửi...' : 'Gửi yêu cầu', icon: Icons.send, expand: true, loading: _creating, onPressed: _creating ? null : _submit),
        ]),
      ),
    );
  }
}
