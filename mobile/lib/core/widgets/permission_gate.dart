import 'package:flutter/material.dart';

import '../../domain/repositories/auth_repository.dart';
import '../di/injector.dart';

/// Hides controls the signed-in staff member cannot use.
class PermissionGate extends StatelessWidget {
  const PermissionGate({
    super.key,
    this.permission,
    required this.child,
    this.alsoRequire = const [],
    this.requireAny = const [],
  });

  final String? permission;
  final List<String> alsoRequire;
  final List<String> requireAny;
  final Widget child;

  static bool has(List<String> permissions, String permission) =>
      permissions.contains(permission);

  @override
  Widget build(BuildContext context) {
    final profile = sl<AuthRepository>().cachedProfile;
    if (profile == null ||
        (permission != null && !profile.has(permission!)) ||
        !alsoRequire.every(profile.has) ||
        (requireAny.isNotEmpty && !requireAny.any(profile.has))) {
      return const SizedBox.shrink();
    }
    return child;
  }
}
