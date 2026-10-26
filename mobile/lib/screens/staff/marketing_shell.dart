import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';

typedef NavItem = (String label, String path, IconData icon);

const marketingNav = <NavItem>[
  ('Tổng quan', '/staff/marketing', Icons.dashboard_outlined),
  ('Trang chủ', '/staff/marketing/homepage', Icons.web_outlined),
  ('Bài viết', '/staff/marketing/posts', Icons.article_outlined),
  ('Voucher', '/staff/marketing/vouchers', Icons.local_offer_outlined),
  ('Chiến dịch email', '/staff/marketing/email', Icons.mail_outline),
  ('Hiệu quả', '/staff/marketing/analytics', Icons.bar_chart),
];

/// One staff workspace in the app: who it is for, where it starts and its menu (web role-navigation.config).
class Workspace {
  final String label;
  final String prefix;
  final List<NavItem> nav;
  const Workspace(this.label, this.prefix, this.nav);
  String get home => nav.first.$2;
}

const _warehouse = Workspace('KHO HÀNG', '/staff/warehouse', [
  ('Tổng quan', '/staff/warehouse', Icons.dashboard_outlined),
  ('Xuất hàng', '/staff/warehouse/fulfillment', Icons.local_shipping_outlined),
  ('Tồn kho', '/staff/warehouse/inventory', Icons.inventory_2_outlined),
  ('Nhập hàng', '/staff/warehouse/receiving', Icons.move_to_inbox_outlined),
  ('Đề xuất nhập', '/staff/warehouse/replenishment', Icons.playlist_add_outlined),
]);
const _shipping = Workspace('VẬN CHUYỂN', '/staff/shipping', [
  ('Tổng quan', '/staff/shipping', Icons.dashboard_outlined),
  ('Đơn chờ tạo vận đơn', '/staff/shipping/orders', Icons.receipt_long_outlined),
  ('Kiện hàng', '/staff/shipping/shipments', Icons.local_shipping_outlined),
  ('Ngoại lệ', '/staff/shipping/exceptions', Icons.report_problem_outlined),
  ('Đối soát COD', '/staff/shipping/cod', Icons.payments_outlined),
]);
const _sales = Workspace('BÁN HÀNG', '/staff/sales', [
  ('Tổng quan', '/staff/sales', Icons.dashboard_outlined),
  ('Đơn hàng', '/staff/sales/orders', Icons.shopping_cart_outlined),
]);
const _cskh = Workspace('CHĂM SÓC KHÁCH HÀNG', '/staff/cskh', [
  ('Ticket hỗ trợ', '/staff/cskh', Icons.support_agent_outlined),
  ('Đánh giá & bình luận', '/staff/cskh/reviews', Icons.rate_review_outlined),
]);
const _owner = Workspace('QUẢN LÝ CỬA HÀNG', '/owner', [
  ('Tổng quan', '/owner', Icons.dashboard_outlined),
  ('Hàng đợi phê duyệt', '/owner/approvals', Icons.fact_check_outlined),
  ('Đơn hàng', '/owner/orders', Icons.shopping_cart_outlined),
  ('Sản phẩm & giá', '/owner/products', Icons.checkroom),
  ('Tồn kho', '/owner/inventory', Icons.inventory_2_outlined),
  ('Khuyến mãi', '/owner/promotions', Icons.local_offer_outlined),
  ('Danh mục', '/owner/categories', Icons.category_outlined),
  ('Nhà sản xuất', '/owner/manufacturers', Icons.factory_outlined),
  ('Nhà cung cấp', '/owner/suppliers', Icons.store_outlined),
  ('Nhân sự', '/owner/staff', Icons.groups_outlined),
  ('Lịch làm việc & xếp ca', '/owner/shifts', Icons.event_note_outlined),
  ('Ticket hỗ trợ', '/staff/cskh', Icons.support_agent_outlined),
  ('Nhật ký', '/owner/logs', Icons.history_outlined),
]);
const _admin = Workspace('QUẢN TRỊ HỆ THỐNG', '/admin', [
  ('Tổng quan hệ thống', '/admin', Icons.monitor_heart_outlined),
  ('Người dùng', '/admin/users', Icons.manage_accounts_outlined),
  ('Phân quyền (RBAC)', '/admin/rbac', Icons.admin_panel_settings_outlined),
  ('Chi nhánh', '/admin/shops', Icons.storefront_outlined),
  ('Danh mục toàn hệ thống', '/admin/categories', Icons.category_outlined),
  ('Mô hình AI', '/admin/ai-models', Icons.memory),
  ('Cờ tính năng AI', '/admin/feature-flags', Icons.toggle_on_outlined),
  ('Nhật ký kiểm toán', '/admin/audit-logs', Icons.history_outlined),
  ('Nhật ký email', '/admin/mailing', Icons.mail_outline),
  ('Nhật ký máy chủ', '/admin/logs', Icons.terminal),
  ('Sao lưu & khôi phục', '/admin/backup', Icons.backup_outlined),
]);

