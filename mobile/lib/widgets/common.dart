import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Network image with the storefront's grey placeholder; `<img>` element on web so images from
/// the Next.js origin load without CORS headers.
class NetImage extends StatelessWidget {
  final String? url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Widget? fallback;
  const NetImage(this.url, {super.key, this.fit = BoxFit.cover, this.width, this.height, this.fallback});

  @override
  Widget build(BuildContext context) {
    final fb = fallback ??
        Container(
          width: width,
          height: height,
          color: AppColors.slate100,
          alignment: Alignment.center,
          child: const Icon(Icons.image_outlined, color: AppColors.slate300),
        );
    if (url == null || url!.isEmpty) return fb;
    return Image.network(
      url!,
      fit: fit,
      width: width,
      height: height,
      webHtmlElementStrategy: WebHtmlElementStrategy.prefer,
      errorBuilder: (_, _, _) => fb,
      loadingBuilder: (c, child, p) => p == null ? child : Container(width: width, height: height, color: AppColors.slate50),
    );
  }
}

enum PillStyle { primary, dark, light, outline, danger }

/// Rounded-full, uppercase, black-weight button used throughout the storefront.
class PillButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final PillStyle style;
  final IconData? icon;
  final IconData? trailingIcon;
  final bool loading;
  final double height;
  final bool expand;
  final double fontSize;
  final BorderRadius? radius;

  const PillButton(
    this.label, {
    super.key,
    this.onPressed,
    this.style = PillStyle.primary,
    this.icon,
    this.trailingIcon,
    this.loading = false,
    this.height = 48,
    this.expand = false,
    this.fontSize = 12,
    this.radius,
  });

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = switch (style) {
      PillStyle.primary => (AppColors.primary, Colors.white, AppColors.primary),
      PillStyle.dark => (AppColors.slate900, Colors.white, AppColors.slate900),
      PillStyle.light => (AppColors.slate100, AppColors.slate900, AppColors.slate100),
      PillStyle.outline => (Colors.white, AppColors.slate900, AppColors.slate300),
      PillStyle.danger => (AppColors.rose50, AppColors.rose700, AppColors.rose200),
    };
    final disabled = onPressed == null || loading;
    final child = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading)
          SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: fg))
        else if (icon != null)
          Icon(icon, size: 16, color: fg),
        if (loading || icon != null) const SizedBox(width: 8),
        // Shrinks instead of truncating on narrow phones ("THÊM VÀO GIỎ" next to the stepper).
        Flexible(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label.toUpperCase(),
              maxLines: 1,
              style: TextStyle(color: fg, fontWeight: FontWeight.w900, fontSize: fontSize, letterSpacing: 1.2),
            ),
          ),
        ),
        if (trailingIcon != null) ...[const SizedBox(width: 8), Icon(trailingIcon, size: 16, color: fg)],
      ],
    );
    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: SizedBox(
        height: height,
        width: expand ? double.infinity : null,
        child: Material(
          color: bg,
          shape: RoundedRectangleBorder(
            borderRadius: radius ?? BorderRadius.circular(999),
            side: BorderSide(color: border),
          ),
          child: InkWell(
            borderRadius: radius ?? BorderRadius.circular(999),
            onTap: disabled ? null : onPressed,
            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: child),
          ),
        ),
      ),
    );
  }
}

/// White rounded-3xl card with the slate-200/80 border and soft shadow.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final double radius;
  final EdgeInsetsGeometry? margin;
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.color = Colors.white,
    this.borderColor = const Color(0xCCE2E8F0),
    this.radius = 24,
    this.margin,
  });

  @override
  Widget build(BuildContext context) => Container(
        margin: margin,
        padding: padding,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: borderColor),
          boxShadow: const [BoxShadow(color: Color(0x0D0F172A), blurRadius: 3, offset: Offset(0, 1))],
        ),
        child: child,
      );
}

/// Title like "ƯU ĐÃI ĐẶC BIỆT" with subtitle and optional trailing link.
class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget? badge;
  const SectionHeader({super.key, required this.title, this.subtitle, this.actionLabel, this.onAction, this.badge});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.only(bottom: 12),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate200))),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [Text(title.toUpperCase(), style: headline(20)), ?badge],
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(subtitle!, style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w500)),
                  ],
                ],
              ),
            ),
            if (actionLabel != null)
              GestureDetector(
                onTap: onAction,
                child: Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Text(actionLabel!.toUpperCase(), style: labelCaps(size: 11, color: AppColors.slate600)),
                ),
              ),
          ],
        ),
      );
}

