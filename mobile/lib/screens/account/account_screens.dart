import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../models/voucher.dart';
import '../../services/shop_service.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import '../../widgets/order_widgets.dart';
import '../../widgets/store_scaffold.dart';
import '../auth/auth_screens.dart';

const accountNav = [
  ('Hồ sơ của tôi', '/account/profile', Icons.person_outline),
  ('Số đo & Kích cỡ', '/account/measurements', Icons.straighten),
  ('Lịch sử đơn hàng', '/account/orders', Icons.inventory_2_outlined),
  ('Voucher của tôi', '/account/vouchers', Icons.confirmation_number_outlined),
  ('Đổi mật khẩu', '/account/change-password', Icons.lock_outline),
  ('Đánh giá của tôi', '/account/reviews', Icons.star_outline),
  ('Hỗ trợ & Khiếu nại', '/account/tickets', Icons.support_outlined),
];

String initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
  if (parts.isEmpty) return 'U';
  return parts.map((w) => w[0]).toList().reversed.take(2).toList().reversed.join().toUpperCase();
}

/// The account sidebar of the web layout, as the account home screen.
class AccountHomeScreen extends StatelessWidget {
  const AccountHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user!;
    return StoreScaffold(
      background: const Color(0x80F8FAFC),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          AppCard(
            color: AppColors.slate50,
            child: Column(children: [
              Row(children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppColors.primary,
                  child: Text(initials(user.fullName), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(user.fullName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    Text(user.email, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                    const SizedBox(height: 5),
                    StatusPill(user.role == 'USER' ? 'Khách hàng' : user.role, bg: AppColors.red50, fg: AppColors.primary, border: const Color(0xFFFEE2E2)),
                  ]),
                ),
              ]),
              const SizedBox(height: 20),
              for (final (label, path, icon) in accountNav)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => context.push(path),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
                        child: Row(children: [
                          Icon(icon, size: 18, color: AppColors.slate600),
                          const SizedBox(width: 12),
                          Expanded(child: Text(label.toUpperCase(), style: labelCaps(size: 12, color: AppColors.slate700))),
                          const Icon(Icons.chevron_right, size: 18, color: AppColors.slate400),
                        ]),
                      ),
                    ),
                  ),
                ),
              const Divider(height: 24, color: AppColors.slate200),
              InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () async {
                  await context.read<AuthProvider>().logout();
                  if (context.mounted) context.go('/auth/login');
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(children: [
                    const Icon(Icons.logout, size: 18, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Text('ĐĂNG XUẤT', style: labelCaps(size: 12, color: AppColors.primary)),
                  ]),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

/// Error card with retry, used by the account pages.
class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _LoadError(this.message, this.onRetry);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: const Color(0x80FFF1F2), borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.rose200)),
        child: Column(children: [
          const Icon(Icons.error_outline, size: 44, color: AppColors.rose500),
          const SizedBox(height: 10),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.rose700, fontWeight: FontWeight.w500)),
          const SizedBox(height: 14),
          PillButton('Thử lại', icon: Icons.refresh, height: 40, onPressed: onRetry),
        ]),
      );
}

