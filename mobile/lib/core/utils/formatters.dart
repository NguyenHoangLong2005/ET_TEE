import 'package:intl/intl.dart';

final _currency = NumberFormat.currency(
  locale: 'vi_VN',
  symbol: '₫',
  decimalDigits: 0,
);

final _dateTime = DateFormat('dd/MM/yyyy HH:mm');
final _date = DateFormat('dd/MM/yyyy');

class Formatters {
  Formatters._();

  static String currency(num? value) => _currency.format(value ?? 0);

  static String dateTime(DateTime? value) =>
      value == null ? '—' : _dateTime.format(value);

  static String date(DateTime? value) => value == null ? '—' : _date.format(value);

  static String duration(Duration? value) {
    if (value == null) return '—';
    final abs = value.abs();
    final h = abs.inHours;
    final m = abs.inMinutes % 60;
    if (h == 0) return '${m}p';
    return '${h}h ${m}p';
  }
}