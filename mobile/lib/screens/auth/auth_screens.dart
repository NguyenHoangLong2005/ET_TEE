import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../services/auth_service.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import '../../widgets/store_scaffold.dart';
import '../staff/marketing_shell.dart';

/// Where a signed-in user lands: marketing staff get their workspace, other staff roles
/// are web-only, customers go back to the shop.
String homeForRole(String role) => staffRoles.contains(role) ? workspaceFor(role).home : '/';

String passwordChangePath(String role) => staffRoles.contains(role) ? '/staff/change-password' : '/account/change-password';

class _AuthFrame extends StatelessWidget {
  final String title;
  final Widget? subtitle;
  final Widget child;
  const _AuthFrame({required this.title, this.subtitle, required this.child});

  @override
  Widget build(BuildContext context) => StoreScaffold(
        background: const Color(0x80F8FAFC),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 32, 16, 40),
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: AppCard(
                  padding: const EdgeInsets.fromLTRB(22, 28, 22, 28),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Text(title.toUpperCase(), textAlign: TextAlign.center, style: headline(26)),
                    if (subtitle != null) ...[const SizedBox(height: 8), Center(child: subtitle!)],
                    const SizedBox(height: 26),
                    child,
                  ]),
                ),
              ),
            ),
          ],
        ),
      );
}

Widget _link(String text, String linkText, VoidCallback onTap) => Wrap(alignment: WrapAlignment.center, children: [
      Text(text, style: const TextStyle(fontSize: 14, color: AppColors.slate600)),
      GestureDetector(onTap: onTap, child: Text(linkText, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary))),
    ]);

InputDecoration _input({String? hint, String? error, Widget? suffix, Widget? prefix}) => InputDecoration(
      hintText: hint,
      errorText: error == null || error.isEmpty ? null : error,
      suffixIcon: suffix,
      prefixIcon: prefix,
    );

// ─── Login ──────────────────────────────────────────────────────────────────

/// Port of web app/auth/login/page.tsx (digit captcha, remember me, role redirect).
class LoginScreen extends StatefulWidget {
  final String? redirect;
  const LoginScreen({super.key, this.redirect});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _captcha = TextEditingController();
  String _captchaCode = '';
  String? _emailErr, _passwordErr, _captchaErr;
  String _serverError = '';
  bool _loading = false, _needsVerification = false, _showPassword = false, _remember = true;

  @override
  void initState() {
    super.initState();
    _captchaCode = _generate();
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _captcha.dispose();
    super.dispose();
  }

  /// Digits only: Vietnamese IMEs (Telex/VNI) rewrite letters as they are typed.
  String _generate() {
    const chars = '23456789';
    final r = Random();
    return List.generate(6, (_) => chars[r.nextInt(chars.length)]).join();
  }

  void _refreshCaptcha() => setState(() {
        _captchaCode = _generate();
        _captcha.clear();
        _captchaErr = null;
      });