// ─── Profile ────────────────────────────────────────────────────────────────

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  String _gender = '';
  String _dob = '';
  Map<String, String>? _original;
  bool _loading = true, _saving = false;
  String? _error;
  String _phoneError = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Map<String, String> get _data => {
        'fullName': _name.text,
        'phone': _phone.text,
        'gender': _gender,
        'dateOfBirth': _dob,
        'defaultShippingAddress': _address.text,
      };

  void _apply(Map<String, String> d) {
    _name.text = d['fullName']!;
    _phone.text = d['phone']!;
    _gender = d['gender']!;
    _dob = d['dateOfBirth']!;
    _address.text = d['defaultShippingAddress']!;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await Api.instance.get('/api/account/profile') as Map;
      final data = {
        'fullName': '${d['fullName'] ?? ''}',
        'phone': '${d['phone'] ?? ''}',
        'gender': '${d['gender'] ?? ''}',
        'dateOfBirth': '${d['dateOfBirth'] ?? ''}',
        'defaultShippingAddress': '${d['defaultShippingAddress'] ?? ''}',
      };
      _apply(data);
      _original = data;
    } on ApiException catch (e) {
      _error = e.status == 0 ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.' : 'Không thể tải thông tin hồ sơ. Vui lòng thử lại.';
    } catch (_) {
      _error = 'Không thể tải thông tin hồ sơ. Vui lòng thử lại.';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _editing => _original != null && _data.toString() != _original.toString();

  Future<void> _save() async {
    if (_phoneError.isNotEmpty) return Toast.error('Vui lòng sửa các lỗi trên form trước khi lưu.');
    if (_name.text.trim().isEmpty) return Toast.error('Họ tên không được để trống.');
    if (_dob.isNotEmpty && (DateTime.tryParse(_dob)?.isAfter(DateTime.now()) ?? false)) {
      return Toast.error('Ngày sinh không thể là ngày trong tương lai.');
    }
    setState(() => _saving = true);
    try {
      await Api.instance.call('PUT', '/api/account/profile', body: _data, fallbackError: 'Lỗi cập nhật hồ sơ');
      Toast.success('Đã cập nhật hồ sơ thành công!');
      if (mounted) context.read<AuthProvider>().updateUser(fullName: _name.text.trim(), phone: _phone.text.trim());
      setState(() => _original = Map.of(_data));
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Đã xảy ra lỗi khi cập nhật hồ sơ.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return SubPageScaffold(
      title: 'Hồ sơ cá nhân',
      body: _loading
          ? const LoadingView()
          : _error != null
              ? Padding(padding: const EdgeInsets.all(16), child: _LoadError(_error!, _load))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
                  children: [
                    Row(children: [
                      CircleAvatar(
                        radius: 38,
                        backgroundColor: AppColors.primary,
                        child: Text(initials(user?.fullName ?? ''), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                      ),
                      const SizedBox(width: 18),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(user?.fullName ?? '', style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
                          Text(user?.email ?? '', style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
                        ]),
                      ),
                    ]),
                    const SizedBox(height: 26),
                    Text('THÔNG TIN CÁ NHÂN', style: labelCaps(size: 13, color: AppColors.slate900)),
                    const SizedBox(height: 14),
                    const FieldLabel('Họ và tên', required: true),
                    TextField(controller: _name, onChanged: (_) => setState(() {})),
                    const SizedBox(height: 14),
                    const FieldLabel('Giới tính'),
                    DropdownButtonFormField<String>(
                      initialValue: _gender,
                      items: const [
                        DropdownMenuItem(value: '', child: Text('Chưa xác định')),
                        DropdownMenuItem(value: 'MALE', child: Text('Nam')),
                        DropdownMenuItem(value: 'FEMALE', child: Text('Nữ')),
                        DropdownMenuItem(value: 'OTHER', child: Text('Khác')),
                      ],
                      onChanged: (v) => setState(() => _gender = v ?? ''),
                    ),
                    const SizedBox(height: 14),
                    const FieldLabel('Ngày sinh'),
                    InkWell(
                      onTap: () async {
                        final now = DateTime.now();
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: DateTime.tryParse(_dob) ?? DateTime(now.year - 25),
                          firstDate: DateTime(1920),
                          lastDate: now,
                        );
                        if (picked != null) {
                          setState(() => _dob = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
                        }
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(suffixIcon: Icon(Icons.calendar_today_outlined, size: 18)),
                        child: Text(_dob.isEmpty ? 'dd/mm/yyyy' : formatDate(_dob), style: TextStyle(color: _dob.isEmpty ? AppColors.slate400 : AppColors.slate900)),
                      ),
                    ),
                    const Divider(height: 40),
                    Text('THÔNG TIN LIÊN HỆ', style: labelCaps(size: 13, color: AppColors.slate900)),
                    const SizedBox(height: 14),
                    FieldLabel('Email', trailing: StatusPill('Không thể sửa', bg: AppColors.slate100, fg: AppColors.slate400, fontSize: 10)),
                    TextField(
                      controller: TextEditingController(text: user?.email ?? ''),
                      enabled: false,
                      decoration: const InputDecoration(fillColor: AppColors.slate50),
                    ),
                    const SizedBox(height: 14),
                    const FieldLabel('Số điện thoại'),
                    TextField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(hintText: '0912 345 678', errorText: _phoneError.isEmpty ? null : _phoneError),
                      onChanged: (v) => setState(() {
                        _phoneError = v.isNotEmpty && !RegExp(r'(0[3|5|7|8|9])+([0-9]{8})\b').hasMatch(v) ? 'Số điện thoại không hợp lệ (vd: 0912345678)' : '';
                      }),
                    ),
                    const SizedBox(height: 14),
                    const FieldLabel('Địa chỉ giao hàng mặc định'),
                    TextField(
                      controller: _address,
                      maxLines: 3,
                      decoration: const InputDecoration(hintText: 'Ví dụ: 123 Nguyễn Trãi, Quận 1, TP.HCM'),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 24),
                    PillButton('Lưu thay đổi',
                        icon: Icons.save_outlined, expand: true, loading: _saving, onPressed: _saving || !_editing || _phoneError.isNotEmpty ? null : _save),
                    if (_editing) ...[
                      const SizedBox(height: 10),
                      PillButton('Hủy', style: PillStyle.outline, expand: true, onPressed: () => setState(() {
                            _apply(_original!);
                            _phoneError = '';
                          })),
                    ],
                  ],
                ),
    );
  }
}

// ─── Measurements ───────────────────────────────────────────────────────────

class MeasurementsScreen extends StatefulWidget {
  const MeasurementsScreen({super.key});

  @override
  State<MeasurementsScreen> createState() => _MeasurementsScreenState();
}

class _MeasurementsScreenState extends State<MeasurementsScreen> {
  static const _numeric = ['heightCm', 'weightKg', 'shoulderCm', 'chestCm', 'waistCm', 'hipCm', 'armLengthCm', 'legLengthCm'];
  final _c = {for (final k in [..._numeric, 'shoeSize', 'note']) k: TextEditingController()};
  String _profileType = 'SELF_ADULT', _adultSize = '', _kidsSize = '', _fit = '';
  Map<String, String>? _original;
  bool _loading = true, _saving = false, _changed = false;
  String? _error;

