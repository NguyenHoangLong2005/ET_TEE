import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';
import 'staff_common.dart';

/// Customer-care workspace (web staff/dashboard/cskh/*): support tickets and product reviews.

const _tickets = '/api/staff/support/tickets';
const _reviews = '/api/staff/cskh/reviews';
final _api = Api.instance;

const _ticketStatus = {
  'OPEN': ('Mới', 'amber'),
  'IN_PROGRESS': ('Đang xử lý', 'gray'),
  'ESCALATED': ('Chuyển cấp trên', 'red'),
  'RESOLVED': ('Đã giải quyết', 'green'),
  'CLOSED': ('Đã đóng', 'gray'),
};

/// lastMessage is a message object ({senderName, message, ...}); older payloads sent plain text.
String? _preview(dynamic last) {
  final text = (last is Map ? '${last['message'] ?? ''}' : '${last ?? ''}').trim();
  if (text.isEmpty) return null;
  final who = last is Map && last['senderType'] != null ? (last['senderType'] == 'CUSTOMER' ? 'Khách: ' : 'CSKH: ') : '';
  return '$who${text.length > 120 ? '${text.substring(0, 120)}…' : text}';
}

Widget _ticketBadge(String? s) => ToneBadge(_ticketStatus[s]?.$1 ?? s ?? '', tone: _ticketStatus[s]?.$2 ?? 'gray');

// ─── Tickets ────────────────────────────────────────────────────────────────

class CskhTicketsScreen extends StatefulWidget {
  const CskhTicketsScreen({super.key});

  @override
  State<CskhTicketsScreen> createState() => _CskhTicketsScreenState();
}

class _CskhTicketsScreenState extends State<CskhTicketsScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _status = 'ACTIVE';
  String _q = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<List<Map<String, dynamic>>> _load() async {
    final status = _status == 'ACTIVE' || _status == 'ALL' ? '' : '&status=$_status';
    final q = _q.trim().isEmpty ? '' : '&search=${Uri.encodeQueryComponent(_q.trim())}';
    final list = asList(await _api.get('$_tickets?page=0&size=100$status$q')).whereType<Map<String, dynamic>>().toList();
    return _status == 'ACTIVE' ? list.where((t) => const ['OPEN', 'IN_PROGRESS', 'ESCALATED'].contains(t['status'])).toList() : list;
  }

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/cskh',
        title: 'Hỗ trợ khách hàng',
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Column(children: [
              StaffSearch(
                hint: 'Tìm mã phiếu, khách hàng, mã đơn...',
                onChanged: (v) {
                  _q = v;
                  _debounce?.cancel();
                  _debounce = Timer(const Duration(milliseconds: 400), () => _loader.currentState?.reload());
                },
              ),
              const SizedBox(height: 10),
              FilterTabs(
                tabs: const [
                  ('ACTIVE', 'Cần xử lý'),
                  ('OPEN', 'Mới'),
                  ('IN_PROGRESS', 'Đang xử lý'),
                  ('ESCALATED', 'Chuyển cấp trên'),
                  ('RESOLVED', 'Đã giải quyết'),
                  ('ALL', 'Tất cả'),
                ],
                value: _status,
                activeColor: AppColors.slate900,
                onChanged: (v) {
                  setState(() => _status = v);
                  _loader.currentState?.reload();
                },
              ),
            ]),
          ),
          Expanded(
            child: Loader<List<Map<String, dynamic>>>(
              key: _loader,
              load: _load,
              isEmpty: (l) => l.isEmpty,
              empty: const EmptyPanel(icon: Icons.support_agent, title: 'Không có phiếu hỗ trợ'),
              builder: (context, list, reload) => ListView(padding: const EdgeInsets.all(16), children: [
                for (final t in list)
                  RecordCard(
                    accent: t['status'] == 'ESCALATED' ? const Color(0xFFFECACA) : null,
                    onTap: () async {
                      await context.push('/staff/cskh/tickets/${t['id']}');
                      await _loader.currentState?.reload();
                    },
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text('${t['ticketCode'] ?? '#${t['id']}'}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800))),
                        _ticketBadge(t['status'] as String?),
                      ]),
                      const SizedBox(height: 4),
                      Text('${t['subject'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                      InfoLine(Icons.person_outline,
                          [t['customerName'], t['orderCode'] != null ? 'đơn ${t['orderCode']}' : null].whereType<Object>().join(' · ')),
                      if (_preview(t['lastMessage']) case final p?) InfoLine(Icons.chat_bubble_outline, p),
                      InfoLine(Icons.schedule,
                          '${formatDateTime(t['createdAt'])}${t['assignedToName'] != null ? ' · ${t['assignedToName']}' : ''}'),
                    ]),
                  ),
              ]),
            ),
          ),
        ]),
      );
}