  String _vEmail(String v) {
    if (v.trim().isEmpty) return 'Vui lòng nhập email hoặc username.';
    if (v.contains('@') && !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v)) return 'Email không đúng định dạng.';
    return '';
  }

  String _vPassword(String v) {
    if (v.isEmpty) return 'Vui lòng nhập mật khẩu.';
    if (v.length < 6) return 'Mật khẩu phải từ 6 ký tự trở lên.';
    return '';
  }

  String _vCaptcha(String v) {
    if (v.trim().isEmpty) return 'Vui lòng nhập mã Captcha.';
    if (v.trim().toUpperCase() != _captchaCode) return 'Mã Captcha không chính xác.';
    return '';
  }

  Future<void> _submit() async {
    if (_loading) return;
    final e = _vEmail(_email.text), p = _vPassword(_password.text), c = _vCaptcha(_captcha.text);
    if (c == 'Mã Captcha không chính xác.') _refreshCaptcha();
    if (e.isNotEmpty || p.isNotEmpty || c.isNotEmpty) {
      setState(() {
        _emailErr = e;
        _passwordErr = p;
        _captchaErr = c;
      });
      return;
    }
    setState(() {
      _serverError = '';
      _needsVerification = false;
      _loading = true;
    });
    final auth = context.read<AuthProvider>();
    final router = GoRouter.of(context);
    try {
      final res = await AuthService.login(_email.text.trim(), _password.text);
      final user = await auth.login('${res['token']}', remember: _remember);
      final warnings = (res['cartWarnings'] is List) ? (res['cartWarnings'] as List) : const [];
      if (warnings.isNotEmpty) {
        Toast.info(warnings.length == 1
            ? 'Đã gộp giỏ hàng tạm vào tài khoản. Lưu ý: ${warnings.first}'
            : 'Đã gộp giỏ hàng tạm vào tài khoản với ${warnings.length} lưu ý.');
      }
      // Temporary (admin-issued) password: the server refuses everything else until it is changed.
      if (res['mustChangePassword'] == true) {
        Toast.info('Vui lòng đổi mật khẩu tạm thời trước khi sử dụng hệ thống.');
        router.go(passwordChangePath(user.role));
        return;
      }
      final redirect = widget.redirect;
      if (!user.isStaff && redirect != null && redirect.startsWith('/') && !redirect.startsWith('//')) {
        router.go(redirect);
      } else {
        router.go(homeForRole(user.role));
      }
    } on ApiException catch (err) {
      _refreshCaptcha();
      setState(() {
        if (err.message == 'UNVERIFIED') {
          _serverError = 'Tài khoản của bạn chưa được xác thực email.';
          _needsVerification = true;
        } else {
          _serverError = err.message;
        }
      });
    } catch (_) {
      _refreshCaptcha();
      setState(() => _serverError = 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AuthFrame(
      title: 'Đăng nhập',
      subtitle: _link('Chưa có tài khoản? ', 'Tạo tài khoản mới', () => context.push('/auth/register')),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (_serverError.isNotEmpty) ...[
          NoticeBox(_serverError),
          if (_needsVerification)
            TextButton(
              onPressed: () => context.push('/auth/verify-email?email=${Uri.encodeComponent(_email.text.trim())}'),
              child: const Text('Xác thực email ngay', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary)),
            ),
          const SizedBox(height: 16),
        ],
        const FieldLabel('Email hoặc username'),
        TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.username],
          decoration: _input(hint: 'email@example.com', error: _emailErr),
          onChanged: (_) => _emailErr != null ? setState(() => _emailErr = _vEmail(_email.text)) : null,
        ),
        const SizedBox(height: 16),
        FieldLabel('Mật khẩu',
            trailing: GestureDetector(
              onTap: () => context.push('/auth/forgot-password'),
              child: const Text('Quên mật khẩu?', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
            )),
        TextField(
          controller: _password,
          obscureText: !_showPassword,
          autofillHints: const [AutofillHints.password],
          decoration: _input(
            hint: '••••••••',
            error: _passwordErr,
            suffix: IconButton(
              icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: AppColors.slate400),
              onPressed: () => setState(() => _showPassword = !_showPassword),
            ),
          ),
          onChanged: (_) => _passwordErr != null ? setState(() => _passwordErr = _vPassword(_password.text)) : null,
        ),
        const SizedBox(height: 16),
        const FieldLabel('Mã xác nhận'),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: TextField(
              controller: _captcha,
              keyboardType: TextInputType.number,
              decoration: _input(hint: '6 số', error: _captchaErr),
              onSubmitted: (_) => _submit(),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.slate100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.slate200),
            ),
            child: Text(_captchaCode,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 2, color: AppColors.slate700, fontStyle: FontStyle.italic)),
          ),
          IconButton(onPressed: _refreshCaptcha, icon: const Icon(Icons.refresh, color: AppColors.slate500), tooltip: 'Đổi mã'),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          SizedBox(width: 32, child: Checkbox(value: _remember, onChanged: (v) => setState(() => _remember = v ?? true))),
          const Text('Ghi nhớ đăng nhập', style: TextStyle(fontSize: 14, color: AppColors.slate700)),
        ]),
        const SizedBox(height: 16),
        PillButton(_loading ? 'Đang đăng nhập...' : 'Đăng nhập', expand: true, height: 52, loading: _loading, onPressed: _submit),
      ]),
    );
  }
}