  static const _profiles = [('SELF_ADULT', 'Người lớn (Bản thân)'), ('CHILD', 'Trẻ em'), ('OTHER', 'Mua hộ / Khác')];
  static const _fits = [('SLIM', 'Ôm vừa vặn', 'Slim fit'), ('REGULAR', 'Thoải mái', 'Regular fit'), ('LOOSE', 'Rộng rãi', 'Loose / Oversize')];
  static const _detailed = [
    ('shoulderCm', 'Vai', 'Đo từ mỏm vai trái sang mỏm vai phải.'),
    ('chestCm', 'Ngực', 'Đo vòng quanh phần nở nhất của ngực.'),
    ('waistCm', 'Eo', 'Đo vòng quanh phần nhỏ nhất của eo.'),
    ('hipCm', 'Mông', 'Đo vòng quanh phần nở nhất của mông.'),
    ('armLengthCm', 'Dài tay', 'Đo từ mỏm vai đến cổ tay.'),
    ('legLengthCm', 'Dài chân', 'Đo từ eo xuống mắt cá chân.'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  Map<String, String> get _snapshot => {
        for (final e in _c.entries) e.key: e.value.text,
        'measurementProfileType': _profileType,
        'preferredAdultSize': _adultSize,
        'preferredKidsSize': _kidsSize,
        'fitPreference': _fit,
      };

  void _apply(Map<String, String> d) {
    for (final e in _c.entries) {
      e.value.text = d[e.key] ?? '';
    }
    _profileType = d['measurementProfileType'] ?? 'SELF_ADULT';
    _adultSize = d['preferredAdultSize'] ?? '';
    _kidsSize = d['preferredKidsSize'] ?? '';
    _fit = d['fitPreference'] ?? '';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await Api.instance.get('/api/account/measurements') as Map;
      String s(dynamic v) => v == null ? '' : (v is num && v == v.roundToDouble() ? '${v.round()}' : '$v');
      final data = {
        for (final k in _numeric) k: s(d[k]),
        'shoeSize': s(d['shoeSize']),
        'note': s(d['note']),
        'measurementProfileType': '${d['measurementProfileType'] ?? 'SELF_ADULT'}',
        'preferredAdultSize': s(d['preferredAdultSize']),
        'preferredKidsSize': s(d['preferredKidsSize']),
        'fitPreference': s(d['fitPreference']),
      };
      _apply(data);
      _original = data;
    } catch (e) {
      _error = e is ApiException && e.status == 0
          ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.'
          : 'Không thể tải thông tin số đo. Vui lòng thử lại.';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final h = num.tryParse(_c['heightCm']!.text), w = num.tryParse(_c['weightKg']!.text);
    if (h != null && (h < 80 || h > 230)) return Toast.error('Chiều cao phải từ 80 đến 230 cm.');
    if (w != null && (w < 10 || w > 200)) return Toast.error('Cân nặng phải từ 10 đến 200 kg.');
    setState(() => _saving = true);
    final payload = <String, dynamic>{..._snapshot};
    for (final k in _numeric) {
      payload[k] = payload[k] == '' ? null : num.tryParse(payload[k] as String);
    }
    try {
      await Api.instance.call('PUT', '/api/account/measurements', body: payload, fallbackError: 'Lỗi cập nhật số đo');
      Toast.success('Đã lưu thông số thành công!');
      setState(() {
        _original = _snapshot;
        _changed = false;
      });
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Đã xảy ra lỗi khi lưu số đo.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _mark() => setState(() => _changed = true);

  @override
  Widget build(BuildContext context) {
    return SubPageScaffold(
      title: 'Số đo & Kích cỡ',
      body: _loading
          ? const LoadingView()
          : _error != null
              ? Padding(padding: const EdgeInsets.all(16), child: _LoadError(_error!, _load))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                  children: [
                    const Text('Lưu số đo để ET.TEE giúp bạn chọn size chuẩn xác nhất.', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
                    const SizedBox(height: 18),
                    AppCard(
                      color: const Color(0xCCF8FAFC),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text.rich(TextSpan(children: [
                          TextSpan(text: 'Đối tượng đo ', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          TextSpan(text: '*', style: TextStyle(color: AppColors.primary)),
                        ])),
                        const SizedBox(height: 12),
                        for (final (id, label) in _profiles)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: GestureDetector(
                              onTap: () => setState(() {
                                _profileType = id;
                                if (id == 'SELF_ADULT') _kidsSize = '';
                                if (id == 'CHILD') _adultSize = '';
                                _changed = true;
                              }),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: _profileType == id ? Colors.white : AppColors.slate100,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: _profileType == id ? AppColors.slate900 : Colors.transparent, width: 2),
                                ),
                                child: Row(children: [
                                  Icon(_profileType == id ? Icons.radio_button_checked : Icons.radio_button_off,
                                      size: 20, color: _profileType == id ? AppColors.slate900 : AppColors.slate300),
                                  const SizedBox(width: 10),
                                  Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: _profileType == id ? AppColors.slate900 : AppColors.slate600)),
                                ]),
                              ),
                            ),
                          ),
                      ]),
                    ),
                    const SizedBox(height: 22),
                    const Text('Chỉ số cơ bản', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(child: _numField('heightCm', 'Chiều cao', '170', 'cm')),
                      const SizedBox(width: 12),
                      Expanded(child: _numField('weightKg', 'Cân nặng', '65', 'kg')),
                    ]),
                    const SizedBox(height: 22),
                    const Text('Size ưu tiên', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    const SizedBox(height: 12),
                    Row(children: [
                      if (_profileType != 'CHILD')
                        Expanded(
                          child: _dropdown('Áo/Quần người lớn', _adultSize, const ['XS', 'S', 'M', 'L', 'XL', 'XXL'], null, (v) {
                            _adultSize = v;
                            _mark();
                          }),
                        ),
                      if (_profileType != 'CHILD' && _profileType != 'SELF_ADULT') const SizedBox(width: 12),
                      if (_profileType != 'SELF_ADULT')
                        Expanded(
                          child: _dropdown(
                              'Trẻ em',
                              _kidsSize,
                              const ['90', '100', '110', '120', '130', '140', '150', '160'],
                              const ['1-2T', '2-3T', '3-4T', '5-6T', '7-8T', '9-10T', '11-12T', '13-14T'], (v) {
                            _kidsSize = v;
                            _mark();
                          }),
                        ),
                    ]),
                    const SizedBox(height: 12),
                    const Text('Giày/dép', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.slate600)),
                    const SizedBox(height: 6),
                    TextField(controller: _c['shoeSize'], decoration: const InputDecoration(hintText: 'Vd: 40 hoặc 250mm'), onChanged: (_) => _mark()),
                    const SizedBox(height: 22),
                    const Text('Sở thích mặc đồ', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    const SizedBox(height: 12),
                    Row(children: [
                      for (final (id, label, sub) in _fits)
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() {
                              _fit = id;
                              _changed = true;
                            }),
                            child: Container(
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
                              decoration: BoxDecoration(
                                color: _fit == id ? Colors.white : AppColors.slate50,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: _fit == id ? AppColors.slate900 : AppColors.slate200, width: _fit == id ? 2 : 1),
                              ),
                              child: Column(children: [
                                Text(label, textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: _fit == id ? AppColors.slate900 : AppColors.slate600)),
                                Text(sub, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
                              ]),
                            ),
                          ),
                        ),
                    ]),
                    const SizedBox(height: 22),
                    const Text('Số đo chi tiết (cm)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    const Text('Giúp hệ thống gợi ý size quần áo chuẩn xác hơn (Không bắt buộc)', style: TextStyle(fontSize: 13, color: AppColors.slate500)),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.9,
                      children: [for (final (k, label, desc) in _detailed) _numField(k, label, '', 'cm', help: desc)],
                    ),
                    const SizedBox(height: 14),
                    const Text('Ghi chú', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.slate600)),
                    const SizedBox(height: 6),
                    TextField(controller: _c['note'], maxLines: 2, onChanged: (_) => _mark()),
                    const SizedBox(height: 24),
                    PillButton('Lưu số đo', icon: Icons.save_outlined, expand: true, loading: _saving, onPressed: _saving || !_changed ? null : _save),
                    if (_changed) ...[
                      const SizedBox(height: 10),
                      PillButton('Hủy', style: PillStyle.outline, expand: true, onPressed: () => setState(() {
                            if (_original != null) _apply(_original!);
                            _changed = false;
                          })),
                    ],
                  ],
                ),
    );
  }

  Widget _numField(String key, String label, String hint, String unit, {String? help}) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate600)),
            if (help != null)
              Tooltip(
                message: help,
                triggerMode: TooltipTriggerMode.tap,
                child: const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.help_outline, size: 14, color: AppColors.slate400)),
              ),
          ]),
          const SizedBox(height: 6),
          TextField(
            controller: _c[key],
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(hintText: hint, suffixText: unit),
            onChanged: (_) => _mark(),
          ),
        ],
      );

  Widget _dropdown(String label, String value, List<String> options, List<String>? sub, ValueChanged<String> onChanged) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate600)),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            initialValue: options.contains(value) ? value : '',
            isExpanded: true,
            items: [
              const DropdownMenuItem(value: '', child: Text('Chọn size...')),
              for (var i = 0; i < options.length; i++)
                DropdownMenuItem(value: options[i], child: Text(sub == null ? options[i] : '${options[i]} (${sub[i]})')),
            ],
            onChanged: (v) => setState(() => onChanged(v ?? '')),
          ),
        ],
      );
}