Workspace workspaceFor(String role) => switch (role) {
      'MARKETING_STAFF' => const Workspace('MARKETING & KINH DOANH', '/staff/marketing', marketingNav),
      'WAREHOUSE_STAFF' => _warehouse,
      'SHIPPING_STAFF' => _shipping,
      'SALES_STAFF' || 'STAFF' => _sales,
      'CSKH_STAFF' => _cskh,
      'SHOP_OWNER' => _owner,
      _ => _admin,
    };

/// Paths a role may open: its own workspace, plus the support tickets the owner also handles
/// (backend StaffSupportTicketController allows SHOP_OWNER) and the shared password screen.
bool staffMayOpen(String role, String path) {
  if (path == '/staff/change-password' || path == '/staff/profile') return true;
  final ws = workspaceFor(role);
  if (path == ws.prefix || path.startsWith('${ws.prefix}/')) return true;
  return role == 'SHOP_OWNER' && (path == '/staff/cskh' || path.startsWith('/staff/cskh/'));
}

/// Staff chrome (web StaffSidebar + StaffHeader): slate-50 page, white top bar, sidebar as a drawer.
/// The menu is the signed-in role's workspace.
class StaffShell extends StatelessWidget {
  final String path;
  final String title;
  final Widget body;
  final Widget? floatingAction;
  final List<Widget>? actions;
  const StaffShell({super.key, required this.path, required this.title, required this.body, this.floatingAction, this.actions});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final ws = workspaceFor(user?.role ?? 'MARKETING_STAFF');
    return Scaffold(
      backgroundColor: AppColors.slate50,
      drawer: Drawer(
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(),
        width: 280,
        child: SafeArea(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(ws.label, style: labelCaps(size: 10, color: AppColors.slate400)),
                const SizedBox(height: 4),
                const Text('ET.TEE Studio', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(8),
                children: [
                  for (final (label, href, icon) in ws.nav)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Material(
                        color: path == href ? AppColors.primary100 : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: () {
                            Navigator.pop(context);
                            if (path != href) context.go(href);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                            child: Row(children: [
                              Icon(icon, size: 18, color: path == href ? AppColors.primary900 : AppColors.slate400),
                              const SizedBox(width: 12),
                              Text(label,
                                  style: TextStyle(
                                      fontSize: 14, fontWeight: FontWeight.w500, color: path == href ? AppColors.primary900 : AppColors.slate500)),
                            ]),
                          ),
                        ),
                      ),
                    ),
                  const Divider(height: 24),
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.person_outline, size: 18, color: AppColors.slate400),
                    title: const Text('Hồ sơ cá nhân', style: TextStyle(fontSize: 14, color: AppColors.slate500)),
                    onTap: () {
                      Navigator.pop(context);
                      context.push('/staff/profile');
                    },
                  ),
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.lock_outline, size: 18, color: AppColors.slate400),
                    title: const Text('Đổi mật khẩu', style: TextStyle(fontSize: 14, color: AppColors.slate500)),
                    onTap: () {
                      Navigator.pop(context);
                      context.push('/staff/change-password');
                    },
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.slate100))),
              child: Row(children: [
                CircleAvatar(
                  radius: 17,
                  backgroundColor: AppColors.primary100,
                  child: Text(user?.fullName.isNotEmpty == true ? user!.fullName[0].toUpperCase() : 'M',
                      style: const TextStyle(color: AppColors.primary900, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(user?.fullName ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    Text(roleDisplayName(user?.role ?? 'MARKETING_STAFF'), style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
                  ]),
                ),
                IconButton(
                  tooltip: 'Đăng xuất',
                  icon: const Icon(Icons.logout, size: 18, color: AppColors.slate500),
                  onPressed: () => logoutAndExit(context),
                ),
              ]),
            ),
          ]),
        ),
      ),
      appBar: AppBar(
        backgroundColor: Colors.white,
        titleSpacing: 0,
        // Detail pages are pushed on top of a list: show back instead of the menu (no system back on iOS).
        leading: Navigator.of(context).canPop() ? const BackButton() : null,
        title: Row(children: [
          Container(width: 4, height: 20, color: AppColors.red600),
          const SizedBox(width: 10),
          Flexible(child: Text(title, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600))),
        ]),
        actions: actions,
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: AppColors.slate200)),
      ),
      floatingActionButton: floatingAction,
      // Staff colour rule: text links stay neutral, colour is kept for status.
      body: Theme(
        data: Theme.of(context).copyWith(
          textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: AppColors.slate700)),
        ),
        child: body,
      ),
    );
  }
}

