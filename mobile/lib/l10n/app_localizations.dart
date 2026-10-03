import 'package:flutter/widgets.dart';

import 'l10n.dart';

/// Bản tạm cho app_localizations khi chưa chạy `flutter gen-l10n`.
/// Thay bằng file sinh tự động sau khi có arb/.
class AppLocalizations {
  const AppLocalizations(this.locale);

  final Locale locale;

  static const delegate = _AppLocalizationsDelegate();

  static AppLocalizations of(BuildContext context) =>
      Localizations.of<AppLocalizations>(context, AppLocalizations) ??
      const AppLocalizations(Locale('vi'));

  String get appTitle => 'ET Tee Staff';
  String get login => 'Đăng nhập';
  String get logout => 'Đăng xuất';
  String get retry => 'Thử lại';
  String get confirm => 'Xác nhận';
  String get cancel => 'Hủy';
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => const ['vi', 'en'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async =>
      AppLocalizations(locale);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}