class CskhTicketDetailScreen extends StatefulWidget {
  final String id;
  const CskhTicketDetailScreen({super.key, required this.id});

  @override
  State<CskhTicketDetailScreen> createState() => _CskhTicketDetailScreenState();
}

class _CskhTicketDetailScreenState extends State<CskhTicketDetailScreen> {
  final _loader = GlobalKey<LoaderState<Map<String, dynamic>>>();
  final _reply = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _reply.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _reply.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    final ok = await runAction(() => _api.post('$_tickets/${widget.id}/messages', {'message': text}), 'Đã gửi phản hồi');
    if (!mounted) return;
    setState(() => _sending = false);
    if (ok) {
      _reply.clear();
      await _loader.currentState?.reload();
    }
  }

  Future<void> _changeStatus(Map t) async {
    final options = [for (final e in _ticketStatus.entries) if (e.key != t['status'] && e.key != 'OPEN') (e.key, e.value.$1)];
    final r = await formSheet(context,
        title: 'Đổi trạng thái phiếu',
        fields: [
          FormFieldSpec('status', 'Trạng thái', options: options),
          const FormFieldSpec('note', 'Ghi chú', lines: 2),
        ],
        confirm: 'Cập nhật',
        submit: (v) => _api.patch('$_tickets/${widget.id}/status', {'status': v['status'], if (v['note']!.isNotEmpty) 'note': v['note']}));
    if (r != null) {
      Toast.success('Đã cập nhật trạng thái phiếu');
      await _loader.currentState?.reload();
    }
  }

  /// Assign to another CSKH staff, or escalate to a shop owner (web staff/support).
  Future<void> _assign({required bool escalate}) async {
    List<Map> people;
    try {
      people = asList(await _api.get('$_tickets/${widget.id}/${escalate ? 'escalatable-owners' : 'assignable-staff'}')).whereType<Map>().toList();
    } catch (e) {
      return Toast.error(e is ApiException ? e.message : 'Không tải được danh sách');
    }
    if (!mounted) return;
    if (people.isEmpty) return Toast.info(escalate ? 'Không có quản lý nào để chuyển' : 'Không có nhân viên nào để phân công');
    final r = await formSheet(context,
        title: escalate ? 'Chuyển cấp trên' : 'Phân công phiếu',
        fields: [
          FormFieldSpec('to', escalate ? 'Quản lý nhận' : 'Nhân viên nhận', options: [for (final p in people) ('${p['id']}', '${p['fullName']}')]),
          const FormFieldSpec('note', 'Ghi chú', lines: 2),
        ],
        confirm: escalate ? 'Chuyển' : 'Phân công',
        submit: (v) => _api.patch('$_tickets/${widget.id}/assign', {
              escalate ? 'escalatedTo' : 'assignedTo': v['to'],
              if (v['note']!.isNotEmpty) 'note': v['note'],
            }));
    if (r != null) {
      Toast.success(escalate ? 'Đã chuyển phiếu cho quản lý' : 'Đã phân công phiếu');
      await _loader.currentState?.reload();
    }
  }

  /// Look up an order by phone or code (masked result) and link it to the ticket.
  Future<void> _linkOrder() async {
    Map? found;
    final r = await formSheet(context,
        title: 'Liên kết đơn hàng',
        subtitle: 'Tra cứu theo số điện thoại hoặc mã đơn; đơn tìm thấy sẽ được gắn vào phiếu.',
        fields: const [
          FormFieldSpec('type', 'Tra theo', options: [('ORDER_CODE', 'Mã đơn'), ('PHONE', 'Số điện thoại')]),
          FormFieldSpec('query', 'Mã đơn / SĐT', required: true),
        ],
        confirm: 'Tra cứu & liên kết',
        submit: (v) async {
          found = await _api.post('/api/staff/cskh/orders/lookup', {'searchType': v['type'], 'query': v['query']}) as Map?;
          if (found == null) throw ApiException('Không tìm thấy đơn hàng');
          await _api.patch('$_tickets/${widget.id}/link-order', {'orderId': found!['id']});
        });
    if (r != null) {
      Toast.success('Đã liên kết đơn ${found?['orderCode'] ?? ''} (${found?['customerName'] ?? ''})');
      await _loader.currentState?.reload();
    }
  }

  /// Compensation voucher within the staff's monthly quota.
  Future<void> _grantVoucher() async {
    Map quota = const {};
    try {
      quota = await _api.get('/api/staff/cskh/vouchers/quota') as Map;
    } catch (_) {}
    if (!mounted) return;
    final remaining = toNum(quota['remainingQuota']);
    final r = await formSheet(context,
        title: 'Tặng voucher tri ân',
        subtitle: quota.isEmpty
            ? null
            : 'Hạn mức kỳ ${quota['period']}: còn ${vnd(remaining)} / ${vnd(toNum(quota['quotaAmount']))}',
        fields: [
          FormFieldSpec('amount', 'Mệnh giá', options: [
            for (final a in const [20000, 50000, 100000, 200000, 500000]) ('$a', vnd(a)),
          ]),
          const FormFieldSpec('reason', 'Lý do', lines: 2),
        ],
        confirm: 'Tặng voucher',
        submit: (v) {
          final amount = int.parse(v['amount']!);
          if (quota.isNotEmpty && amount > remaining) throw ApiException('Vượt hạn mức còn lại (${vnd(remaining)})');
          return _api.post('/api/staff/cskh/vouchers/grant', {
            'ticketId': widget.id,
            'amount': amount,
            if (v['reason']!.isNotEmpty) 'reason': v['reason'],
          });
        });
    if (r != null) {
      Toast.success('Đã tặng voucher ${vnd(int.parse(r['amount']!))} cho khách');
      await _loader.currentState?.reload();
    }
  }

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/cskh',
        title: 'Phiếu hỗ trợ',
        body: Loader<Map<String, dynamic>>(
          key: _loader,
          load: () async => Map<String, dynamic>.from(await _api.get('$_tickets/${widget.id}') as Map),
          builder: (context, t, reload) {
            final messages = asList(t['messages']).whereType<Map>().toList();
            final closed = t['status'] == 'CLOSED';
            return Column(children: [
              Expanded(
                child: ListView(padding: const EdgeInsets.all(16), children: [
                  Row(children: [
                    Expanded(child: Text('${t['ticketCode'] ?? '#${t['id']}'}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w900, fontSize: 16))),
                    _ticketBadge(t['status'] as String?),
                  ]),
                  const SizedBox(height: 6),
                  Text('${t['subject'] ?? ''}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  InfoLine(Icons.person_outline, '${t['customerName'] ?? ''}'),
                  if (t['customerEmail'] != null) InfoLine(Icons.mail_outline, '${t['customerEmail']}'),
                  if (t['customerPhone'] != null) InfoLine(Icons.phone_outlined, '${t['customerPhone']}'),
                  if (t['orderCode'] != null) InfoLine(Icons.receipt_long_outlined, 'Đơn ${t['orderCode']}'),
                  if (t['assignedToName'] != null) InfoLine(Icons.support_agent, 'Phụ trách: ${t['assignedToName']}'),
                  const SizedBox(height: 10),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    StaffButton('Đổi trạng thái', style: PillStyle.outline, height: 38, icon: Icons.swap_horiz, onPressed: () => _changeStatus(t)),
                    if (!closed) ...[
                      StaffButton('Phân công', style: PillStyle.outline, height: 38, icon: Icons.person_add_alt, onPressed: () => _assign(escalate: false)),
                      StaffButton('Chuyển cấp trên', style: PillStyle.outline, height: 38, icon: Icons.trending_up, onPressed: () => _assign(escalate: true)),
                      StaffButton('Liên kết đơn', style: PillStyle.outline, height: 38, icon: Icons.link, onPressed: _linkOrder),
                      if (t['customerId'] != null)
                        StaffButton('Tặng voucher', style: PillStyle.outline, height: 38, icon: Icons.card_giftcard, onPressed: _grantVoucher),
                    ],
                  ]),
                  const SectionLabel('Trao đổi'),
                  for (final m in messages)
                    Builder(builder: (context) {
                      final staff = m['senderType'] != 'CUSTOMER';
                      return Align(
                        alignment: staff ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: staff ? AppColors.slate900 : Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: staff ? null : Border.all(color: AppColors.slate200),
                          ),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${m['message'] ?? ''}', style: TextStyle(fontSize: 13.5, color: staff ? Colors.white : AppColors.slate900, height: 1.4)),
                            const SizedBox(height: 4),
                            Text('${m['senderName'] ?? ''} · ${formatDateTime(m['createdAt'])}',
                                style: TextStyle(fontSize: 10.5, color: staff ? AppColors.slate400 : AppColors.slate500)),
                          ]),
                        ),
                      );
                    }),
                ]),
              ),
              if (!closed)
                SafeArea(
                  top: false,
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
                    decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppColors.slate200))),
                    child: Row(children: [
                      Expanded(
                        child: TextField(
                          controller: _reply,
                          minLines: 1,
                          maxLines: 4,
                          decoration: const InputDecoration(hintText: 'Nhập phản hồi cho khách...', isDense: true, border: InputBorder.none),
                        ),
                      ),
                      IconButton(
                        onPressed: _sending ? null : _send,
                        icon: _sending
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.send, color: AppColors.slate900),
                      ),
                    ]),
                  ),
                ),
            ]);
          },
        ),
      );
}

