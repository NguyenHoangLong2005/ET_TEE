import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';

/// Building blocks shared by the warehouse, shipping, sales, CSKH, owner and admin screens.

/// Loads with [load], then shows a spinner, an error with retry, [empty] or the data.
class Loader<T> extends StatefulWidget {
  final Future<T> Function() load;
  final Widget Function(BuildContext context, T data, Future<void> Function() reload) builder;
  final bool Function(T data)? isEmpty;
  final Widget? empty;
  const Loader({super.key, required this.load, required this.builder, this.isEmpty, this.empty});

  @override
  State<Loader<T>> createState() => LoaderState<T>();
}

class LoaderState<T> extends State<Loader<T>> {
  T? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    setState(() {
      _loading = _data == null;
      _error = null;
    });
    try {
      final d = await widget.load();
      if (mounted) setState(() => _data = d);
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiException ? e.message : 'Không tải được dữ liệu');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingView();
    if (_error != null && _data == null) {
      return ListView(padding: const EdgeInsets.all(16), children: [
        NoticeBox(_error!),
        const SizedBox(height: 12),
        Center(child: TextButton.icon(onPressed: reload, icon: const Icon(Icons.refresh), label: const Text('Thử lại'))),
      ]);
    }
    final d = _data as T;
    if (widget.isEmpty != null && widget.isEmpty!(d) && widget.empty != null) {
      return RefreshIndicator(onRefresh: reload, child: ListView(padding: const EdgeInsets.all(16), children: [widget.empty!]));
    }
    return RefreshIndicator(onRefresh: reload, child: widget.builder(context, d, reload));
  }
}

/// Neutral KPI tile (the redesigned web StatCard): label, value, optional hint; colour only for status.
class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final String? hint;
  final IconData icon;
  final bool alert;
  final VoidCallback? onTap;
  const StatTile({super.key, required this.label, required this.value, required this.icon, this.hint, this.alert = false, this.onTap});

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.slate200)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w500))),
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(color: alert ? AppColors.red50 : AppColors.slate100, borderRadius: BorderRadius.circular(9)),
                  child: Icon(icon, size: 16, color: alert ? AppColors.red600 : AppColors.slate500),
                ),
              ]),
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()])),
              ),
              if (hint != null) ...[
                const SizedBox(height: 2),
                Text(hint!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
              ],
            ]),
          ),
        ),
      );
}

/// Two-column grid of [StatTile]s.
class StatGrid extends StatelessWidget {
  final List<Widget> tiles;
  const StatGrid(this.tiles, {super.key});

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, c) => GridView.count(
          crossAxisCount: c.maxWidth >= 900 ? 4 : c.maxWidth >= 500 ? 3 : 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: c.maxWidth >= 900 ? 1.9 : 1.45,
          children: tiles,
        ),
      );
}

/// White card used for one record in a staff list.
class RecordCard extends StatelessWidget {
  final Widget child;
  final Color? accent;
  final VoidCallback? onTap;
  const RecordCard({super.key, required this.child, this.accent, this.onTap});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: accent ?? AppColors.slate200),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(onTap: onTap, child: Padding(padding: const EdgeInsets.all(14), child: child)),
      );
}

/// Small icon + text line ("👤 Nguyễn Văn A").
class InfoLine extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool mono;
  const InfoLine(this.icon, this.text, {super.key, this.mono = false});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: 14, color: AppColors.slate400)),
          const SizedBox(width: 6),
          Expanded(
            child: Text(text,
                style: TextStyle(fontSize: 12.5, color: AppColors.slate600, fontFamily: mono ? 'monospace' : null, height: 1.35)),
          ),
        ]),
      );
}

/// Search box at the top of a list.
class StaffSearch extends StatelessWidget {
  final String hint;
  final ValueChanged<String> onChanged;
  const StaffSearch({super.key, required this.hint, required this.onChanged});

  @override
  Widget build(BuildContext context) => TextField(
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: hint,
          isDense: true,
          prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.slate400),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
        ),
      );
}

/// One field of [formSheet].
class FormFieldSpec {
  final String key;
  final String label;
  final String initial;
  final bool required;
  final int lines;
  final TextInputType? type;
  final List<(String, String)>? options;
  final String? hint;
  const FormFieldSpec(this.key, this.label,
      {this.initial = '', this.required = false, this.lines = 1, this.type, this.options, this.hint});
}

