import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/auth_provider.dart';
import '../state/cart_provider.dart';
import '../state/wishlist_provider.dart';
import 'cart_widgets.dart';

const mainMenu = [
  ('Nam', '/products?targetGroup=men', false),
  ('Nữ', '/products?targetGroup=women', false),
  ('Bé trai', '/products?targetGroup=boys', false),
  ('Bé gái', '/products?targetGroup=girls', false),
  ('Phụ kiện', '/products?category=accessories', false),
  ('Gia đình', '/products?targetGroup=family', false),
  ('Sale', '/products?status=sale', true),
];

/// Storefront chrome: red announcement bar + white sticky header + menu drawer, like web Header.tsx.
class StoreScaffold extends StatelessWidget {
  final Widget body;
  final Widget? bottomBar;
  final bool showAnnouncement;
  final Color background;
  const StoreScaffold({super.key, required this.body, this.bottomBar, this.showAnnouncement = false, this.background = Colors.white});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: background,
      drawer: const _MenuDrawer(),
      appBar: PreferredSize(
        preferredSize: Size.fromHeight(showAnnouncement ? 96 : 64),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              if (showAnnouncement) const _AnnouncementBar(),
              const _HeaderRow(),
            ],
          ),
        ),
      ),
      body: body,
      bottomNavigationBar: bottomBar,
    );
  }
}

class _AnnouncementBar extends StatelessWidget {
  const _AnnouncementBar();

  @override
  Widget build(BuildContext context) => Container(
        height: 32,
        color: AppColors.primary,
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text.rich(
              TextSpan(style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500), children: [
                TextSpan(text: 'Freeship toàn quốc '),
                TextSpan(text: 'mọi đơn hàng', style: TextStyle(color: AppColors.amber300, fontWeight: FontWeight.w700)),
              ]),
            ),
            const Text('  |  ', style: TextStyle(color: Colors.white54, fontSize: 11)),
            GestureDetector(
              onTap: () => context.push('/products?status=sale'),
              child: const Row(children: [
                Icon(Icons.local_offer_outlined, size: 12, color: Colors.white),
                SizedBox(width: 3),
                Text('Săn ngay',
                    style: TextStyle(
                        color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700, decoration: TextDecoration.underline, decorationColor: Colors.white)),
              ]),
            ),
          ],
        ),
      );
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow();

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<CartProvider>().count;
    final wishCount = context.watch<WishlistProvider>().count;
    final user = context.watch<AuthProvider>().user;
    final canPop = GoRouter.of(context).canPop();
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: const BoxDecoration(color: Colors.white, border: Border(bottom: BorderSide(color: AppColors.slate200))),
      child: Row(
        children: [
          if (canPop)
            IconButton(icon: const Icon(Icons.arrow_back), color: AppColors.slate700, onPressed: () => context.pop())
          else
            Builder(builder: (c) => IconButton(icon: const Icon(Icons.menu), color: AppColors.slate700, onPressed: () => Scaffold.of(c).openDrawer())),
          GestureDetector(onTap: () => context.go('/'), child: const BrandLogo()),
          const Spacer(),
          IconButton(
            tooltip: 'Tìm kiếm',
            icon: const Icon(Icons.search, size: 22),
            color: AppColors.slate700,
            onPressed: () => context.push('/search'),
          ),
          _BadgeIcon(
            icon: Icons.favorite_border,
            count: wishCount,
            badgeColor: AppColors.red600,
            onTap: () => context.push('/wishlist'),
          ),
          IconButton(
            tooltip: user == null ? 'Đăng nhập' : 'Tài khoản',
            icon: user == null
                ? const Icon(Icons.person_outline, size: 22)
                : CircleAvatar(
                    radius: 13,
                    backgroundColor: AppColors.slate900,
                    child: Text(user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U',
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900)),
                  ),
            color: AppColors.slate700,
            onPressed: () => context.push(user == null ? '/auth/login' : '/account'),
          ),
          _BadgeIcon(icon: Icons.shopping_bag_outlined, count: cartCount, badgeColor: Colors.black, onTap: () => showCartDrawer(context)),
          const SizedBox(width: 4),
        ],
      ),
    );
  }
}

class BrandLogo extends StatelessWidget {
  final bool compact;
  const BrandLogo({super.key, this.compact = false});

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: AppColors.slate900, width: 2)),
            child: ClipOval(child: Image.asset('assets/images/logo.jpg', fit: BoxFit.cover)),
          ),
          const SizedBox(width: 8),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('ET.TEE', style: headline(compact ? 18 : 20).copyWith(letterSpacing: -1, height: 1)),
              if (!compact)
                const Text('STUDIO',
                    style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, letterSpacing: 2.4, color: AppColors.slate400, height: 1.3)),
            ],
          ),
        ],
      );
}