// ─── Orders ─────────────────────────────────────────────────────────────────

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String? _error;
  String _filter = 'ALL';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _orders = await OrderService.myOrders();
    } on ApiException catch (e) {
      _error = e.status == 0 ? 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.' : 'Không thể tải lịch sử đơn hàng.';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Warehouse steps (PICKING/PACKED) and HANDED_TO_CARRIER belong to a tab too.
  bool _match(String? s) => switch (_filter) {
        'PENDING' => ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PICKING', 'PACKED'].contains(s),
        'SHIPPING' => ['HANDED_TO_CARRIER', 'SHIPPING'].contains(s),
        'COMPLETED' => ['DELIVERED', 'COMPLETED'].contains(s),
        'CANCELLED' => ['CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'].contains(s),
        _ => true,
      };

  @override
  Widget build(BuildContext context) {
    final orders = _orders.where((o) => _match(o['orderStatus'] as String?)).toList();
    return SubPageScaffold(
      title: 'Lịch sử đơn hàng',
      background: const Color(0x80F8FAFC),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
          children: [
            FilterTabs(
              tabs: const [('ALL', 'Tất cả'), ('PENDING', 'Chờ xử lý'), ('SHIPPING', 'Đang giao'), ('COMPLETED', 'Hoàn thành'), ('CANCELLED', 'Hủy / Trả hàng')],
              value: _filter,
              onChanged: (v) => setState(() => _filter = v),
            ),
            const SizedBox(height: 16),
            if (_loading)
              const LoadingView()
            else if (_error != null)
              _LoadError(_error!, _load)
            else if (orders.isEmpty)
              EmptyPanel(
                icon: Icons.inventory_2_outlined,
                title: 'Không tìm thấy đơn hàng nào',
                message: 'Bạn chưa có đơn hàng nào trong trạng thái này.',
                action: PillButton('Khám phá ET.TEE ngay', onPressed: () => context.go('/products')),
              )
            else
              for (final o in orders) _orderCard(o),
          ],
        ),
      ),
    );
  }

  Widget _orderCard(Map<String, dynamic> o) {
    final status = o['orderStatus'] as String?;
    final items = asList(o['items']).whereType<Map<String, dynamic>>().toList();
    final code = '${o['orderCode']}';
    final canPay = o['paymentMethod'] == 'BANK_TRANSFER' && o['paymentStatus'] != 'PAID' && status == 'PENDING_PAYMENT';
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xCCE2E8F0))),
      clipBehavior: Clip.antiAlias,
      child: Column(children: [
        Container(
          color: const Color(0xCCF8FAFC),
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(code, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                Text(formatDateTime(o['createdAt']), style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
              ]),
            ),
            orderStatusPill(status),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(14),
          child: items.isEmpty
              ? const Text('Không có thông tin sản phẩm', style: TextStyle(fontStyle: FontStyle.italic, color: AppColors.slate500))
              : Column(children: [
                  for (final item in items)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: SizedBox(
                            width: 68,
                            height: 68,
                            child: NetImage(resolveImageUrl(item['imageUrl'] ?? item['image']),
                                fallback: Container(color: AppColors.slate50, child: const Icon(Icons.inventory_2_outlined, color: AppColors.slate300))),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            GestureDetector(
                              onTap: () => context.push('/products/${item['productSlug']}'),
                              child: Text('${item['productName'] ?? ''}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            ),
                            const SizedBox(height: 4),
                            Row(children: [
                              Text('Size: ${item['size'] ?? 'Free'} | Màu: ', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                              if (item['colorHex'] != null || '${item['color'] ?? ''}'.startsWith('#'))
                                Padding(padding: const EdgeInsets.only(right: 4), child: ColorDot('${item['colorHex'] ?? item['color']}')),
                              Flexible(
                                child: Text('${item['color'] ?? 'Mặc định'}',
                                    overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate800)),
                              ),
                            ]),
                            if (status == 'DELIVERED' || status == 'COMPLETED')
                              Align(
                                alignment: Alignment.centerRight,
                                child: Padding(
                                  padding: const EdgeInsets.only(top: 6),
                                  child: item['reviewed'] == true
                                      ? const StatusPill('Đã đánh giá', bg: AppColors.emerald50, fg: AppColors.emerald700, border: AppColors.emerald200)
                                      : GestureDetector(
                                          onTap: () => context.push('/products/${item['productSlug']}'),
                                          child: const StatusPill('Viết đánh giá', bg: AppColors.primary, fg: Colors.white),
                                        ),
                                ),
                              ),
                          ]),
                        ),
                        Text('x${item['quantity']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                      ]),
                    ),
                ]),
        ),
        Container(
          decoration: const BoxDecoration(color: Color(0x80F8FAFC), border: Border(top: BorderSide(color: Color(0xCCE2E8F0)))),
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              const Text('Tổng tiền: ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate600)),
              Text('${formatNumber(toNum(o['totalAmount']))}₫', style: headline(19, color: AppColors.primary)),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              if (canPay) ...[
                Expanded(child: PillButton('Thanh toán', height: 42, radius: BorderRadius.circular(12), onPressed: () => context.push('/account/orders/$code'))),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: PillButton('Xem chi tiết',
                    style: PillStyle.outline,
                    icon: Icons.visibility_outlined,
                    height: 42,
                    radius: BorderRadius.circular(12),
                    onPressed: () async {
                      await context.push('/account/orders/$code');
                      _load();
                    }),
              ),
            ]),
          ]),
        ),
      ]),
    );
  }
}

