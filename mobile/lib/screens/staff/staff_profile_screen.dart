import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';
import 'owner_admin_screens.dart' show roleLabel;
import 'staff_common.dart';

/// Every staff member's own profile (web staff/profile): name and phone are editable.
class StaffProfileScreen extends StatefulWidget {
  const StaffProfileScreen({super.key});

  @override
  State<StaffProfileScreen> createState() => _StaffProfileScreenState();
}

class _StaffProfileScreenState extends State<StaffProfileScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  Map<String, dynamic>? _profile;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final p = Map<String, dynamic>.from(await Api.instance.get('/api/staff/me/profile') as Map);
      _name.text = '${p['fullName'] ?? ''}';
      _phone.text = '${p['phone'] ?? ''}';
      if (mounted) setState(() => _profile = p);
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không tải được hồ sơ');
      if (mounted) setState(() => _profile = const {});
    }
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.length < 2 || name.length > 100) return Toast.error('Họ tên từ 2 đến 100 ký tự');
    if (_phone.text.trim().isNotEmpty && !RegExp(r'^[0-9+\s-]{8,15}$').hasMatch(_phone.text.trim())) {
      return Toast.error('Số điện thoại không hợp lệ (8-15 chữ số)');
    }
    setState(() => _saving = true);
    await runAction(() => Api.instance.put('/api/staff/me/profile', {'fullName': name, 'phone': _phone.text.trim()}), 'Đã cập nhật hồ sơ');
    if (mounted) setState(() => _saving = false);
  }

  Widget _field(String label, TextEditingController c, {TextInputType? type}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label),
        TextField(
          controller: c,
          keyboardType: type,
          decoration: InputDecoration(isDense: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final p = _profile;
    return StaffShell(
      path: '/staff/profile',
      title: 'Hồ sơ cá nhân',
      body: p == null
          ? const LoadingView()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                AppCard(
                  radius: 14,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      InfoLine(Icons.mail_outline, '${p['email'] ?? ''}'),
                      InfoLine(Icons.badge_outlined, roleLabel[p['role']] ?? '${p['role'] ?? ''}'),
                      if (p['shopId'] != null) InfoLine(Icons.storefront_outlined, 'Chi nhánh #${p['shopId']}'),
                      if (p['createdAt'] != null) InfoLine(Icons.event, 'Tham gia ${formatDate(p['createdAt'])}'),
                      const SizedBox(height: 14),
                      _field('Họ tên', _name),
                      _field('Số điện thoại', _phone, type: TextInputType.phone),
                      StaffButton('Lưu thay đổi', expand: true, height: 46, loading: _saving, onPressed: _saving ? null : _save),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                StaffButton(
                  'Đổi mật khẩu',
                  style: PillStyle.outline,
                  expand: true,
                  height: 44,
                  icon: Icons.lock_outline,
                  onPressed: () => context.push('/staff/change-password'),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Email và vai trò do quản trị viên quản lý.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: AppColors.slate500),
                ),
              ],
            ),
    );
  }
}