class _BadgeIcon extends StatelessWidget {
  final IconData icon;
  final int count;
  final Color badgeColor;
  final VoidCallback onTap;
  const _BadgeIcon({required this.icon, required this.count, required this.badgeColor, required this.onTap});

  @override
  Widget build(BuildContext context) => IconButton(
        onPressed: onTap,
        icon: Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(icon, size: 22, color: AppColors.slate700),
            if (count > 0)
              Positioned(
                top: -5,
                right: -6,
                child: Container(
                  constraints: const BoxConstraints(minWidth: 16),
                  height: 16,
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: BoxDecoration(color: badgeColor, borderRadius: BorderRadius.circular(8)),
                  alignment: Alignment.center,
                  child: Text('$count', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900)),
                ),
              ),
          ],
        ),
      );
}

class _MenuDrawer extends StatelessWidget {
  const _MenuDrawer();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final wishCount = context.watch<WishlistProvider>().count;
    void go(String path) {
      Navigator.of(context).pop();
      context.push(path);
    }

    return Drawer(
      width: 300,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(),
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 8, 16),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
              child: Row(children: [
                const BrandLogo(compact: true),
                const Spacer(),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: AppColors.slate400)),
              ]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  for (final (label, href, sale) in mainMenu) _menuItem(label, sale, () => go(href)),
                  _menuItem('Tin tức', false, () => go('/news')),
                  _menuItem('Tìm bằng ảnh', false, () => go('/search')),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 6),
                    child: Text('HỖ TRỢ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: AppColors.slate400)),
                  ),
                  for (final (label, href) in const [
                    ('Hướng dẫn chọn size', '/size-guide'),
                    ('Trắc nghiệm phong cách', '/style-quiz'),
                    ('Hệ thống cửa hàng', '/stores'),
                    ('Câu hỏi thường gặp', '/faq'),
                    ('Chính sách khách hàng', '/policy'),
                    ('Liên hệ', '/contact'),
                    ('Giới thiệu ET.TEE', '/about'),
                    ('Tuyển dụng', '/careers'),
                  ])
                    _menuItem(label, false, () => go(href)),
                ],
              ),
            ),
            Container(
              color: AppColors.slate50,
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  if (user != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                          color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
                      child: Row(children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.slate900,
                          child: Text(user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(user.fullName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                            Text(user.email, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: AppColors.slate400)),
                          ]),
                        ),
                      ]),
                    ),
                    _footerLink(Icons.person_outline, 'Tài khoản của tôi', () => go('/account')),
                    _footerLink(Icons.receipt_long_outlined, 'Lịch sử đơn hàng', () => go('/account/orders')),
                    _footerLink(Icons.logout, 'Đăng xuất', () async {
                      Navigator.pop(context);
                      await context.read<AuthProvider>().logout();
                      if (context.mounted) context.go('/');
                    }, color: AppColors.red600),
                  ] else
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                            backgroundColor: AppColors.slate900, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                        onPressed: () => go('/auth/login'),
                        icon: const Icon(Icons.person_outline, size: 18),
                        label: Text('ĐĂNG NHẬP / ĐĂNG KÝ', style: labelCaps(size: 13, color: Colors.white)),
                      ),
                    ),
                  _footerLink(Icons.favorite_border, 'Sản phẩm yêu thích ($wishCount)', () => go('/wishlist')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuItem(String label, bool sale, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Material(
          color: sale ? AppColors.red50 : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(children: [
                Expanded(child: Text(label.toUpperCase(), style: labelCaps(size: 13, color: sale ? AppColors.red600 : AppColors.slate800))),
                const Icon(Icons.chevron_right, size: 18, color: AppColors.slate400),
              ]),
            ),
          ),
        ),
      );

  Widget _footerLink(IconData icon, String label, VoidCallback onTap, {Color color = AppColors.slate700}) => InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          child: Row(children: [
            Icon(icon, size: 17, color: color),
            const SizedBox(width: 10),
            Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: color)),
          ]),
        ),
      );
}

/// Simple page with a back arrow and title, for secondary screens (account pages, forms).
class SubPageScaffold extends StatelessWidget {
  final String title;
  final Widget body;
  final Widget? bottomBar;
  final List<Widget>? actions;
  final Color background;
  const SubPageScaffold({super.key, required this.title, required this.body, this.bottomBar, this.actions, this.background = Colors.white});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: background,
        appBar: AppBar(
          title: Text(title.toUpperCase(), style: headline(16)),
          actions: actions,
          bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: AppColors.slate200)),
        ),
        body: body,
        bottomNavigationBar: bottomBar,
      );
}