// ─── Order detail ───────────────────────────────────────────────────────────

class OrderDetailScreen extends StatefulWidget {
  final String orderCode;
  const OrderDetailScreen({super.key, required this.orderCode});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Map<String, dynamic>? _order;
  bool _loading = true, _cancelling = false, _showReturn = false, _requestingReturn = false, _submitting = false, _showQr = false;
  final _returnReason = TextEditingController();
  final _name = TextEditingController(), _phone = TextEditingController(), _address = TextEditingController();
  final _errors = <String, String>{};
  String _method = 'BANK_TRANSFER';
  Map<String, dynamic>? _bank;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_returnReason, _name, _phone, _address]) {
      c.dispose();
    }
    super.dispose();
  }

  void _apply(Map<String, dynamic>? d) {
    _order = d;
    if (d == null) return;
    _name.text = '${d['customerName'] ?? ''}';
    _phone.text = '${d['customerPhone'] ?? ''}';
    _address.text = '${d['shippingAddressSnapshot'] ?? d['shippingAddress'] ?? ''}';
    if (d['paymentMethod'] == 'COD' || d['paymentMethod'] == 'BANK_TRANSFER') _method = d['paymentMethod'] as String;
    if (_awaiting && _bank == null) {
      OrderService.bankConfig().then((b) {
        if (mounted) setState(() => _bank = b);
      });
    }
  }

  bool get _awaiting => _order?['orderStatus'] == 'PENDING_PAYMENT' && _order?['paymentStatus'] != 'PAID';

  Future<void> _load() async {
    Map<String, dynamic>? o;
    try {
      o = await OrderService.byCode(widget.orderCode);
      // Fallback: look it up in the shopper's own list
      if (o == null) {
        final all = await OrderService.myOrders();
        o = all.where((x) => x['orderCode'] == widget.orderCode).firstOrNull;
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _apply(o);
      _loading = false;
    });
  }

  Future<void> _cancel() async {
    if (!await confirmDialog(context, 'Hủy đơn hàng', 'Bạn có chắc chắn muốn hủy đơn hàng này không?', confirm: 'Hủy đơn')) return;
    setState(() => _cancelling = true);
    final ok = await OrderService.cancel(widget.orderCode);
    if (ok) {
      Toast.success('Đã gửi yêu cầu hủy đơn hàng thành công!');
      setState(() {
        _order = {...?_order, 'orderStatus': 'CANCELLED'};
        _showQr = false;
      });
    } else {
      Toast.error('Không thể hủy đơn hàng vào lúc này. Vui lòng liên hệ bộ phận CSKH.');
    }
    if (mounted) setState(() => _cancelling = false);
  }

  Future<void> _requestReturn() async {
    if (_returnReason.text.trim().length < 5) return Toast.error('Vui lòng cho biết lý do trả hàng (tối thiểu 5 ký tự)');
    setState(() => _requestingReturn = true);
    try {
      final updated = await OrderService.requestReturn(widget.orderCode, _returnReason.text.trim());
      Toast.success('Đã gửi yêu cầu trả hàng. Cửa hàng sẽ liên hệ với bạn để xử lý.');
      setState(() {
        _apply(updated);
        _showReturn = false;
      });
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không thể gửi yêu cầu trả hàng');
    } finally {
      if (mounted) setState(() => _requestingReturn = false);
    }
  }

  bool _validate() {
    _errors.clear();
    if (_name.text.trim().length < 2) _errors['name'] = 'Vui lòng nhập họ tên người nhận';
    if (!RegExp(r'^[0-9+\s-]{8,15}$').hasMatch(_phone.text.trim())) _errors['phone'] = 'Số điện thoại không hợp lệ (8-15 chữ số)';
    if (_address.text.trim().length < 8) _errors['address'] = 'Địa chỉ quá ngắn, vui lòng nhập số nhà, đường, quận/huyện';
    setState(() {});
    return _errors.isEmpty;
  }

  Future<void> _confirmPayment() async {
    if (!_validate()) return Toast.error('Vui lòng kiểm tra lại thông tin nhận hàng');
    setState(() => _submitting = true);
    try {
      final updated = await OrderService.updatePayment(widget.orderCode, {
        'paymentMethod': _method,
        'customerName': _name.text.trim(),
        'customerPhone': _phone.text.trim(),
        'shippingAddress': _address.text.trim(),
      });
      setState(() {
        _apply(updated);
        _showQr = _method == 'BANK_TRANSFER';
      });
      if (_method == 'COD') Toast.success('Đã chuyển sang thanh toán khi nhận hàng. Đơn hàng đang chờ xác nhận.');
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không thể cập nhật thanh toán');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = _order;
    if (_loading) return const SubPageScaffold(title: 'Đơn hàng', body: LoadingView(message: 'Đang tải đơn hàng...'));
    if (o == null) {
      return SubPageScaffold(
        title: 'Đơn hàng',
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: EmptyPanel(
            icon: Icons.inventory_2_outlined,
            title: 'Không tìm thấy đơn hàng',
            message: 'Đơn hàng ${widget.orderCode} không tồn tại hoặc bạn không có quyền xem.',
            action: PillButton('Quay lại danh sách đơn hàng', style: PillStyle.outline, onPressed: () => context.pop()),
          ),
        ),
      );
    }
    final status = o['orderStatus'] as String?;
    final canCancel = ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PENDING'].contains(status);
    return SubPageScaffold(
      title: 'Đơn hàng #${o['orderCode']}',
      background: const Color(0x80F8FAFC),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
        children: [
          if (formatDateTime(o['createdAt']).isNotEmpty)
            Text('Ngày đặt: ${formatDateTime(o['createdAt'])}', style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
            orderStatusPill(status),
            if (canCancel)
              GestureDetector(
                onTap: _cancelling ? null : _cancel,
                child: StatusPill(_cancelling ? 'Đang xử lý...' : 'Hủy đơn hàng', bg: AppColors.rose50, fg: AppColors.rose700, border: AppColors.rose200),
              ),
            if (status == 'DELIVERED' && o['returnEligible'] == true && !_showReturn)
              GestureDetector(
                onTap: () => setState(() => _showReturn = true),
                child: const StatusPill('Yêu cầu trả hàng', bg: Colors.white, fg: AppColors.slate700, border: AppColors.slate300, icon: Icons.undo),
              ),
          ]),
          const SizedBox(height: 18),
          if (status == 'DELIVERED' && _showReturn) ...[
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: const Color(0x80FFF7ED), borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.orange200)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('YÊU CẦU TRẢ HÀNG', style: labelCaps(size: 13, color: AppColors.slate900, weight: FontWeight.w900)),
                const SizedBox(height: 6),
                Text(
                  'Áp dụng trong 30 ngày kể từ khi nhận hàng${o['returnDeadline'] != null ? ' (hạn chót ${formatDateTime(o['returnDeadline'])})' : ''}. Cửa hàng sẽ liên hệ để hướng dẫn gửi trả và hoàn tiền.',
                  style: const TextStyle(fontSize: 12, color: AppColors.slate600),
                ),
                const SizedBox(height: 12),
                const FieldLabel('Lý do trả hàng', required: true),
                TextField(controller: _returnReason, maxLines: 3, decoration: const InputDecoration(hintText: 'Ví dụ: sản phẩm không vừa size, lỗi đường may...')),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: PillButton(_requestingReturn ? 'Đang gửi...' : 'Gửi yêu cầu', height: 42, onPressed: _requestingReturn ? null : _requestReturn)),
                  const SizedBox(width: 8),
                  Expanded(child: PillButton('Để sau', style: PillStyle.outline, height: 42, onPressed: () => setState(() => _showReturn = false))),
                ]),
              ]),
            ),
            const SizedBox(height: 16),
          ],
          if (_awaiting) ...[
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('1. THÔNG TIN NHẬN HÀNG', style: labelCaps(size: 13, color: AppColors.slate900, weight: FontWeight.w900)),
                const SizedBox(height: 14),
                const FieldLabel('Họ tên', required: true),
                TextField(controller: _name, decoration: InputDecoration(hintText: 'Nguyễn Văn A', errorText: _errors['name'])),
                const SizedBox(height: 12),
                const FieldLabel('Số điện thoại', required: true),
                TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: InputDecoration(hintText: '0901234567', errorText: _errors['phone'])),
                const SizedBox(height: 12),
                const FieldLabel('Địa chỉ giao hàng', required: true),
                TextField(
                  controller: _address,
                  maxLines: 3,
                  decoration: InputDecoration(hintText: 'Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố', errorText: _errors['address']),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('2. PHƯƠNG THỨC THANH TOÁN', style: labelCaps(size: 13, color: AppColors.slate900, weight: FontWeight.w900)),
                const SizedBox(height: 14),
                for (final (id, title, desc, icon) in const [
                  ('BANK_TRANSFER', 'Chuyển khoản qua QR', 'Quét mã QR bằng app ngân hàng, số tiền và nội dung được điền sẵn.', Icons.qr_code_2),
                  ('COD', 'Thanh toán khi nhận hàng', 'Trả tiền mặt cho nhân viên giao hàng khi nhận được sản phẩm.', Icons.payments_outlined),
                ])
                  GestureDetector(
                    onTap: () => setState(() {
                      _method = id;
                      _showQr = false;
                    }),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: _method == id ? AppColors.slate50 : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: _method == id ? AppColors.slate900 : AppColors.slate200, width: 2),
                      ),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Icon(_method == id ? Icons.radio_button_checked : Icons.radio_button_off, color: _method == id ? AppColors.primary : AppColors.slate400),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Icon(icon, size: 16, color: AppColors.slate500),
                              const SizedBox(width: 6),
                              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            ]),
                            const SizedBox(height: 4),
                            Text(desc, style: const TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.4)),
                          ]),
                        ),
                      ]),
                    ),
                  ),
                const SizedBox(height: 8),
                PillButton(
                  _submitting ? 'Đang xử lý...' : _method == 'BANK_TRANSFER' ? 'Xác nhận và hiện mã QR' : 'Xác nhận thanh toán khi nhận hàng',
                  expand: true,
                  height: 52,
                  loading: _submitting,
                  onPressed: _submitting ? null : _confirmPayment,
                ),
              ]),
            ),
            if (_showQr && _method == 'BANK_TRANSFER') ...[
              const SizedBox(height: 16),
              _bank != null
                  ? BankTransferPayment(orderCode: '${o['orderCode']}', customerPhone: o['customerPhone'] as String?, amount: toNum(o['totalAmount']), bankConfig: _bank!)
                  : const AppCard(child: Text('Đang tải thông tin thanh toán...', style: TextStyle(color: AppColors.slate500))),
            ],
          ] else
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('THÔNG TIN NHẬN HÀNG', style: labelCaps(size: 13, color: AppColors.slate900, weight: FontWeight.w900)),
                const SizedBox(height: 10),
                if (o['customerName'] != null) Text('${o['customerName']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                if (o['customerPhone'] != null) Text('SĐT: ${o['customerPhone']}', style: const TextStyle(color: AppColors.slate600)),
                if ((o['shippingAddressSnapshot'] ?? o['shippingAddress']) != null)
                  Text('Địa chỉ: ${o['shippingAddressSnapshot'] ?? o['shippingAddress']}', style: const TextStyle(color: AppColors.slate600, height: 1.5)),
                const Divider(height: 26),
                Text('PHƯƠNG THỨC THANH TOÁN', style: labelCaps(size: 10, color: AppColors.slate400)),
                const SizedBox(height: 4),
                Text(
                  o['paymentMethod'] == 'BANK_TRANSFER'
                      ? 'Chuyển khoản ngân hàng${o['paymentStatus'] == 'PAID' ? ' (đã thanh toán)' : ''}'
                      : 'Thanh toán khi nhận hàng (COD)',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ]),
            ),
          const SizedBox(height: 16),
          OrderSummaryCard(order: o, title: 'Sản phẩm đã đặt', showAddress: false, onOpenProduct: (s) => context.push('/products/$s')),
        ],
      ),
    );
  }
}