// ─── Register ───────────────────────────────────────────────────────────────

const _commonPasswords = {
  '123456', '12345678', '123456789', 'password', 'password123', '12345', '1234567', '111111', '123123', 'qwerty', 'admin', 'admin123', 'Password123',
};

/// '' | weak | medium | strong
String passwordStrength(String p) {
  if (p.isEmpty) return '';
  if (_commonPasswords.contains(p) || _commonPasswords.contains(p.toLowerCase())) return 'weak';
  var score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (RegExp(r'[A-Z]').hasMatch(p)) score++;
  if (RegExp(r'[0-9]').hasMatch(p)) score++;
  if (RegExp(r'[^A-Za-z0-9]').hasMatch(p)) score++;
  if (score <= 1) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

class StrengthMeter extends StatelessWidget {
  final String password;
  const StrengthMeter(this.password, {super.key});

  @override
  Widget build(BuildContext context) {
    final s = passwordStrength(password);
    if (s.isEmpty) return const SizedBox.shrink();
    final (label, color, bars) = switch (s) {
      'weak' => ('Yếu', const Color(0xFFFB7185), 1),
      'medium' => ('Trung bình', AppColors.amber400, 2),
      _ => ('Mạnh', const Color(0xFF10B981), 3),
    };
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(children: [
        for (var i = 0; i < 3; i++)
          Expanded(
            child: Container(
              height: 5,
              margin: const EdgeInsets.only(right: 4),
              decoration: BoxDecoration(color: i < bars ? color : AppColors.slate200, borderRadius: BorderRadius.circular(3)),
            ),
          ),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
      ]),
    );
  }
}

