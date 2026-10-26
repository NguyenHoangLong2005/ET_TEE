import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';
import 'staff_common.dart';

/// Extra per-row action of a [CrudScreen] (e.g. "Bật/Tắt").
typedef CrudAction = (String label, IconData icon, Future<void> Function(Map<String, dynamic> item));

/// List + create/edit/delete for the simple catalog pages (categories, manufacturers, suppliers,
/// shops, feature flags...): one search box, a card per row, a form sheet and a guarded delete.
class CrudScreen extends StatefulWidget {
  final String path;
  final String title;
  final String searchHint;
  final String? intro;
  final Future<List<Map<String, dynamic>>> Function(String query) load;

  /// true: [load] filters on the server (debounced); false: the list is filtered here by [searchText].
  final bool serverSearch;
  final String Function(Map<String, dynamic> item) searchText;
  final String Function(Map<String, dynamic> item) itemTitle;
  final List<(IconData, String)> Function(Map<String, dynamic> item) itemLines;
  final Widget? Function(Map<String, dynamic> item)? badge;

  /// Form; null item = create. Without [save] the screen is read-only.
  final String noun;
  final List<FormFieldSpec> Function(Map<String, dynamic>? item)? fields;
  final Future<void> Function(Map<String, dynamic>? item, Map<String, String> values)? save;
  final bool canCreate;
  final bool editable;

  /// Delete; [deleteBlocker] returns why the row cannot go (null = it can).
  final Future<void> Function(Map<String, dynamic> item)? delete;
  final Future<String?> Function(Map<String, dynamic> item)? deleteBlocker;
  final List<CrudAction> actions;

  const CrudScreen({
    super.key,
    required this.path,
    required this.title,
    required this.load,
    required this.itemTitle,
    required this.itemLines,
    required this.noun,
    this.searchHint = 'Tìm kiếm...',
    this.intro,
    this.serverSearch = false,
    this.searchText = _defaultSearch,
    this.badge,
    this.fields,
    this.save,
    this.canCreate = true,
    this.editable = true,
    this.delete,
    this.deleteBlocker,
    this.actions = const [],
  });

  static String _defaultSearch(Map<String, dynamic> item) => item.values.join(' ');

  @override
  State<CrudScreen> createState() => _CrudScreenState();
}

class _CrudScreenState extends State<CrudScreen> {
  final _loader = GlobalKey<LoaderState<List<Map<String, dynamic>>>>();
  String _q = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _edit(Map<String, dynamic>? item) async {
    final fields = widget.fields;
    final save = widget.save;
    if (fields == null || save == null) return;
    final r = await formSheet(
      context,
      title: item == null ? 'Thêm ${widget.noun}' : 'Sửa ${widget.noun}',
      subtitle: item == null ? null : widget.itemTitle(item),
      fields: fields(item),
      confirm: item == null ? 'Thêm' : 'Lưu',
      submit: (v) => save(item, v),
    );
    if (r != null) {
      Toast.success(item == null ? 'Đã thêm ${widget.noun}' : 'Đã cập nhật ${widget.noun}');
      await _loader.currentState?.reload();
    }
  }

  Future<void> _delete(Map<String, dynamic> item) async {
    final del = widget.delete;
    if (del == null) return;
    if (widget.deleteBlocker != null) {
      try {
        final reason = await widget.deleteBlocker!(item);
        if (reason != null) {
          Toast.error(reason);
          return;
        }
      } catch (e) {
        Toast.error(e is ApiException ? e.message : 'Không kiểm tra được điều kiện xóa');
        return;
      }
    }
    if (!mounted) return;
    if (!await confirmDialog(context, 'Xóa ${widget.noun}', 'Xóa "${widget.itemTitle(item)}"? Không thể hoàn tác.', confirm: 'Xóa')) return;
    await runAction(() => del(item), 'Đã xóa ${widget.noun}');
    await _loader.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) => StaffShell(
    path: widget.path,
    title: widget.title,
    floatingAction: widget.canCreate && widget.save != null
        ? FloatingActionButton.extended(
            backgroundColor: AppColors.slate900,
            foregroundColor: Colors.white,
            onPressed: () => _edit(null),
            icon: const Icon(Icons.add),
            label: Text('Thêm ${widget.noun}'),
          )
        : null,
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: StaffSearch(
            hint: widget.searchHint,
            onChanged: (v) {
              if (widget.serverSearch) {
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
            load: () => widget.load(_q.trim()),
            builder: (context, all, reload) {
              final q = _q.trim().toLowerCase();
              final list = widget.serverSearch || q.isEmpty ? all : all.where((i) => widget.searchText(i).toLowerCase().contains(q)).toList();
              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                children: [
                  if (widget.intro != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Text(widget.intro!, style: const TextStyle(fontSize: 12.5, color: AppColors.slate600)),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text('${list.length} ${widget.noun}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                  ),
                  if (list.isEmpty) EmptyPanel(icon: Icons.inbox_outlined, title: 'Chưa có ${widget.noun} nào'),
                  for (final item in list.take(300))
                    RecordCard(
                      onTap: widget.save == null || !widget.editable ? null : () => _edit(item),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(widget.itemTitle(item), style: const TextStyle(fontWeight: FontWeight.w700)),
                                    ),
                                    ?widget.badge?.call(item),
                                  ],
                                ),
                                for (final (icon, text) in widget.itemLines(item))
                                  if (text.trim().isNotEmpty) InfoLine(icon, text),
                              ],
                            ),
                          ),
                          if (widget.delete != null || widget.actions.isNotEmpty)
                            PopupMenuButton<int>(
                              icon: const Icon(Icons.more_vert, size: 20, color: AppColors.slate400),
                              onSelected: (i) async {
                                if (i < widget.actions.length) {
                                  await widget.actions[i].$3(item);
                                  await _loader.currentState?.reload();
                                } else {
                                  await _delete(item);
                                }
                              },
                              itemBuilder: (_) => [
                                for (var i = 0; i < widget.actions.length; i++)
                                  PopupMenuItem(
                                    value: i,
                                    child: Row(
                                      children: [
                                        Icon(widget.actions[i].$2, size: 18, color: AppColors.slate500),
                                        const SizedBox(width: 10),
                                        Text(widget.actions[i].$1),
                                      ],
                                    ),
                                  ),
                                if (widget.delete != null)
                                  PopupMenuItem(
                                    value: widget.actions.length,
                                    child: const Row(
                                      children: [
                                        Icon(Icons.delete_outline, size: 18, color: AppColors.red600),
                                        SizedBox(width: 10),
                                        Text('Xóa', style: TextStyle(color: AppColors.red600)),
                                      ],
                                    ),
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
}

/// Boolean field for [formSheet] (option chips).
FormFieldSpec boolField(String key, String label, bool value, {String on = 'Đang hoạt động', String off = 'Ngừng hoạt động'}) =>
    FormFieldSpec(key, label, options: [('true', on), ('false', off)], initial: '$value');

/// Active/inactive badge: only the inactive state gets colour.
Widget? activeBadge(bool active, {String off = 'Ngừng hoạt động'}) => active ? null : ToneBadge(off, tone: 'red');