// ─── Vouchers ───────────────────────────────────────────────────────────────

/// "Voucher của tôi": personal vouchers (welcome, comeback, customer care) + public ones, and email consent.
class MyVouchersScreen extends StatefulWidget {
  const MyVouchersScreen({super.key});

  @override
  State<MyVouchersScreen> createState() => _MyVouchersScreenState();
}

class _MyVouchersScreenState extends State<MyVouchersScreen> {
  List<VoucherOption>? _vouchers;
  Map<String, dynamic>? _consent;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    // subtotal 0: list everything; conditions are shown on each card
    CustomerMarketingService.vouchersForMe(0).then((v) {
      if (mounted) setState(() => _vouchers = v);
    });
    CustomerMarketingService.getConsent().then((c) {
      if (mounted) setState(() => _consent = c);
    }).catchError((_) {});
  }

  Future<void> _toggle() async {
    if (_consent == null) return;
    setState(() => _saving = true);
    try {
      final next = await CustomerMarketingService.setConsent(_consent!['subscribed'] != true);
      setState(() => _consent = next);
      Toast.success(next['subscribed'] == true ? 'Đã bật nhận email ưu đãi' : 'Đã tắt nhận email ưu đãi');
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không lưu được');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final v = _vouchers;
    final personal = (v ?? []).where((x) => x.personal).toList();
    final shared = (v ?? []).where((x) => !x.personal).toList();
    final subscribed = _consent?['subscribed'] == true;
    return SubPageScaffold(
      title: 'Voucher của tôi',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
        children: [
          if (_consent != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
              child: Row(children: [
                const Icon(Icons.mail_outline, color: AppColors.slate500),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Nhận email ưu đãi', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                      subscribed
                          ? 'Bạn đang nhận email khi có mã giảm giá mới. Email đơn hàng và mã OTP không bị ảnh hưởng.'
                          : 'Đang tắt. Voucher dành cho bạn vẫn xuất hiện ở trang này và khi thanh toán.',
                      style: const TextStyle(fontSize: 12, color: AppColors.slate500),
                    ),
                  ]),
                ),
                Switch(value: subscribed, activeTrackColor: AppColors.slate900, onChanged: _saving ? null : (_) => _toggle()),
              ]),
            ),
            const SizedBox(height: 24),
          ],
          if (v == null)
            const LoadingView()
          else ...[
            Text('DÀNH RIÊNG CHO BẠN', style: labelCaps(size: 13, color: AppColors.slate900, weight: FontWeight.w900)),
            const SizedBox(height: 10),
            if (personal.isEmpty)
              const Text('Chưa có voucher riêng. Voucher chào mừng, quà quay lại và mã bồi thường từ CSKH sẽ hiện ở đây.',
                  style: TextStyle(fontSize: 13, color: AppColors.slate500))
            else
              for (final x in personal) Padding(padding: const EdgeInsets.only(bottom: 10), child: VoucherCard(voucher: x)),
            const SizedBox(height: 24),
            Text('ĐANG ÁP DỤNG CHO MỌI KHÁCH', style: labelCaps(size: 13, color: AppColors.slate900, weight: FontWeight.w900)),
            const SizedBox(height: 10),
            if (shared.isEmpty)
              const Text('Hiện chưa có chương trình nào.', style: TextStyle(fontSize: 13, color: AppColors.slate500))
            else
              for (final x in shared) Padding(padding: const EdgeInsets.only(bottom: 10), child: VoucherCard(voucher: x)),
          ],
        ],
      ),
    );
  }
}