// ─── Reviews ────────────────────────────────────────────────────────────────

class CskhReviewsScreen extends StatefulWidget {
  const CskhReviewsScreen({super.key});

  @override
  State<CskhReviewsScreen> createState() => _CskhReviewsScreenState();
}

class _CskhReviewsScreenState extends State<CskhReviewsScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _status = 'PENDING_REPLY';
  int _limit = 50;

  Future<void> _reply(Map r) async {
    final res = await formSheet(context,
        title: 'Trả lời đánh giá',
        subtitle: '${r['customerName'] ?? 'Khách hàng ẩn danh'} · ${r['rating']}★\n"${r['content'] ?? ''}"',
        fields: [FormFieldSpec('msg', 'Nội dung trả lời', required: true, lines: 4, initial: '${(r['reply'] as Map?)?['replyMessage'] ?? ''}')],
        confirm: 'Gửi trả lời',
        submit: (v) => _api.post('$_reviews/${r['id']}/reply', {'reviewId': r['id'], 'replyMessage': v['msg']}));
    if (res != null) {
      Toast.success('Đã trả lời đánh giá');
      await _loader.currentState?.reload();
    }
  }

  Future<void> _toggleHidden(Map r) async {
    final hide = r['status'] != 'HIDDEN';
    if (hide && !await confirmDialog(context, 'Ẩn đánh giá', 'Đánh giá sẽ không còn hiện trên trang sản phẩm.', confirm: 'Ẩn')) return;
    final next = hide ? 'HIDDEN' : (r['reply'] != null ? 'REPLIED' : 'PENDING_REPLY');
    await runAction(() => _api.patch('$_reviews/${r['id']}/status', {'status': next}), hide ? 'Đã ẩn đánh giá' : 'Đã hiện lại đánh giá');
    await _loader.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) => StaffShell(
        path: '/staff/cskh/reviews',
        title: 'Đánh giá sản phẩm',
        body: Loader<List<Map<String, dynamic>>>(
          key: _loader,
          load: () async => asList(await _api.get(_reviews)).whereType<Map<String, dynamic>>().toList(),
          builder: (context, all, reload) {
            final shown = all.where((r) => _status == 'ALL' || r['status'] == _status).toList();
            int n(String s) => all.where((r) => r['status'] == s).length;
            return ListView(padding: const EdgeInsets.all(16), children: [
              FilterTabs(
                tabs: [
                  ('PENDING_REPLY', 'Chờ trả lời (${n('PENDING_REPLY')})'),
                  ('REPLIED', 'Đã trả lời (${n('REPLIED')})'),
                  ('HIDDEN', 'Đã ẩn (${n('HIDDEN')})'),
                  ('ALL', 'Tất cả'),
                ],
                value: _status,
                activeColor: AppColors.slate900,
                onChanged: (v) => setState(() {
                  _status = v;
                  _limit = 50;
                }),
              ),
              const SizedBox(height: 12),
              if (shown.isEmpty) const EmptyPanel(icon: Icons.rate_review_outlined, title: 'Không có đánh giá'),
              for (final r in shown.take(_limit))
                RecordCard(
                  accent: toInt(r['rating']) <= 2 && r['status'] == 'PENDING_REPLY' ? const Color(0xFFFECACA) : null,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${r['productName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Row(children: [
                      for (var i = 1; i <= 5; i++)
                        Icon(i <= toInt(r['rating']) ? Icons.star_rounded : Icons.star_outline_rounded, size: 16, color: AppColors.slate900),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${r['customerName'] ?? 'Khách hàng ẩn danh'}${r['verifiedPurchase'] == true ? ' · đã mua' : ''}',
                          style: const TextStyle(fontSize: 12, color: AppColors.slate500),
                        ),
                      ),
                    ]),
                    if ('${r['content'] ?? ''}'.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text('${r['content']}', style: const TextStyle(fontSize: 13, height: 1.4)),
                    ],
                    if (r['purchasedSize'] != null || r['purchasedColor'] != null)
                      InfoLine(Icons.checkroom, [r['purchasedColor'], r['purchasedSize']].whereType<Object>().join(' / ')),
                    InfoLine(Icons.schedule, formatDateTime(r['createdAt'])),
                    if (r['reply'] is Map)
                      Container(
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(10)),
                        child: Text('↳ ${(r['reply'] as Map)['replyMessage'] ?? ''}', style: const TextStyle(fontSize: 12.5, color: AppColors.slate700)),
                      ),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(
                        child: StaffButton(r['reply'] is Map ? 'Sửa trả lời' : 'Trả lời', height: 38, icon: Icons.reply, onPressed: () => _reply(r)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: StaffButton(r['status'] == 'HIDDEN' ? 'Hiện lại' : 'Ẩn', style: PillStyle.outline, height: 38,
                            icon: r['status'] == 'HIDDEN' ? Icons.visibility_outlined : Icons.visibility_off_outlined, onPressed: () => _toggleHidden(r)),
                      ),
                    ]),
                  ]),
                ),
              // Hundreds of pending reviews: build them a page at a time.
              if (shown.length > _limit)
                Center(
                  child: TextButton(
                    onPressed: () => setState(() => _limit += 50),
                    child: Text('Xem thêm (còn ${shown.length - _limit})'),
                  ),
                ),
            ]);
          },
        ),
      );
}