/// The marketing screens predate the other workspaces and still use this name.
typedef MarketingShell = StaffShell;

Future<void> logoutAndExit(BuildContext context) async {
  final ok = await confirmDialog(context, 'Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản nhân viên?', confirm: 'Đăng xuất', danger: false);
  if (!ok || !context.mounted) return;
  await context.read<AuthProvider>().logout();
  if (context.mounted) context.go('/auth/login');
}

/// White bordered panel used by the staff pages ("rounded-lg border border-slate-200 bg-white").
class StaffPanel extends StatelessWidget {
  final String? title;
  final Widget child;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;
  const StaffPanel({super.key, this.title, required this.child, this.trailing, this.padding = EdgeInsets.zero});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (title != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
              child: Row(children: [
                Expanded(child: Text(title!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500))),
                ?trailing,
              ]),
            ),
          Padding(padding: padding, child: child),
        ]),
      );
}

/// KPI tile with red top border and red tabular value.
class KpiTile extends StatelessWidget {
  final String label;
  final String value;
  final String? sub;
  const KpiTile({super.key, required this.label, required this.value, this.sub});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.red600, width: 2)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: AppColors.red700, fontFeatures: [FontFeature.tabularFigures()])),
          ),
          if (sub != null) Text(sub!, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
        ]),
      );
}

/// Segmented period picker (7 ngày / 30 ngày ...).
class PeriodPicker<T> extends StatelessWidget {
  final List<(T, String)> options;
  final T value;
  final ValueChanged<T> onChanged;
  const PeriodPicker({super.key, required this.options, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            for (final (v, label) in options)
              GestureDetector(
                onTap: () => onChanged(v),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: v == value ? AppColors.red600 : Colors.transparent, borderRadius: BorderRadius.circular(6)),
                  child: Text(label, style: TextStyle(fontSize: 13, color: v == value ? Colors.white : AppColors.slate600)),
                ),
              ),
          ]),
        ),
      );
}

/// Bordered status badge with dot (web staff Badge / StatusBadge).
class ToneBadge extends StatelessWidget {
  final String label;
  final String tone; // gray | green | amber | red | sky | violet | rose
  final bool dot;
  const ToneBadge(this.label, {super.key, this.tone = 'gray', this.dot = true});

  static (Color, Color, Color) colors(String tone) => switch (tone) {
        'green' => (AppColors.emerald50, AppColors.emerald600, AppColors.emerald200),
        'amber' => (AppColors.amber50, AppColors.amber600, AppColors.amber200),
        'red' => (AppColors.red50, AppColors.red600, const Color(0xFFFECACA)),
        'sky' => (AppColors.blue50, AppColors.blue600, const Color(0xFFBFDBFE)),
        'violet' => (AppColors.violet50, AppColors.violet700, const Color(0xFFDDD6FE)),
        'rose' => (AppColors.primary100, AppColors.primary700, const Color(0xFFFBCDD3)),
        _ => (AppColors.slate100, AppColors.slate700, AppColors.slate200),
      };

  @override
  Widget build(BuildContext context) {
    final (bg, fg, ring) = colors(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999), border: Border.all(color: ring)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (dot) ...[Container(width: 6, height: 6, decoration: BoxDecoration(color: fg.withValues(alpha: 0.8), shape: BoxShape.circle)), const SizedBox(width: 5)],
        Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500, color: fg)),
      ]),
    );
  }
}

/// Shown to staff roles other than marketing: their workspaces stay on the web.
class UnsupportedRoleScreen extends StatelessWidget {
  const UnsupportedRoleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: AppColors.slate50,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(color: AppColors.red50, shape: BoxShape.circle, border: Border.all(color: const Color(0xFFFECACA))),
                  child: const Icon(Icons.warning_amber_rounded, color: AppColors.red600),
                ),
                const SizedBox(height: 18),
                const Text('Chưa hỗ trợ trên ứng dụng', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text(
                  'Vai trò ${roleDisplayName(user?.role ?? '')} làm việc trên trang quản trị web. Ứng dụng di động dành cho khách hàng và nhân viên Marketing.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.slate500, fontSize: 13, height: 1.5),
                ),
                const SizedBox(height: 20),
                PillButton('Đăng xuất', style: PillStyle.dark, radius: BorderRadius.circular(8), height: 42, onPressed: () async {
                  await context.read<AuthProvider>().logout();
                  if (context.mounted) context.go('/auth/login');
                }),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