// ─── Change password ────────────────────────────────────────────────────────

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _current = TextEditingController(), _new = TextEditingController(), _confirm = TextEditingController();
  final _errors = <String, String>{};
  bool _saving = false, _success = false, _show = false;
  int _countdown = 3;

  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  bool _validate() {
    _errors.clear();
    if (_current.text.isEmpty) _errors['current'] = 'Vui lòng nhập mật khẩu hiện tại.';
    final n = _new.text;
    if (n.isEmpty) {
      _errors['new'] = 'Vui lòng nhập mật khẩu mới.';
    } else if (n.length < 8) {
      _errors['new'] = 'Mật khẩu mới phải từ 8 ký tự trở lên.';
    } else if (!RegExp(r'[a-zA-Z]').hasMatch(n) || !RegExp(r'[0-9]').hasMatch(n)) {
      _errors['new'] = 'Mật khẩu mới phải bao gồm cả chữ và số.';
    }
    if (_confirm.text.isEmpty) {
      _errors['confirm'] = 'Vui lòng xác nhận mật khẩu mới.';
    } else if (_confirm.text != n) {
      _errors['confirm'] = 'Xác nhận mật khẩu không khớp.';
    }
    setState(() {});
    return _errors.isEmpty;
  }

  Future<void> _save() async {
    if (!_validate()) return;
    setState(() => _saving = true);
    try {
      await Api.instance.call('PUT', '/api/account/change-password',
          body: {'currentPassword': _current.text, 'newPassword': _new.text, 'confirmPassword': _confirm.text}, fallbackError: 'Lỗi đổi mật khẩu');
      Toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setState(() => _success = true);
      Timer.periodic(const Duration(seconds: 1), (t) async {
        if (!mounted) return t.cancel();
        setState(() => _countdown--);
        if (_countdown <= 0) {
          t.cancel();
          await context.read<AuthProvider>().logout();
          if (mounted) context.go('/auth/login');
        }
      });
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Đã xảy ra lỗi khi đổi mật khẩu.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mustChange = context.watch<AuthProvider>().passwordChangeRequired;
    return SubPageScaffold(
      title: 'Đổi mật khẩu',
      body: _success
          ? Padding(
              padding: const EdgeInsets.all(20),
              child: EmptyPanel(
                icon: Icons.check_circle_outline,
                title: 'Đổi mật khẩu thành công!',
                message: 'Bạn sẽ được chuyển đến trang đăng nhập sau $_countdown giây...',
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
              children: [
                if (mustChange) ...[
                  const NoticeBox('Tài khoản đang dùng mật khẩu tạm thời. Vui lòng đổi mật khẩu để tiếp tục.'),
                  const SizedBox(height: 16),
                ],
                const Text('Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
                const SizedBox(height: 20),
                const FieldLabel('Mật khẩu hiện tại', required: true),
                TextField(controller: _current, obscureText: !_show, decoration: InputDecoration(errorText: _errors['current'])),
                const SizedBox(height: 14),
                const FieldLabel('Mật khẩu mới', required: true),
                TextField(
                  controller: _new,
                  obscureText: !_show,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    errorText: _errors['new'],
                    suffixIcon: IconButton(
                      icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: AppColors.slate400),
                      onPressed: () => setState(() => _show = !_show),
                    ),
                  ),
                ),
                StrengthMeter(_new.text),
                const SizedBox(height: 14),
                const FieldLabel('Xác nhận mật khẩu mới', required: true),
                TextField(controller: _confirm, obscureText: !_show, decoration: InputDecoration(errorText: _errors['confirm'])),
                const SizedBox(height: 24),
                PillButton('Cập nhật mật khẩu', icon: Icons.lock_outline, expand: true, loading: _saving, onPressed: _saving ? null : _save),
              ],
            ),
    );
  }
}