/// Port of web app/auth/register/page.tsx.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _c = {
    for (final k in ['fullName', 'email', 'phone', 'address', 'password', 'confirmPassword']) k: TextEditingController(),
  };
  final _errors = <String, String>{};
  String _serverError = '';
  bool _loading = false, _marketingOptIn = false, _showPw = false, _showConfirm = false;
  Timer? _emailDebounce;
  static const _emailTaken = 'Email đã được sử dụng.';

  @override
  void dispose() {
    _emailDebounce?.cancel();
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  String _validate(String field) {
    final v = _c[field]!.text;
    switch (field) {
      case 'fullName':
        return v.trim().isEmpty ? 'Vui lòng nhập họ và tên.' : v.trim().length < 2 ? 'Họ tên quá ngắn.' : '';
      case 'email':
        if (v.isEmpty) return 'Vui lòng nhập email.';
        if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v)) return 'Email không đúng định dạng.';
        return _errors['email'] == _emailTaken ? _emailTaken : '';
      case 'phone':
        if (v.isEmpty) return 'Vui lòng nhập số điện thoại.';
        return RegExp(r'^(0[3-9][0-9]{8}|\+84[3-9][0-9]{8})$').hasMatch(v.replaceAll(' ', '')) ? '' : 'Số điện thoại không hợp lệ (VD: 0901234567).';
      case 'address':
        return v.trim().isEmpty ? 'Vui lòng nhập địa chỉ giao hàng.' : '';
      case 'password':
        if (v.isEmpty) return 'Vui lòng nhập mật khẩu.';
        if (v.length < 8) return 'Mật khẩu phải từ 8 ký tự trở lên.';
        if (!RegExp(r'[a-zA-Z]').hasMatch(v) || !RegExp(r'[0-9]').hasMatch(v)) return 'Mật khẩu phải có cả chữ và số.';
        if (_commonPasswords.contains(v) || _commonPasswords.contains(v.toLowerCase())) return 'Mật khẩu quá phổ biến, dễ bị đoán.';
        return '';
      case 'confirmPassword':
        if (v.isEmpty) return 'Vui lòng nhập lại mật khẩu.';
        return v != _c['password']!.text ? 'Mật khẩu nhập lại không khớp.' : '';
    }
    return '';
  }

  void _onEmailChanged(String v) {
    _emailDebounce?.cancel();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v)) return;
    _emailDebounce = Timer(const Duration(milliseconds: 500), () async {
      final ok = await AuthService.checkEmailAvailable(v);
      if (!mounted) return;
      setState(() {
        if (!ok) {
          _errors['email'] = _emailTaken;
        } else if (_errors['email'] == _emailTaken) {
          _errors.remove('email');
        }
      });
    });
  }

  Future<void> _submit() async {
    final errs = {for (final k in _c.keys) k: _validate(k)}..removeWhere((_, v) => v.isEmpty);
    if (errs.isNotEmpty) {
      setState(() => _errors
        ..clear()
        ..addAll(errs));
      return;
    }
    setState(() {
      _serverError = '';
      _loading = true;
    });
    try {
      await AuthService.register({
        'fullName': _c['fullName']!.text,
        'email': _c['email']!.text,
        'phone': _c['phone']!.text,
        'address': _c['address']!.text,
        'password': _c['password']!.text,
        'marketingOptIn': _marketingOptIn,
      });
      if (mounted) context.go('/auth/verify-email?email=${Uri.encodeComponent(_c['email']!.text)}');
    } catch (e) {
      setState(() => _serverError = e is ApiException ? e.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _field(String key, String label, {String? hint, TextInputType? keyboard, bool obscure = false, Widget? suffix, ValueChanged<String>? onChanged, int lines = 1}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.slate700)),
          const SizedBox(height: 6),
          Focus(
            onFocusChange: (f) {
              if (!f) setState(() => _errors[key] = _validate(key));
            },
            child: TextField(
              controller: _c[key],
              keyboardType: keyboard,
              obscureText: obscure,
              maxLines: obscure ? 1 : lines,
              decoration: _input(hint: hint, error: _errors[key], suffix: suffix),
              onChanged: (v) {
                onChanged?.call(v);
                if (key == 'confirmPassword' || (key == 'password' && _c['confirmPassword']!.text.isNotEmpty)) {
                  setState(() => _errors['confirmPassword'] = _validate('confirmPassword'));
                } else if (key == 'password') {
                  setState(() {});
                }
              },
            ),
          ),
          if (key == 'password') StrengthMeter(_c['password']!.text),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    return _AuthFrame(
      title: 'Tạo tài khoản',
      subtitle: _link('Đã có tài khoản? ', 'Đăng nhập', () => context.push('/auth/login')),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (_serverError.isNotEmpty) ...[NoticeBox(_serverError), const SizedBox(height: 16)],
        _field('fullName', 'Họ và tên', hint: 'Nguyễn Văn A'),
        _field('email', 'Email', hint: 'email@example.com', keyboard: TextInputType.emailAddress, onChanged: _onEmailChanged),
        _field('phone', 'Số điện thoại', hint: '0901234567', keyboard: TextInputType.phone),
        _field('address', 'Địa chỉ giao hàng', hint: 'Số nhà, đường, quận/huyện, tỉnh/thành', lines: 2),
        _field('password', 'Mật khẩu',
            hint: 'Tối thiểu 8 ký tự, có chữ và số',
            obscure: !_showPw,
            suffix: IconButton(
                icon: Icon(_showPw ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: AppColors.slate400),
                onPressed: () => setState(() => _showPw = !_showPw))),
        _field('confirmPassword', 'Nhập lại mật khẩu',
            obscure: !_showConfirm,
            suffix: IconButton(
                icon: Icon(_showConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: AppColors.slate400),
                onPressed: () => setState(() => _showConfirm = !_showConfirm))),
        // Marketing email consent: unticked by default, never required to register
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 32, child: Checkbox(value: _marketingOptIn, onChanged: (v) => setState(() => _marketingOptIn = v ?? false))),
          const Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text('Tôi muốn nhận email về ưu đãi và bộ sưu tập mới (có thể hủy bất cứ lúc nào).',
                  style: TextStyle(fontSize: 13, color: AppColors.slate600, height: 1.4)),
            ),
          ),
        ]),
        const SizedBox(height: 20),
        PillButton(_loading ? 'Đang tạo tài khoản...' : 'Đăng ký', expand: true, height: 52, loading: _loading, onPressed: _submit),
      ]),
    );
  }
}

