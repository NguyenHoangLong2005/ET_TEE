import 'package:flutter/material.dart';

/// Hiển thị badge cho từng quyền (PermissionConstants trên backend).
class PermissionGate extends StatelessWidget {
  const PermissionGate({
    super.key,
    required this.permission,
    required this.child,
  });

  final String permission;
  final Widget child;

  static bool has(List<String> permissions, String permission) =>
      permissions.contains(permission);

  @override
  Widget build(BuildContext context) => child;
}