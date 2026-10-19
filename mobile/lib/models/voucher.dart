import '../core/api.dart';
import '../core/format.dart';

/// Customer-side voucher option (backend CustomerMarketingController /api/public/vouchers/for-me).
class VoucherOption {
  final String code;
  final String name;
  final String? description;
  final String type;
  final num discountValue;
  final num? minOrderAmount;
  final num? maxDiscountAmount;
  final bool freeShipping;
  final String? endDate;
  final bool personal;
  final bool usable;
  final num discountAmount;
  final String? reason;

  VoucherOption({
    required this.code,
    required this.name,
    this.description,
    required this.type,
    required this.discountValue,
    this.minOrderAmount,
    this.maxDiscountAmount,
    this.freeShipping = false,
    this.endDate,
    this.personal = false,
    this.usable = false,
    this.discountAmount = 0,
    this.reason,
  });

  factory VoucherOption.fromJson(Map<String, dynamic> j) => VoucherOption(
        code: '${j['code'] ?? ''}',
        name: '${j['name'] ?? ''}',
        description: j['description'] as String?,
        type: '${j['type'] ?? ''}',
        discountValue: toNum(j['discountValue']),
        minOrderAmount: j['minOrderAmount'] == null ? null : toNum(j['minOrderAmount']),
        maxDiscountAmount: j['maxDiscountAmount'] == null ? null : toNum(j['maxDiscountAmount']),
        freeShipping: j['freeShipping'] == true,
        endDate: j['endDate'] == null ? null : '${j['endDate']}',
        personal: j['personal'] == true,
        usable: j['usable'] == true,
        discountAmount: toNum(j['discountAmount']),
        reason: j['reason'] as String?,
      );

  String get headline {
    final what = type == 'PERCENT'
        ? 'Giảm ${discountValue.toString().replaceAll(RegExp(r'\.0$'), '')}%'
        : type == 'FREE_SHIPPING'
            ? 'Miễn phí vận chuyển'
            : 'Giảm ${vnd(discountValue)}';
    final cap = type == 'PERCENT' && (maxDiscountAmount ?? 0) > 0 ? ' (tối đa ${vnd(maxDiscountAmount!)})' : '';
    return what + cap;
  }

  String get conditions {
    final parts = <String>[];
    if ((minOrderAmount ?? 0) > 0) parts.add('Đơn từ ${vnd(minOrderAmount!)}');
    if (endDate != null) parts.add('HSD ${formatDate(endDate)}');
    return parts.join(' · ');
  }
}
