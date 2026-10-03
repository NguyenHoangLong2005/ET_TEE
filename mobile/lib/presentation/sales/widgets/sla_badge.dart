import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class SlaBadge extends StatelessWidget {
  const SlaBadge({
    super.key,
    required this.orderCode,
    required this.label,
    required this.isBreached,
  });

  final String orderCode;
  final String label;
  final bool isBreached;

  @override
  Widget build(BuildContext context) {
    final color = isBreached ? AppColors.statusCancelled : AppColors.statusSlaWarning;
    return Card(
      child: ListTile(
        leading: Icon(
          isBreached ? Icons.error_outline : Icons.schedule,
          color: color,
        ),
        title: Text(orderCode),
        subtitle: Text(label),
        trailing: Text(
          label,
          style: TextStyle(color: color, fontWeight: FontWeight.w600),
        ),
        onTap: () {},
      ),
    );
  }
}