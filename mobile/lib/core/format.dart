// Price & date formatting matching the storefront (vi-VN).

/// Rounds a VND amount to the nearest thousand (52794.36 -> 53000), like web `roundVnd`.
num roundVnd(num value) => (value / 1000).round() * 1000;

/// Thousands separated with dots: 1234567 -> "1.234.567".
String formatNumber(num value) {
  final n = value.round();
  final neg = n < 0;
  final digits = n.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write('.');
    buf.write(digits[i]);
  }
  return '${neg ? '-' : ''}$buf';
}

/// Web `formatVnd`: rounded to the thousand, e.g. "53.000" (caller appends ₫).
String formatVnd(num value) => formatNumber(roundVnd(value));

/// Exact amount with the đ suffix, as the order screens show it.
String vnd(num value) => '${formatNumber(value)}₫';

/// "1,2M₫" style used on the marketing dashboards.
String fmtMoneyShort(num v) => v >= 1000000 ? '${(v / 1000000).toStringAsFixed(1)}M₫' : '${formatNumber(v)}₫';

DateTime? parseDate(dynamic v) {
  if (v == null) return null;
  if (v is List && v.length >= 3) {
    // Jackson may serialise LocalDateTime as [y, m, d, h, mi, s]
    return DateTime(v[0], v[1], v[2], v.length > 3 ? v[3] : 0, v.length > 4 ? v[4] : 0, v.length > 5 ? v[5] : 0);
  }
  return DateTime.tryParse('$v')?.toLocal();
}

String _two(int n) => n.toString().padLeft(2, '0');

String formatDate(dynamic v) {
  final d = parseDate(v);
  if (d == null) return '';
  return '${_two(d.day)}/${_two(d.month)}/${d.year}';
}

String formatDateTime(dynamic v) {
  final d = parseDate(v);
  if (d == null) return '';
  return '${_two(d.hour)}:${_two(d.minute)} ${_two(d.day)}/${_two(d.month)}/${d.year}';
}

/// Local date-time without zone/millis, e.g. 2026-09-30T00:00:00 (what the analytics API accepts).
String isoLocal(DateTime d) =>
    '${d.year}-${_two(d.month)}-${_two(d.day)}T${_two(d.hour)}:${_two(d.minute)}:${_two(d.second)}';