/// Dashed empty-state panel ("Chưa có sản phẩm nào" ...).
class EmptyPanel extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;
  const EmptyPanel({super.key, required this.icon, required this.title, this.message, this.action});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        decoration: BoxDecoration(
          color: const Color(0x99F8FAFC),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.slate200),
        ),
        child: Column(
          children: [
            Icon(icon, size: 56, color: AppColors.slate300),
            const SizedBox(height: 14),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            if (message != null) ...[
              const SizedBox(height: 8),
              Text(message!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: AppColors.slate500, height: 1.5)),
            ],
            if (action != null) ...[const SizedBox(height: 20), action!],
          ],
        ),
      );
}

/// Rounded status pill ("Đã giao", "Chờ xác nhận" ...).
class StatusPill extends StatelessWidget {
  final String label;
  final Color bg;
  final Color fg;
  final Color? border;
  final IconData? icon;
  final double fontSize;
  const StatusPill(this.label, {super.key, required this.bg, required this.fg, this.border, this.icon, this.fontSize = 11});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: border ?? bg),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 13, color: fg), const SizedBox(width: 4)],
            Text(label, style: TextStyle(color: fg, fontSize: fontSize, fontWeight: FontWeight.w700)),
          ],
        ),
      );
}

/// Label above an input ("HỌ TÊN *").
class FieldLabel extends StatelessWidget {
  final String text;
  final bool required;
  final Widget? trailing;
  const FieldLabel(this.text, {super.key, this.required = false, this.trailing});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(
          children: [
            Expanded(
              child: Text.rich(TextSpan(children: [
                TextSpan(text: text.toUpperCase(), style: labelCaps()),
                if (required) const TextSpan(text: ' *', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
              ])),
            ),
            ?trailing,
          ],
        ),
      );
}

/// Inline error/info banner.
class NoticeBox extends StatelessWidget {
  final String text;
  final bool success;
  const NoticeBox(this.text, {super.key, this.success = false});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: success ? AppColors.emerald50 : AppColors.rose50,
          border: Border.all(color: success ? AppColors.emerald200 : AppColors.rose200),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(text,
            textAlign: TextAlign.center,
            style: TextStyle(color: success ? AppColors.emerald700 : AppColors.rose700, fontSize: 13, fontWeight: FontWeight.w500)),
      );
}

/// Centered spinner used while a screen loads.
class LoadingView extends StatelessWidget {
  final String? message;
  const LoadingView({super.key, this.message});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(width: 32, height: 32, child: CircularProgressIndicator(strokeWidth: 2.5)),
              if (message != null) ...[
                const SizedBox(height: 14),
                Text(message!, style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
              ],
            ],
          ),
        ),
      );
}

/// Swatch circle for a variant colour.
class ColorDot extends StatelessWidget {
  final String? hex;
  final double size;
  const ColorDot(this.hex, {super.key, this.size = 12});

  @override
  Widget build(BuildContext context) {
    final c = _parse(hex);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: c ?? AppColors.slate200,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.slate300),
      ),
    );
  }

  static Color? _parse(String? hex) {
    if (hex == null) return null;
    var h = hex.replaceAll('#', '').trim();
    if (h.length == 3) h = h.split('').map((c) => '$c$c').join();
    if (h.length != 6) return null;
    final v = int.tryParse(h, radix: 16);
    return v == null ? null : Color(0xFF000000 | v);
  }
}

/// Horizontal filter chips ("Tất cả", "Chờ xử lý" ...).
class FilterTabs extends StatelessWidget {
  final List<(String, String)> tabs;
  final String value;
  final ValueChanged<String> onChanged;
  final Color activeColor;
  const FilterTabs({super.key, required this.tabs, required this.value, required this.onChanged, this.activeColor = AppColors.primary});

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final (id, label) in tabs)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () => onChanged(id),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                    decoration: BoxDecoration(
                      color: value == id ? activeColor : AppColors.slate100,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(label,
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w700, color: value == id ? Colors.white : AppColors.slate600)),
                  ),
                ),
              ),
          ],
        ),
      );
}

Future<bool> confirmDialog(BuildContext context, String title, String message,
    {String confirm = 'Xác nhận', bool danger = true}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      content: Text(message, style: const TextStyle(fontSize: 14, color: AppColors.slate600)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Hủy', style: TextStyle(color: AppColors.slate600))),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: danger ? AppColors.red600 : AppColors.slate900),
          onPressed: () => Navigator.pop(c, true),
          child: Text(confirm),
        ),
      ],
    ),
  );
  return ok == true;
}