// ─── My reviews ─────────────────────────────────────────────────────────────

class MyReviewsScreen extends StatefulWidget {
  const MyReviewsScreen({super.key});

  @override
  State<MyReviewsScreen> createState() => _MyReviewsScreenState();
}

class _MyReviewsScreenState extends State<MyReviewsScreen> {
  List<Map<String, dynamic>> _reviews = [];
  bool _loading = true;
  String? _error;
  String _filter = 'ALL';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _reviews = asList(await Api.instance.get('/api/account/reviews')).whereType<Map<String, dynamic>>().toList()
        ..sort((a, b) => '${b['createdAt']}'.compareTo('${a['createdAt']}'));
    } catch (e) {
      _error = e is ApiException && e.status == 0
          ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.'
          : 'Không thể tải danh sách đánh giá. Vui lòng thử lại.';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final list = _filter == 'ALL' ? _reviews : _reviews.where((r) => r['status'] == _filter).toList();
    final avg = _reviews.isEmpty ? 0 : _reviews.fold<num>(0, (s, r) => s + toNum(r['rating'])) / _reviews.length;
    return SubPageScaffold(
      title: 'Đánh giá của tôi',
      body: _loading
          ? const LoadingView()
          : _error != null
              ? Padding(padding: const EdgeInsets.all(16), child: _LoadError(_error!, _load))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                  children: [
                    if (_reviews.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(999), border: Border.all(color: AppColors.slate200)),
                        child: Text.rich(TextSpan(style: const TextStyle(fontSize: 12, color: AppColors.slate600), children: [
                          const TextSpan(text: 'Đã viết '),
                          TextSpan(text: '${_reviews.length}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate900)),
                          const TextSpan(text: ' đánh giá • Trung bình '),
                          TextSpan(text: '${avg.toStringAsFixed(1)} ★', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.amber600)),
                        ])),
                      ),
                      const SizedBox(height: 14),
                      FilterTabs(
                        tabs: const [('ALL', 'Tất cả'), ('APPROVED', 'Đã duyệt'), ('PENDING', 'Chờ duyệt'), ('REJECTED', 'Từ chối')],
                        value: _filter,
                        onChanged: (v) => setState(() => _filter = v),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (_reviews.isEmpty)
                      EmptyPanel(
                        icon: Icons.chat_bubble_outline,
                        title: 'Bạn chưa viết đánh giá nào',
                        message: 'Hãy chia sẻ cảm nhận về sản phẩm đã mua nhé!',
                        action: PillButton('Xem đơn hàng', onPressed: () => context.push('/account/orders')),
                      )
                    else if (list.isEmpty)
                      const EmptyPanel(icon: Icons.chat_bubble_outline, title: 'Không có đánh giá nào trong trạng thái này.')
                    else
                      for (final r in list) _tile(r),
                  ],
                ),
    );
  }

  Widget _tile(Map<String, dynamic> r) {
    final (label, bg, fg) = switch (r['status']) {
      'APPROVED' => ('ĐÃ DUYỆT', AppColors.emerald50, AppColors.emerald700),
      'PENDING' => ('CHỜ DUYỆT', AppColors.amber50, AppColors.amber700),
      'REJECTED' => ('TỪ CHỐI', AppColors.rose50, AppColors.rose700),
      _ => ('', Colors.white, Colors.white),
    };
    return AppCard(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        GestureDetector(
          onTap: () => context.push('/products/${r['productSlug']}'),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(width: 72, height: 72, child: NetImage(resolveImageUrl(r['productImageUrl']))),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => context.push('/products/${r['productSlug']}'),
                  child: Text('${r['productName'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              Text(formatDate(r['createdAt']), style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
            ]),
            const SizedBox(height: 4),
            Row(children: [
              if (label.isNotEmpty) ...[StatusPill(label, bg: bg, fg: fg, border: fg.withValues(alpha: 0.3), fontSize: 9.5), const SizedBox(width: 6)],
              for (var i = 0; i < 5; i++) Icon(Icons.star, size: 14, color: i < toNum(r['rating']) ? AppColors.amber400 : AppColors.slate200),
            ]),
            const SizedBox(height: 8),
            Text('${r['content'] ?? ''}', style: const TextStyle(fontSize: 13, color: AppColors.slate700, height: 1.5)),
            if (r['purchasedSize'] != null || r['purchasedColor'] != null) ...[
              const Divider(height: 18),
              Row(children: [
                if (r['purchasedSize'] != null) Text('Size: ${r['purchasedSize']}   ', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                if (r['purchasedColor'] != null) ...[
                  const Text('Màu: ', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                  ColorDot('${r['purchasedColor']}'),
                ],
              ]),
            ],
          ]),
        ),
      ]),
    );
  }
}
