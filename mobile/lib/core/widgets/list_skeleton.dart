import 'package:flutter/material.dart';

/// Khung chờ trong lúc tải danh sách lần đầu.
///
/// Thay cho CircularProgressIndicator toàn màn hình: giữ bố cục và vị trí
/// nội dung nên không bị nhảy layout khi dữ liệu về. Quan trọng với app dùng
/// tay nhiều — nhân viên không phải chờ nhìn màn hình trắng.
class ListSkeleton extends StatelessWidget {
  const ListSkeleton({super.key, this.itemCount = 4, this.hasHeader = false});

  final int itemCount;
  final bool hasHeader;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (hasHeader) ...[
            const _Bone(height: 84),
            const SizedBox(height: 12),
          ],
          for (var i = 0; i < itemCount; i++) ...[
            const _Bone(height: 96),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _Bone extends StatefulWidget {
  const _Bone({required this.height});

  final double height;

  @override
  State<_Bone> createState() => _BoneState();
}

class _BoneState extends State<_Bone>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedBuilder(
      animation: _anim,
      builder: (context, _) => Container(
        height: widget.height,
        decoration: BoxDecoration(
          color: Color.lerp(
            scheme.surfaceContainerHighest,
            scheme.surfaceContainerLow,
            _anim.value,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}