/// Bottom sheet with a few fields; returns the values, or null when dismissed.
/// [submit] runs before closing and keeps the sheet open (showing a toast) if it throws.
Future<Map<String, String>?> formSheet(
  BuildContext context, {
  required String title,
  String? subtitle,
  required List<FormFieldSpec> fields,
  required String confirm,
  Future<void> Function(Map<String, String> values)? submit,
  bool danger = false,
}) {
  final controllers = {for (final f in fields) f.key: TextEditingController(text: f.initial)};
  final choices = {
    for (final f in fields)
      if (f.options != null) f.key: f.initial.isNotEmpty ? f.initial : (f.options!.isEmpty ? '' : f.options!.first.$1),
  };
  return showModalBottomSheet<Map<String, String>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (c) {
      var busy = false;
      return StatefulBuilder(builder: (c, setSheet) {
        Map<String, String> values() => {
              for (final f in fields) f.key: f.options != null ? choices[f.key]! : controllers[f.key]!.text.trim(),
            };
        Future<void> done() async {
          final v = values();
          for (final f in fields) {
            if (f.required && (v[f.key] ?? '').isEmpty) {
              Toast.error('Vui lòng nhập ${f.label.toLowerCase()}');
              return;
            }
          }
          if (submit != null) {
            setSheet(() => busy = true);
            try {
              await submit(v);
            } catch (e) {
              Toast.error(e is ApiException ? e.message : 'Thao tác thất bại');
              setSheet(() => busy = false);
              return;
            }
          }
          if (c.mounted) Navigator.pop(c, v);
        }

        return Padding(
          padding: EdgeInsets.fromLTRB(20, 18, 20, 20 + MediaQuery.of(c).viewInsets.bottom),
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(fontSize: 12.5, color: AppColors.slate500, height: 1.4)),
              ],
              const SizedBox(height: 14),
              for (final f in fields) ...[
                FieldLabel(f.label, required: f.required),
                if (f.options != null)
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final (value, label) in f.options!)
                      ChoiceChip(
                        label: Text(label, style: TextStyle(fontSize: 12.5, color: choices[f.key] == value ? Colors.white : AppColors.slate700)),
                        selected: choices[f.key] == value,
                        selectedColor: AppColors.slate900,
                        backgroundColor: AppColors.slate100,
                        showCheckmark: false,
                        side: BorderSide.none,
                        onSelected: (_) => setSheet(() => choices[f.key] = value),
                      ),
                  ])
                else
                  TextField(
                    controller: controllers[f.key],
                    keyboardType: f.type,
                    maxLines: f.lines,
                    decoration: InputDecoration(
                      hintText: f.hint,
                      isDense: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                const SizedBox(height: 12),
              ],
              const SizedBox(height: 4),
              Row(children: [
                Expanded(child: PillButton('Hủy', style: PillStyle.outline, height: 44, onPressed: busy ? null : () => Navigator.pop(c))),
                const SizedBox(width: 10),
                Expanded(
                  child: PillButton(confirm,
                      style: danger ? PillStyle.danger : PillStyle.dark, height: 44, loading: busy, onPressed: busy ? null : done),
                ),
              ]),
            ]),
          ),
        );
      });
    },
  ).whenComplete(() {
    for (final c in controllers.values) {
      c.dispose();
    }
  });
}

/// Runs a staff action with a toast for the outcome; returns whether it worked.
Future<bool> runAction(Future<dynamic> Function() action, String success) async {
  try {
    await action();
    Toast.success(success);
    return true;
  } catch (e) {
    Toast.error(e is ApiException ? e.message : 'Thao tác thất bại');
    return false;
  }
}

// ─── Order status (web sales ORDER STATUS map) ──────────────────────────────

const orderStatusLabel = {
  'DRAFT': 'Nháp',
  'PENDING_PAYMENT': 'Chờ thanh toán',
  'PENDING_CONFIRMATION': 'Chờ xác nhận',
  'CONFIRMED': 'Đã xác nhận',
  'PICKING': 'Đang lấy hàng',
  'PACKED': 'Đã đóng gói',
  'HANDED_TO_CARRIER': 'Đã bàn giao ĐVVC',
  'SHIPPING': 'Đang giao hàng',
  'DELIVERED': 'Đã giao',
  'CANCELLED': 'Đã hủy',
  'RETURN_REQUESTED': 'Yêu cầu trả hàng',
  'RETURNED': 'Đã trả hàng',
  'REFUNDED': 'Đã hoàn tiền',
};

/// Colour only says where the order stands: waiting, done or failed.
String orderStatusTone(String s) => switch (s) {
      'PENDING_PAYMENT' || 'PENDING_CONFIRMATION' || 'RETURN_REQUESTED' => 'amber',
      'DELIVERED' => 'green',
      'CANCELLED' || 'RETURNED' || 'REFUNDED' => 'red',
      _ => 'gray',
    };

Widget orderStatusBadge(String? s) => ToneBadge(orderStatusLabel[s] ?? (s ?? '—'), tone: orderStatusTone(s ?? ''));

const paymentMethodLabel = {
  'COD': 'COD',
  'BANK_TRANSFER': 'Chuyển khoản',
  'PAYOS': 'PayOS',
  'MOMO': 'MoMo',
  'VNPAY': 'VNPay',
  'CARD': 'Thẻ',
  'CASH': 'Tiền mặt',
};

/// Heading row above a section of a staff page.
class SectionLabel extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionLabel(this.text, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 18, 2, 8),
        child: Row(children: [
          Expanded(child: Text(text.toUpperCase(), style: labelCaps(size: 11, color: AppColors.slate500))),
          ?trailing,
        ]),
      );
}

/// [PillButton] in the staff palette: dark by default, red only for destructive actions.
class StaffButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final PillStyle style;
  final IconData? icon;
  final bool loading;
  final double height;
  final bool expand;
  const StaffButton(this.label,
      {super.key, this.onPressed, this.style = PillStyle.dark, this.icon, this.loading = false, this.height = 44, this.expand = false});

  @override
  Widget build(BuildContext context) =>
      PillButton(label, onPressed: onPressed, style: style, icon: icon, loading: loading, height: height, expand: expand);
}
