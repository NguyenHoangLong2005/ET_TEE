import 'dart:async';

import 'package:flutter/material.dart';

import 'theme.dart';

/// Top-center toasts with rich colors, like the web's sonner `<Toaster position="top-center" richColors />`.
class Toast {
  static final navigatorKey = GlobalKey<NavigatorState>();
  static OverlayEntry? _current;
  static Timer? _timer;

  static void success(String msg) => _show(msg, _ToastKind.success);
  static void error(String msg) => _show(msg, _ToastKind.error);
  static void info(String msg) => _show(msg, _ToastKind.info);

  static void _show(String msg, _ToastKind kind) {
    final overlay = navigatorKey.currentState?.overlay;
    if (overlay == null) return;
    _timer?.cancel();
    _current?.remove();
    final entry = OverlayEntry(builder: (_) => _ToastView(message: msg, kind: kind, onClose: _dismiss));
    _current = entry;
    overlay.insert(entry);
    _timer = Timer(const Duration(milliseconds: 3200), _dismiss);
  }

  static void _dismiss() {
    _timer?.cancel();
    _current?.remove();
    _current = null;
  }
}

enum _ToastKind { success, error, info }

class _ToastView extends StatelessWidget {
  final String message;
  final _ToastKind kind;
  final VoidCallback onClose;
  const _ToastView({required this.message, required this.kind, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final (bg, border, fg, icon) = switch (kind) {
      _ToastKind.success => (AppColors.emerald50, AppColors.emerald200, AppColors.emerald800, Icons.check_circle),
      _ToastKind.error => (AppColors.red50, const Color(0xFFFECACA), AppColors.red700, Icons.error),
      _ToastKind.info => (AppColors.blue50, const Color(0xFFBFDBFE), AppColors.blue700, Icons.info),
    };
    return Positioned(
      top: MediaQuery.of(context).padding.top + 12,
      left: 16,
      right: 16,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Material(
            color: Colors.transparent,
            child: GestureDetector(
              onTap: onClose,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 220),
                builder: (_, v, child) => Opacity(opacity: v, child: Transform.translate(offset: Offset(0, -12 * (1 - v)), child: child)),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: bg,
                    border: Border.all(color: border),
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: const [BoxShadow(color: Color(0x1A0F172A), blurRadius: 16, offset: Offset(0, 6))],
                  ),
                  child: Row(
                    children: [
                      Icon(icon, size: 18, color: fg),
                      const SizedBox(width: 10),
                      Expanded(child: Text(message, style: TextStyle(color: fg, fontSize: 13, fontWeight: FontWeight.w600))),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