// ─── Verify email ───────────────────────────────────────────────────────────

class VerifyEmailScreen extends StatefulWidget {
  final String email;
  const VerifyEmailScreen({super.key, required this.email});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _code = TextEditingController();
  String _error = '', _success = '';
  bool _loading = false;
  int _countdown = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  void _startCountdown([int from = 60]) {
    _timer?.cancel();
    _countdown = from;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown <= 0) return t.cancel();
      setState(() => _countdown--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      final body = await AuthService.verifyEmail(widget.email, _code.text.trim());
      final warnings = body['cartWarnings'] is List ? (body['cartWarnings'] as List) : const [];
      setState(() => _success = 'Xác thực thành công! Đang chuyển hướng...${warnings.isNotEmpty ? ' Lưu ý giỏ hàng: ${warnings.length} mục đã được điều chỉnh.' : ''}');
      Future.delayed(const Duration(milliseconds: 2500), () {
        if (mounted) context.go('/auth/login');
      });
    } catch (e) {
      final msg = '$e';
      setState(() {
        _error = msg;
        if (msg.toLowerCase().contains('hết hạn')) {
          _timer?.cancel();
          _countdown = 0;
        }
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    if (_countdown > 0) return;
    setState(() {
      _error = '';
      _success = '';
      _loading = true;
    });
    try {
      await AuthService.resendCode(widget.email);
      setState(() => _success = 'Mã mới đã được gửi tới email của bạn.');
      _startCountdown();
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AuthFrame(
      title: 'Xác thực email',
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text.rich(
          TextSpan(style: const TextStyle(fontSize: 14, color: AppColors.slate600, height: 1.5), children: [
            const TextSpan(text: 'Mã xác thực 6 số đã được gửi tới email '),
            TextSpan(text: widget.email, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate900)),
          ]),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),
        if (_error.isNotEmpty) ...[NoticeBox(_error), const SizedBox(height: 12)],
        if (_success.isNotEmpty) ...[NoticeBox(_success, success: true), const SizedBox(height: 12)],
        TextField(
          controller: _code,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 10),
          decoration: const InputDecoration(counterText: '', hintText: '000000'),
          onSubmitted: (_) => _verify(),
        ),
        const SizedBox(height: 18),
        PillButton(_loading ? 'Đang xác thực...' : 'Xác thực', expand: true, height: 50, loading: _loading, onPressed: _verify),
        const SizedBox(height: 16),
        Center(
          child: _countdown > 0
              ? Text('Gửi lại mã sau ${_countdown}s', style: const TextStyle(fontSize: 13, color: AppColors.slate500))
              : GestureDetector(
                  onTap: _resend,
                  child: const Text('Gửi lại mã xác thực', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ),
        ),
      ]),
    );
  }
}

// ─── Forgot / reset password ────────────────────────────────────────────────

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  String _error = '';
  bool _loading = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    if (email.isEmpty) {
      setState(() => _error = 'Vui lòng nhập email.');
      return;
    }
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      await AuthService.forgotPassword(email);
      if (mounted) context.go('/auth/reset-password?email=${Uri.encodeComponent(email)}');
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => _AuthFrame(
        title: 'Quên mật khẩu',
        subtitle: const Text('Nhập email tài khoản, chúng tôi sẽ gửi mã khôi phục.',
            textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: AppColors.slate600)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (_error.isNotEmpty) ...[NoticeBox(_error), const SizedBox(height: 14)],
          const FieldLabel('Email'),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: _input(hint: 'email@example.com'), onSubmitted: (_) => _submit()),
          const SizedBox(height: 20),
          PillButton(_loading ? 'Đang gửi...' : 'Gửi mã khôi phục', expand: true, height: 50, loading: _loading, onPressed: _submit),
          const SizedBox(height: 16),
          _link('Nhớ mật khẩu? ', 'Đăng nhập', () => context.go('/auth/login')),
        ]),
      );
}

