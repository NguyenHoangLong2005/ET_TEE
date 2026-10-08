import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF087EA4);
  static const Color secondary = Color(0xFF16A6C2);

  static const Color surfaceLight = Color(0xFFF3F7FA);
  static const Color surfaceDark = Color(0xFF111A20);

  static const Color statusNew = Color(0xFF2F6FED);
  static const Color statusPicking = Color(0xFFF59E0B);
  static const Color statusPacked = Color(0xFF7C3AED);
  static const Color statusShipped = Color(0xFF0891B2);
  static const Color statusDelivered = Color(0xFF16A34A);
  static const Color statusCancelled = Color(0xFFDC2626);
  static const Color statusSlaWarning = Color(0xFFEA580C);
}

class AppSpacing {
  AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
}

class AppRadius {
  AppRadius._();

  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
}
