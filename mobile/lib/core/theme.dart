import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tokens from web/src/app/globals.css (ET.TEE design system) plus the Tailwind slate/emerald
/// shades the storefront uses.
class AppColors {
  static const primary = Color(0xFFE50027);
  static const primary50 = Color(0xFFFFF0F2);
  static const primary100 = Color(0xFFF9E2E5);
  static const primary200 = Color(0xFFF4C0C8);
  static const primary700 = Color(0xFFBD001F);
  static const primary900 = Color(0xFF6E0013);

  static const slate50 = Color(0xFFF8FAFC);
  static const slate100 = Color(0xFFF1F5F9);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate300 = Color(0xFFCBD5E1);
  static const slate400 = Color(0xFF94A3B8);
  static const slate500 = Color(0xFF64748B);
  static const slate600 = Color(0xFF475569);
  static const slate700 = Color(0xFF334155);
  static const slate800 = Color(0xFF1E293B);
  static const slate900 = Color(0xFF0F172A);
  static const black = Color(0xFF000000);

  static const emerald50 = Color(0xFFECFDF5);
  static const emerald100 = Color(0xFFD1FAE5);
  static const emerald200 = Color(0xFFA7F3D0);
  static const emerald600 = Color(0xFF059669);
  static const emerald700 = Color(0xFF047857);
  static const emerald800 = Color(0xFF065F46);

  static const amber50 = Color(0xFFFFFBEB);
  static const amber100 = Color(0xFFFEF3C7);
  static const amber200 = Color(0xFFFDE68A);
  static const amber300 = Color(0xFFFCD34D);
  static const amber400 = Color(0xFFFBBF24);
  static const amber500 = Color(0xFFF59E0B);
  static const amber600 = Color(0xFFD97706);
  static const amber700 = Color(0xFFB45309);
  static const amber800 = Color(0xFF92400E);

  static const rose50 = Color(0xFFFFF1F2);
  static const rose200 = Color(0xFFFECDD3);
  static const rose500 = Color(0xFFF43F5E);
  static const rose700 = Color(0xFFBE123C);
  static const red50 = Color(0xFFFEF2F2);
  static const red100 = Color(0xFFFEE2E2);
  static const red600 = Color(0xFFDC2626);
  static const red700 = Color(0xFFB91C1C);

  static const sky50 = Color(0xFFF0F9FF);
  static const sky700 = Color(0xFF0369A1);
  static const blue50 = Color(0xFFEFF6FF);
  static const blue600 = Color(0xFF2563EB);
  static const blue700 = Color(0xFF1D4ED8);
  static const indigo50 = Color(0xFFEEF2FF);
  static const indigo700 = Color(0xFF4338CA);
  static const purple50 = Color(0xFFFAF5FF);
  static const purple700 = Color(0xFF7E22CE);
  static const violet50 = Color(0xFFF5F3FF);
  static const violet700 = Color(0xFF6D28D9);
  static const orange50 = Color(0xFFFFF7ED);
  static const orange200 = Color(0xFFFED7AA);
  static const orange700 = Color(0xFFC2410C);

  static const surfacePage = slate50;
  static const border = slate200;
}

class AppTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        surface: Colors.white,
      ),
      scaffoldBackgroundColor: Colors.white,
    );
    final text = GoogleFonts.beVietnamProTextTheme(base.textTheme).apply(
      bodyColor: AppColors.slate900,
      displayColor: AppColors.slate900,
    );
    return base.copyWith(
      textTheme: text,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.slate900,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        surfaceTintColor: Colors.transparent,
      ),
      dividerTheme: const DividerThemeData(color: AppColors.slate100, thickness: 1, space: 1),
      inputDecorationTheme: InputDecorationTheme(
        isDense: true,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        hintStyle: const TextStyle(color: AppColors.slate400, fontSize: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
        errorStyle: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w500),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.slate900 : null),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.primary : AppColors.slate400),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppColors.slate900),
      bottomSheetTheme: const BottomSheetThemeData(backgroundColor: Colors.white, surfaceTintColor: Colors.transparent),
      dialogTheme: const DialogThemeData(backgroundColor: Colors.white, surfaceTintColor: Colors.transparent),
      popupMenuTheme: const PopupMenuThemeData(color: Colors.white, surfaceTintColor: Colors.transparent),
    );
  }
}

/// Uppercase, heavy, tight-tracked headline used across the storefront ("font-black uppercase tracking-tight").
TextStyle headline(double size, {Color color = AppColors.slate900, FontWeight weight = FontWeight.w900}) =>
    TextStyle(fontSize: size, fontWeight: weight, color: color, letterSpacing: -0.4, height: 1.15);

/// Small uppercase label ("text-xs font-bold uppercase tracking-wider").
TextStyle labelCaps({double size = 11, Color color = AppColors.slate700, FontWeight weight = FontWeight.w700}) =>
    TextStyle(fontSize: size, fontWeight: weight, color: color, letterSpacing: 0.8);