class ResetPasswordScreen extends StatefulWidget {
  final String email;
  const ResetPasswordScreen({super.key, required this.email});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _otp = TextEditingController();
  final _pw = TextEditingController();
  final _confirm = TextEditingController();
  String _error = '', _success = '';
  bool _loading = false, _resending = false, _show = false;
  int _cooldown = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.email.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => context.go('/auth/forgot-password'));
    }
    _start();
  }

  void _start() {
    _timer?.cancel();
    _cooldown = 60;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_cooldown <= 0) return t.cancel();
      setState(() => _cooldown--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otp.dispose();
    _pw.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = '';
      _success = '';
    });
    if (_otp.text.trim().isEmpty) return setState(() => _error = 'Vui lòng nhập mã khôi phục');
    if (_pw.text != _confirm.text) return setState(() => _error = 'Mật khẩu nhập lại không khớp');
    if (_pw.text.length < 8 || !RegExp(r'[a-zA-Z]').hasMatch(_pw.text) || !RegExp(r'[0-9]').hasMatch(_pw.text)) {
      return setState(() => _error = 'Mật khẩu phải từ 8 ký tự, gồm cả chữ và số');
    }
    setState(() => _loading = true);
    try {
      await AuthService.resetPassword(widget.email, _otp.text.trim(), _pw.text);
      setState(() => _success = 'Đổi mật khẩu thành công. Đang chuyển hướng...');
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) context.go('/auth/login');
      });
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    if (_cooldown > 0) return;
    setState(() {
      _resending = true;
      _error = '';
      _success = '';
    });
    try {
      await AuthService.resendPasswordResetCode(widget.email);
      setState(() => _success = 'Mã khôi phục mới đã được gửi');
      _start();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Lỗi gửi lại mã khôi phục');
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) => _AuthFrame(
        title: 'Đặt lại mật khẩu',
        subtitle: Text('Mã khôi phục đã được gửi tới ${widget.email}',
            textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: AppColors.slate600)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (_error.isNotEmpty) ...[NoticeBox(_error), const SizedBox(height: 12)],
          if (_success.isNotEmpty) ...[NoticeBox(_success, success: true), const SizedBox(height: 12)],
          const FieldLabel('Mã khôi phục (OTP)'),
          TextField(controller: _otp, keyboardType: TextInputType.number, decoration: _input(hint: '6 chữ số')),
          const SizedBox(height: 14),
          const FieldLabel('Mật khẩu mới'),
          TextField(
            controller: _pw,
            obscureText: !_show,
            onChanged: (_) => setState(() {}),
            decoration: _input(
              suffix: IconButton(
                  icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: AppColors.slate400),
                  onPressed: () => setState(() => _show = !_show)),
            ),
          ),
          StrengthMeter(_pw.text),
          const SizedBox(height: 14),
          const FieldLabel('Nhập lại mật khẩu mới'),
          TextField(controller: _confirm, obscureText: !_show, decoration: _input()),
          const SizedBox(height: 20),
          PillButton(_loading ? 'Đang xử lý...' : 'Đổi mật khẩu', expand: true, height: 50, loading: _loading, onPressed: _submit),
          const SizedBox(height: 14),
          Center(
            child: _cooldown > 0
                ? Text('Gửi lại mã sau ${_cooldown}s', style: const TextStyle(fontSize: 13, color: AppColors.slate500))
                : GestureDetector(
                    onTap: _resending ? null : _resend,
                    child: Text(_resending ? 'Đang gửi...' : 'Gửi lại mã khôi phục',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
                  ),
          ),
        ]),
      );
}
