import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';

class _Feature {
  const _Feature({
    required this.title,
    required this.subtitle,
    required this.icon,
    this.path,
    this.kind = _FeatureKind.list,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final String? path;
  final _FeatureKind kind;
}

enum _FeatureKind { list, tickets, orderLookup }

const _adminFeatures = [
  _Feature(
    title: 'Giám sát hệ thống',
    subtitle: 'Tình trạng máy chủ, cơ sở dữ liệu và đơn hàng',
    icon: Icons.monitor_heart_outlined,
    path: '/api/admin/monitoring/metrics',
  ),
  _Feature(
    title: 'Người dùng',
    subtitle: 'Tài khoản, vai trò và trạng thái',
    icon: Icons.people_alt_outlined,
    path: '/api/admin/users?page=0&size=30',
  ),
  _Feature(
    title: 'Phân quyền RBAC',
    subtitle: 'Vai trò và quyền truy cập',
    icon: Icons.admin_panel_settings_outlined,
    path: '/api/admin/rbac/roles',
  ),
  _Feature(
    title: 'Chi nhánh',
    subtitle: 'Danh sách và trạng thái cửa hàng',
    icon: Icons.storefront_outlined,
    path: '/api/admin/shops',
  ),
  _Feature(
    title: 'Danh mục hệ thống',
    subtitle: 'Danh mục sản phẩm toàn hệ thống',
    icon: Icons.account_tree_outlined,
    path: '/api/admin/categories/tree',
  ),
  _Feature(
    title: 'Thanh toán & vận chuyển',
    subtitle: 'Cài đặt phương thức và phí giao hàng',
    icon: Icons.payments_outlined,
    path: '/api/admin/settings',
  ),
  _Feature(
    title: 'AI Models',
    subtitle: 'Phiên bản mô hình AI',
    icon: Icons.memory_rounded,
    path: '/api/admin/model-versions',
  ),
  _Feature(
    title: 'AI Feature Flags',
    subtitle: 'Bật/tắt tính năng AI',
    icon: Icons.tune_rounded,
    path: '/api/admin/feature-flags',
  ),
  _Feature(
    title: 'Nhật ký hệ thống',
    subtitle: 'Theo dõi hoạt động và kiểm toán',
    icon: Icons.receipt_long_outlined,
    path: '/api/admin/audit-logs?page=0&size=30',
  ),
  _Feature(
    title: 'Email Logs',
    subtitle: 'Theo dõi email gửi đi và thử gửi lại',
    icon: Icons.mark_email_read_outlined,
    path: '/api/admin/mailing/logs?page=0&size=30',
  ),
  _Feature(
    title: 'Nhật ký máy chủ',
    subtitle: 'Tra cứu log vận hành',
    icon: Icons.terminal_rounded,
    path: '/api/admin/logs?page=0&size=30',
  ),
  _Feature(
    title: 'Sao lưu dữ liệu',
    subtitle: 'Tạo, khôi phục và quản lý bản sao lưu',
    icon: Icons.backup_outlined,
    path: '/api/admin/backup',
  ),
];

const _ownerFeatures = [
  _Feature(
    title: 'Đơn hàng',
    subtitle: 'Theo dõi đơn của chi nhánh',
    icon: Icons.shopping_bag_outlined,
    path: '/api/store-owner/orders?page=0&size=30',
  ),
  _Feature(
    title: 'Sản phẩm',
    subtitle: 'Giá bán và tình trạng kinh doanh',
    icon: Icons.inventory_2_outlined,
    path: '/api/store-owner/products?page=0&size=30',
  ),
  _Feature(
    title: 'Danh mục cửa hàng',
    subtitle: 'Cấu hình danh mục tại chi nhánh',
    icon: Icons.category_outlined,
    path: '/api/store-owner/categories',
  ),
  _Feature(
    title: 'Tồn kho',
    subtitle: 'Kiểm tra số lượng hàng trong kho',
    icon: Icons.warehouse_outlined,
    path: '/api/staff/warehouse/inventory',
  ),
  _Feature(
    title: 'Khuyến mãi',
    subtitle: 'Voucher và chương trình tại chi nhánh',
    icon: Icons.local_offer_outlined,
    path: '/api/marketing/admin/vouchers',
  ),
  _Feature(
    title: 'Nhà sản xuất',
    subtitle: 'Thông tin đối tác sản xuất',
    icon: Icons.factory_outlined,
    path: '/api/manufacturers?page=0&size=30',
  ),
  _Feature(
    title: 'Nhà cung cấp',
    subtitle: 'Thông tin đối tác cung ứng',
    icon: Icons.local_shipping_outlined,
    path: '/api/suppliers?page=0&size=30',
  ),
  _Feature(
    title: 'Chờ phê duyệt',
    subtitle: 'Voucher và điều chỉnh tồn kho',
    icon: Icons.fact_check_outlined,
    path: '/api/store-owner/approvals/pending',
  ),
  _Feature(
    title: 'Nhân viên',
    subtitle: 'Danh sách nhân sự chi nhánh',
    icon: Icons.badge_outlined,
    path: '/api/store-owner/staff',
  ),
  _Feature(
    title: 'Lịch làm việc',
    subtitle: 'Lịch và phân ca nhân viên',
    icon: Icons.calendar_month_outlined,
    path: '/api/store-owner/work-shifts',
  ),
  _Feature(
    title: 'Đánh giá nhân viên',
    subtitle: 'Đánh giá hiệu suất nhân sự chi nhánh',
    icon: Icons.stars_outlined,
    path: '/api/store-owner/evaluations',
  ),
  _Feature(
    title: 'Nhật ký chi nhánh',
    subtitle: 'Lịch sử thao tác tại cửa hàng',
    icon: Icons.history_rounded,
    path: '/api/store-owner/audit-logs?page=0&size=30',
  ),
];

const _cskhFeatures = [
  _Feature(
    title: 'Ticket hỗ trợ',
    subtitle: 'Tiếp nhận, phản hồi và xử lý yêu cầu',
    icon: Icons.forum_outlined,
    path: '/api/staff/support/tickets?page=0&size=30',
    kind: _FeatureKind.tickets,
  ),
  _Feature(
    title: 'Ticket của tôi',
    subtitle: 'Ticket cần tiếp nhận và xử lý',
    icon: Icons.confirmation_number_outlined,
    path: '/api/staff/support/tickets?page=0&size=30',
    kind: _FeatureKind.tickets,
  ),
  _Feature(
    title: 'Tra cứu đơn hàng',
    subtitle: 'Tìm theo mã đơn hoặc số điện thoại',
    icon: Icons.search_rounded,
    kind: _FeatureKind.orderLookup,
  ),
  _Feature(
    title: 'Hạn mức voucher',
    subtitle: 'Kiểm tra ngân sách voucher CSKH',
    icon: Icons.card_giftcard_outlined,
    path: '/api/staff/cskh/vouchers/quota',
  ),
  _Feature(
    title: 'Lịch sử tra cứu',
    subtitle: 'Nhật ký tra cứu đơn hàng',
    icon: Icons.manage_search_outlined,
    path: '/api/staff/cskh/audit-logs?page=0&size=30',
  ),
  _Feature(
    title: 'Đánh giá & bình luận',
    subtitle: 'Theo dõi phản hồi và đánh giá sản phẩm',
    icon: Icons.rate_review_outlined,
    path: '/api/staff/cskh/reviews',
  ),
];

List<_Feature> _featuresFor(String role) => switch (role) {
  'ADMIN' => _adminFeatures,
  'SHOP_OWNER' => _ownerFeatures,
  'CSKH_STAFF' => _cskhFeatures,
  _ => const [],
};

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    required this.session,
    required this.onLogout,
    super.key,
  });

  final UserSession session;
  final Future<void> Function() onLogout;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedTab = 0;

  List<_Feature> get _features => _featuresFor(widget.session.role);

  @override
  Widget build(BuildContext context) {
    final pages = [
      _OverviewTab(
        session: widget.session,
        features: _features,
        onOpenFeature: _openFeature,
      ),
      _ModulesTab(
        features: _features,
        onOpenFeature: _openFeature,
        onOpenWebPortal: _openWebPortal,
      ),
      _AccountTab(session: widget.session, onLogout: widget.onLogout),
    ];

    return Scaffold(
      body: SafeArea(
        child: IndexedStack(index: _selectedTab, children: pages),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTab,
        onDestinationSelected: (value) => setState(() => _selectedTab = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.space_dashboard_outlined),
            selectedIcon: Icon(Icons.space_dashboard_rounded),
            label: 'Tổng quan',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view_rounded),
            label: 'Chức năng',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Tài khoản',
          ),
        ],
      ),
    );
  }

  Future<void> _openFeature(_Feature feature) async {
    if (feature.kind == _FeatureKind.orderLookup) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const _OrderLookupScreen()),
      );
      return;
    }
    if (feature.path == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            _DataModuleScreen(feature: feature, session: widget.session),
      ),
    );
  }

  Future<void> _openWebPortal() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _WebPortalScreen(session: widget.session),
      ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({
    required this.session,
    required this.features,
    required this.onOpenFeature,
  });

  final UserSession session;
  final List<_Feature> features;
  final ValueChanged<_Feature> onOpenFeature;

  @override
  Widget build(BuildContext context) {
    final firstFeatures = features.take(3).toList();
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              Text(
                'ET.TEE',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  letterSpacing: 2,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Xin chào, ${session.fullName.split(' ').first}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                session.roleLabel,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: Colors.black54),
              ),
              const SizedBox(height: 22),
              _MetricsCard(role: session.role),
              const SizedBox(height: 26),
              Row(
                children: [
                  Text(
                    'Truy cập nhanh',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...firstFeatures.map(
                (feature) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _FeatureTile(
                    feature: feature,
                    onTap: () => onOpenFeature(feature),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Dữ liệu được tải trực tiếp từ hệ thống ET.TEE.',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: Colors.black45),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _MetricsCard extends StatelessWidget {
  const _MetricsCard({required this.role});

  final String role;

  @override
  Widget build(BuildContext context) {
    final path = switch (role) {
      'SHOP_OWNER' => '/api/store-owner/dashboard',
      'ADMIN' => '/api/admin/users/stats',
      _ => '/api/staff/cskh/vouchers/quota',
    };
    return FutureBuilder<dynamic>(
      future: ApiClient.get(path),
      builder: (context, snapshot) {
        final data = snapshot.hasData ? unwrapResponse(snapshot.data) : null;
        final values = data is Map
            ? Map<String, dynamic>.from(data)
            : <String, dynamic>{};
        return Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF3E5F4B),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.insights_rounded, color: Colors.white70),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      switch (role) {
                        'SHOP_OWNER' => 'Tình hình cửa hàng',
                        'ADMIN' => 'Tổng quan tài khoản',
                        _ => 'Hạn mức chăm sóc khách hàng',
                      },
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              if (snapshot.hasError)
                Text(
                  'Chưa tải được số liệu. ${snapshot.error}',
                  style: const TextStyle(color: Colors.white70),
                )
              else if (values.isEmpty)
                const Text(
                  'Chưa có số liệu tổng quan.',
                  style: TextStyle(color: Colors.white70),
                )
              else
                Wrap(
                  spacing: 20,
                  runSpacing: 14,
                  children: values.entries.take(4).map((entry) {
                    return SizedBox(
                      width: 135,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _humanizeKey(entry.key),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _displayValue(entry.value),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _ModulesTab extends StatelessWidget {
  const _ModulesTab({
    required this.features,
    required this.onOpenFeature,
    required this.onOpenWebPortal,
  });

  final List<_Feature> features;
  final ValueChanged<_Feature> onOpenFeature;
  final VoidCallback onOpenWebPortal;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              Text(
                'Chức năng',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Các nghiệp vụ được phân theo quyền của tài khoản.',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: Colors.black54),
              ),
              const SizedBox(height: 18),
              Card(
                child: ListTile(
                  onTap: onOpenWebPortal,
                  leading: Container(
                    height: 44,
                    width: 44,
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.language_rounded,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  title: const Text(
                    'Toàn bộ chức năng website',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: const Text(
                    'Mở giao diện web đầy đủ trong ứng dụng',
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                ),
              ),
              const SizedBox(height: 10),
              ...features.map(
                (feature) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _FeatureTile(
                    feature: feature,
                    onTap: () => onOpenFeature(feature),
                  ),
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _AccountTab extends StatelessWidget {
  const _AccountTab({required this.session, required this.onLogout});

  final UserSession session;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Tài khoản',
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 27,
                  backgroundColor: Theme.of(
                    context,
                  ).colorScheme.primary.withValues(alpha: 0.12),
                  child: Icon(
                    Icons.person_rounded,
                    color: Theme.of(context).colorScheme.primary,
                    size: 30,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session.fullName,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        session.email,
                        style: const TextStyle(color: Colors.black54),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        session.roleLabel,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: ListTile(
            leading: const Icon(Icons.dns_outlined),
            title: const Text('Máy chủ API'),
            subtitle: Text(ApiClient.baseUrl),
          ),
        ),
        const SizedBox(height: 18),
        OutlinedButton.icon(
          onPressed: () => onLogout(),
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Đăng xuất'),
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF9D3333),
            minimumSize: const Size.fromHeight(50),
          ),
        ),
      ],
    );
  }
}

const _webAppUrl = String.fromEnvironment(
  'WEB_APP_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

class _WebPortalScreen extends StatefulWidget {
  const _WebPortalScreen({required this.session});

  final UserSession session;

  @override
  State<_WebPortalScreen> createState() => _WebPortalScreenState();
}

class _WebPortalScreenState extends State<_WebPortalScreen> {
  late final WebViewController _controller;
  int _progress = 0;
  String? _configurationError;

  @override
  void initState() {
    super.initState();
    final baseUri = Uri.tryParse(_webAppUrl);
    if (baseUri == null ||
        !{'http', 'https'}.contains(baseUri.scheme) ||
        baseUri.host.isEmpty) {
      _configurationError =
          'WEB_APP_URL không hợp lệ. Hãy cấu hình địa chỉ website trong mobile/README.md.';
      return;
    }
    final path = switch (widget.session.role) {
      'ADMIN' => '/admin/dashboard',
      'SHOP_OWNER' => '/store-owner/dashboard',
      'CSKH_STAFF' => '/staff/dashboard/cskh',
      _ => '/login',
    };
    final startUri = baseUri.replace(path: path);
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF6F7F4))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (value) {
            if (mounted) setState(() => _progress = value);
          },
          onNavigationRequest: (request) {
            final nextUri = Uri.tryParse(request.url);
            if (nextUri != null &&
                nextUri.host == baseUri.host &&
                nextUri.scheme == baseUri.scheme) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(startUri);
  }

  @override
  Widget build(BuildContext context) {
    if (_configurationError != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Website ET.TEE')),
        body: _ErrorState(message: _configurationError!, onRetry: () {}),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Website ET.TEE'),
        actions: [
          IconButton(
            onPressed: () => _controller.reload(),
            tooltip: 'Tải lại',
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
        bottom: _progress < 100
            ? PreferredSize(
                preferredSize: const Size.fromHeight(2),
                child: LinearProgressIndicator(
                  value: _progress / 100,
                  minHeight: 2,
                ),
              )
            : null,
      ),
      body: Column(
        children: [
          Material(
            color: const Color(0xFFEAF0EA),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              child: Row(
                children: [
                  const Icon(Icons.verified_user_outlined, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${widget.session.roleLabel} · Nếu website yêu cầu, đăng nhập tài khoản trên website.',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Expanded(child: WebViewWidget(controller: _controller)),
        ],
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({required this.feature, required this.onTap});

  final _Feature feature;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
        leading: Container(
          height: 44,
          width: 44,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(
            feature.icon,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        title: Text(
          feature.title,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(feature.subtitle),
        trailing: const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}

class _DataModuleScreen extends StatefulWidget {
  const _DataModuleScreen({required this.feature, required this.session});

  final _Feature feature;
  final UserSession session;

  @override
  State<_DataModuleScreen> createState() => _DataModuleScreenState();
}

class _DataModuleScreenState extends State<_DataModuleScreen> {
  late Future<dynamic> _request;

  @override
  void initState() {
    super.initState();
    _request = ApiClient.get(widget.feature.path!);
  }

  void _reload() =>
      setState(() => _request = ApiClient.get(widget.feature.path!));

  bool get _canCreate => const {
    'Người dùng',
    'Chi nhánh',
    'Nhân viên',
    'Lịch làm việc',
    'Tồn kho',
    'AI Feature Flags',
    'AI Models',
    'Sao lưu dữ liệu',
    'Danh mục hệ thống',
    'Danh mục cửa hàng',
  }.contains(widget.feature.title);

  Future<void> _openCreateForm() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          const {
            'Chi nhánh',
            'Người dùng',
            'Nhân viên',
          }.contains(widget.feature.title)
          ? _ManagementFormSheet(feature: widget.feature)
          : _UtilityFormSheet(feature: widget.feature),
    );
    if (saved == true) _reload();
  }

  Widget? _recordAction(Map<String, dynamic> item) {
    final title = widget.feature.title;
    if (title == 'Danh mục cửa hàng' || title == 'Danh mục hệ thống') {
      final id = item['id']?.toString();
      if (id == null || id.isEmpty) return null;
      final endpoint = title == 'Danh mục cửa hàng'
          ? '/api/store-owner/categories/$id'
          : '/api/admin/categories/$id';
      return IconButton(
        tooltip: 'Xóa danh mục',
        onPressed: () => _confirmDeleteRecord(endpoint, 'Xóa danh mục này?'),
        icon: const Icon(Icons.delete_outline_rounded),
      );
    }
    if (title == 'Chi nhánh') {
      return IconButton(
        tooltip: 'Sửa chi nhánh',
        onPressed: () async {
          final saved = await showModalBottomSheet<bool>(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            builder: (_) =>
                _ManagementFormSheet(feature: widget.feature, record: item),
          );
          if (saved == true) _reload();
        },
        icon: const Icon(Icons.edit_outlined),
      );
    }
    if (title == 'AI Feature Flags') {
      final key = item['key']?.toString();
      if (key == null || key.isEmpty) return null;
      final enabled = item['enabled'] == true;
      return IconButton(
        tooltip: enabled ? 'Tắt tính năng' : 'Bật tính năng',
        onPressed: () => _runRowAction(
          () => ApiClient.post(
            '/api/admin/feature-flags/${Uri.encodeComponent(key)}',
            body: {'enabled': !enabled},
          ),
          enabled ? 'Đã tắt tính năng.' : 'Đã bật tính năng.',
        ),
        icon: Icon(
          enabled ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
        ),
      );
    }
    if (title == 'AI Models') {
      final id = item['id']?.toString();
      if (id == null || id.isEmpty || item['active'] == true) return null;
      return IconButton(
        tooltip: 'Kích hoạt mô hình',
        onPressed: () => _runRowAction(
          () => ApiClient.post(
            '/api/admin/model-versions/$id/activate',
            body: {},
          ),
          'Đã kích hoạt mô hình.',
        ),
        icon: const Icon(Icons.play_circle_outline_rounded),
      );
    }
    if (title == 'Email Logs') {
      final id = item['id']?.toString();
      if (id == null || id.isEmpty) return null;
      return IconButton(
        tooltip: 'Thử gửi lại',
        onPressed: () => _runRowAction(
          () => ApiClient.post('/api/admin/email-logs/$id/retry'),
          'Đã yêu cầu gửi lại email.',
        ),
        icon: const Icon(Icons.refresh_rounded),
      );
    }
    if (title == 'Lịch làm việc') {
      final id = item['id']?.toString();
      if (id == null || id.isEmpty) return null;
      return IconButton(
        tooltip: 'Xóa ca làm việc',
        onPressed: () => _confirmDeleteShift(id),
        icon: const Icon(Icons.delete_outline_rounded),
      );
    }
    if (title != 'Người dùng' && title != 'Nhân viên') return null;

    final id = (item['id'] ?? item['userId'])?.toString();
    final status = item['status']?.toString().toUpperCase();
    if (id == null || id.isEmpty || !{'ACTIVE', 'LOCKED'}.contains(status)) {
      return null;
    }
    final isLocked = status == 'LOCKED';
    return IconButton(
      tooltip: isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      onPressed: () => _toggleAccountStatus(
        id: id,
        isLocked: isLocked,
        isShopStaff: title == 'Nhân viên',
      ),
      icon: Icon(
        isLocked ? Icons.lock_open_outlined : Icons.lock_outline_rounded,
      ),
    );
  }

  Future<void> _runRowAction(
    Future<dynamic> Function() action,
    String successMessage,
  ) async {
    try {
      await action();
      if (mounted) {
        _showMessage(context, successMessage);
        _reload();
      }
    } on ApiException catch (error) {
      if (mounted) _showMessage(context, error.message);
    }
  }

  Future<void> _confirmDeleteShift(String id) async {
    await _confirmDeleteRecord(
      '/api/store-owner/work-shifts/$id',
      'Xóa ca làm việc?',
    );
  }

  Future<void> _confirmDeleteRecord(String endpoint, String title) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: const Text('Thao tác này không thể tự động hoàn tác.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Xóa ca'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await _runRowAction(() => ApiClient.delete(endpoint), 'Đã xóa dữ liệu.');
  }

  Future<void> _toggleAccountStatus({
    required String id,
    required bool isLocked,
    required bool isShopStaff,
  }) async {
    final reasonController = TextEditingController();
    try {
      String? reason;
      if (!isLocked) {
        reason = await showDialog<String>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Khóa tài khoản'),
            content: TextField(
              controller: reasonController,
              autofocus: true,
              minLines: 1,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Lý do khóa'),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Hủy'),
              ),
              FilledButton(
                onPressed: () =>
                    Navigator.pop(dialogContext, reasonController.text.trim()),
                child: const Text('Xác nhận'),
              ),
            ],
          ),
        );
        if (reason == null) return;
        if (!mounted) return;
        if (reason.isEmpty) {
          _showMessage(context, 'Vui lòng nhập lý do khóa tài khoản.');
          return;
        }
      }

      final body = <String, dynamic>{'status': isLocked ? 'ACTIVE' : 'LOCKED'};
      if (reason != null) body['lockReason'] = reason;
      final endpoint = isShopStaff
          ? '/api/store-owner/staff/${Uri.encodeComponent(id)}/status'
          : '/api/admin/users/${Uri.encodeComponent(id)}/status';
      await ApiClient.patch(endpoint, body: body);
      if (mounted) {
        _showMessage(
          context,
          isLocked ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.',
        );
        _reload();
      }
    } on ApiException catch (error) {
      if (mounted) _showMessage(context, error.message);
    } finally {
      reasonController.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isApprovals = widget.feature.title == 'Chờ phê duyệt';
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.feature.title),
        actions: [
          IconButton(
            onPressed: _reload,
            tooltip: 'Tải lại',
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: FutureBuilder<dynamic>(
        future: _request,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorState(message: '${snapshot.error}', onRetry: _reload);
          }
          final items = extractItems(snapshot.data);
          if (items.isEmpty) {
            return const _EmptyState(
              message: 'Chưa có dữ liệu hoặc danh sách đang trống.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 9),
              itemBuilder: (context, index) {
                final item = items[index];
                if (widget.feature.kind == _FeatureKind.tickets) {
                  return _TicketCard(item: item, onUpdated: _reload);
                }
                if (isApprovals) {
                  return _ApprovalCard(item: item, onUpdated: _reload);
                }
                return _RecordCard(
                  item: item,
                  trailingAction: _recordAction(item),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: _canCreate
          ? FloatingActionButton.extended(
              onPressed: _openCreateForm,
              icon: const Icon(Icons.add_rounded),
              label: Text(
                widget.feature.title == 'Chi nhánh'
                    ? 'Thêm chi nhánh'
                    : widget.feature.title == 'Nhân viên'
                    ? 'Thêm nhân viên'
                    : switch (widget.feature.title) {
                        'Lịch làm việc' => 'Phân ca',
                        'Tồn kho' => 'Nhập hàng',
                        'AI Feature Flags' => 'Thêm cờ',
                        'AI Models' => 'Thêm mô hình',
                        'Sao lưu dữ liệu' => 'Tạo bản sao lưu',
                        _ => 'Tạo tài khoản',
                      },
              ),
            )
          : null,
    );
  }
}

class _ManagementFormSheet extends StatefulWidget {
  const _ManagementFormSheet({required this.feature, this.record});

  final _Feature feature;
  final Map<String, dynamic>? record;

  @override
  State<_ManagementFormSheet> createState() => _ManagementFormSheetState();
}

class _ManagementFormSheetState extends State<_ManagementFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _employeeCode = TextEditingController();
  final _password = TextEditingController();
  String _roleCode = 'SALES_STAFF';
  bool _isActive = true;
  bool _saving = false;

  bool get _isShop => widget.feature.title == 'Chi nhánh';
  bool get _isStaff =>
      widget.feature.title == 'Nhân viên' ||
      widget.feature.title == 'Người dùng';
  bool get _editing => widget.record != null;

  List<String> get _roles => widget.feature.title == 'Nhân viên'
      ? const ['SALES_STAFF', 'CSKH_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF']
      : const [
          'SALES_STAFF',
          'CSKH_STAFF',
          'WAREHOUSE_STAFF',
          'SHIPPING_STAFF',
          'MARKETING_STAFF',
        ];

  @override
  void initState() {
    super.initState();
    final record = widget.record;
    if (record != null) {
      _name.text = (record['name'] ?? record['fullName'] ?? '').toString();
      _email.text = record['email']?.toString() ?? '';
      _phone.text = record['phone']?.toString() ?? '';
      _address.text = record['address']?.toString() ?? '';
      _employeeCode.text = record['employeeCode']?.toString() ?? '';
      _isActive = record['isActive'] != false;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _address.dispose();
    _employeeCode.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      if (_isShop) {
        final body = {
          'name': _name.text.trim(),
          'address': _address.text.trim().isEmpty ? null : _address.text.trim(),
          'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
          'isActive': _isActive,
        };
        final id = widget.record?['id'];
        if (id == null) {
          await ApiClient.post('/api/admin/shops', body: body);
        } else {
          await ApiClient.put('/api/admin/shops/$id', body: body);
        }
      } else {
        final body = <String, dynamic>{
          'employeeCode': _employeeCode.text.trim().isEmpty
              ? null
              : _employeeCode.text.trim(),
          'fullName': _name.text.trim(),
          'email': _email.text.trim(),
          'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
          'roleCode': _roleCode,
          'initialPassword': _password.text.isEmpty ? null : _password.text,
        };
        final endpoint = widget.feature.title == 'Nhân viên'
            ? '/api/store-owner/staff'
            : '/api/admin/users';
        await ApiClient.post(endpoint, body: body);
      }
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } on ApiException catch (error) {
      if (mounted) _showMessage(context, error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _isShop
        ? (_editing ? 'Sửa chi nhánh' : 'Thêm chi nhánh')
        : widget.feature.title == 'Nhân viên'
        ? 'Thêm nhân viên'
        : 'Tạo tài khoản';
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 14,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.black26,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                title,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              _formField(
                controller: _name,
                label: _isShop ? 'Tên chi nhánh' : 'Họ và tên',
                requiredField: true,
              ),
              if (_isStaff) ...[
                const SizedBox(height: 12),
                _formField(
                  controller: _email,
                  label: 'Email',
                  keyboardType: TextInputType.emailAddress,
                  requiredField: true,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Vui lòng nhập email';
                    }
                    if (!value.contains('@')) return 'Email không hợp lệ';
                    return null;
                  },
                ),
              ],
              const SizedBox(height: 12),
              _formField(
                controller: _phone,
                label: 'Số điện thoại',
                keyboardType: TextInputType.phone,
              ),
              if (_isShop) ...[
                const SizedBox(height: 12),
                _formField(controller: _address, label: 'Địa chỉ'),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _isActive,
                  title: const Text('Chi nhánh đang hoạt động'),
                  onChanged: (value) => setState(() => _isActive = value),
                ),
              ],
              if (_isStaff) ...[
                const SizedBox(height: 12),
                _formField(controller: _employeeCode, label: 'Mã nhân viên'),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _roleCode,
                  decoration: const InputDecoration(labelText: 'Vai trò'),
                  items: _roles
                      .map(
                        (role) => DropdownMenuItem(
                          value: role,
                          child: Text(role.replaceAll('_', ' ')),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) setState(() => _roleCode = value);
                  },
                ),
                const SizedBox(height: 12),
                _formField(
                  controller: _password,
                  label: 'Mật khẩu ban đầu (không bắt buộc)',
                  obscureText: true,
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _saving ? null : _submit,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                ),
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(_editing ? 'Lưu thay đổi' : 'Tạo mới'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _formField({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboardType,
    bool requiredField = false,
    bool obscureText = false,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      decoration: InputDecoration(labelText: label),
      validator:
          validator ??
          (requiredField
              ? (value) => value == null || value.trim().isEmpty
                    ? 'Trường này không được để trống'
                    : null
              : null),
    );
  }
}

class _UtilityFormSheet extends StatefulWidget {
  const _UtilityFormSheet({required this.feature});

  final _Feature feature;

  @override
  State<_UtilityFormSheet> createState() => _UtilityFormSheetState();
}

class _UtilityFormSheetState extends State<_UtilityFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  bool _saving = false;

  String get _title => widget.feature.title;

  List<(String, String)> get _fields => switch (_title) {
    'Lịch làm việc' => const [
      ('userEmail', 'Email nhân viên'),
      ('shiftDate', 'Ngày làm việc (YYYY-MM-DD)'),
      ('shiftType', 'Ca làm việc'),
    ],
    'Tồn kho' => const [
      ('productId', 'Mã sản phẩm'),
      ('quantity', 'Số lượng nhập'),
    ],
    'AI Feature Flags' => const [
      ('key', 'Mã cờ tính năng'),
      ('description', 'Mô tả'),
    ],
    'AI Models' => const [
      ('modelName', 'Tên mô hình'),
      ('version', 'Phiên bản'),
      ('description', 'Mô tả'),
    ],
    'Danh mục hệ thống' || 'Danh mục cửa hàng' => const [
      ('name', 'Tên danh mục'),
      ('slug', 'Slug'),
      ('description', 'Mô tả'),
      ('parentId', 'Mã danh mục cha (không bắt buộc)'),
    ],
    _ => const [],
  };

  @override
  void initState() {
    super.initState();
    for (final (key, _) in _fields) {
      _controllers[key] = TextEditingController(
        text: key == 'shiftType' ? 'Ca Sáng (08:00 - 16:00)' : '',
      );
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (_title == 'Sao lưu dữ liệu') {
      await _save(() => ApiClient.post('/api/admin/backup/create', body: {}));
      return;
    }
    if (!_formKey.currentState!.validate()) return;

    final values = <String, String>{
      for (final entry in _controllers.entries)
        entry.key: entry.value.text.trim(),
    };
    late final String endpoint;
    late final Map<String, dynamic> body;

    switch (_title) {
      case 'Lịch làm việc':
        endpoint = '/api/store-owner/work-shifts';
        body = values;
      case 'Tồn kho':
        final productId = int.tryParse(values['productId'] ?? '');
        final quantity = int.tryParse(values['quantity'] ?? '');
        if (productId == null || quantity == null || quantity <= 0) {
          _showMessage(context, 'Mã sản phẩm và số lượng phải là số hợp lệ.');
          return;
        }
        endpoint = '/api/staff/warehouse/inbound';
        body = {
          'productId': productId,
          'productName': 'Sản phẩm #$productId',
          'quantity': quantity,
          'location': 'Kho Chi nhánh',
        };
      case 'AI Feature Flags':
        endpoint = '/api/admin/feature-flags';
        body = {
          'key': values['key']?.toLowerCase().replaceAll(
            RegExp(r'[^a-z0-9_-]'),
            '_',
          ),
          'description': values['description'] ?? '',
          'enabled': true,
        };
      case 'AI Models':
        endpoint = '/api/admin/model-versions';
        body = {...values, 'active': false};
      case 'Danh mục hệ thống' || 'Danh mục cửa hàng':
        endpoint = _title == 'Danh mục cửa hàng'
            ? '/api/store-owner/categories'
            : '/api/admin/categories';
        body = {
          'name': values['name'],
          'slug': values['slug'],
          'description': values['description']?.isEmpty == true
              ? null
              : values['description'],
          'parentId': int.tryParse(values['parentId'] ?? ''),
        };
      default:
        _showMessage(context, 'Chức năng này chưa được cấu hình.');
        return;
    }
    await _save(() => ApiClient.post(endpoint, body: body));
  }

  Future<void> _save(Future<dynamic> Function() request) async {
    setState(() => _saving = true);
    try {
      await request();
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (mounted) _showMessage(context, error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 14,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.black26,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                switch (_title) {
                  'Lịch làm việc' => 'Phân ca làm việc',
                  'Tồn kho' => 'Nhập hàng vào kho',
                  'AI Feature Flags' => 'Thêm cờ tính năng',
                  'AI Models' => 'Đăng ký mô hình AI',
                  'Sao lưu dữ liệu' => 'Tạo bản sao lưu',
                  _ => 'Thêm danh mục',
                },
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              ..._fields.map(
                (field) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TextFormField(
                    controller: _controllers[field.$1],
                    keyboardType:
                        const {
                          'productId',
                          'quantity',
                          'parentId',
                        }.contains(field.$1)
                        ? TextInputType.number
                        : TextInputType.text,
                    decoration: InputDecoration(labelText: field.$2),
                    validator: (value) {
                      if (field.$1 == 'parentId') return null;
                      if (value == null || value.trim().isEmpty) {
                        return 'Vui lòng nhập ${field.$2.toLowerCase()}';
                      }
                      if (field.$1 == 'quantity' &&
                          (int.tryParse(value) == null ||
                              int.parse(value) <= 0)) {
                        return 'Số lượng phải lớn hơn 0';
                      }
                      return null;
                    },
                  ),
                ),
              ),
              const SizedBox(height: 6),
              FilledButton(
                onPressed: _saving ? null : _submit,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                ),
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        _title == 'Sao lưu dữ liệu' ? 'Tạo bản sao lưu' : 'Lưu',
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({required this.item, this.trailingAction});

  final Map<String, dynamic> item;
  final Widget? trailingAction;

  @override
  Widget build(BuildContext context) {
    final titleKeys = [
      'name',
      'fullName',
      'subject',
      'title',
      'orderCode',
      'ticketCode',
      'productName',
      'email',
      'code',
      'id',
    ];
    final titleKey = titleKeys.where(item.containsKey).firstOrNull;
    final title = titleKey == null
        ? 'Thông tin'
        : _displayValue(item[titleKey]);
    final fields = item.entries
        .where(
          (entry) =>
              entry.key != titleKey &&
              entry.value != null &&
              entry.value is! Map &&
              entry.value is! List,
        )
        .take(4)
        .toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (trailingAction != null) trailingAction!,
              ],
            ),
            if (fields.isNotEmpty) ...[
              const SizedBox(height: 10),
              ...fields.map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '${_humanizeKey(entry.key)}: ${_displayValue(entry.value)}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.black54),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ApprovalCard extends StatelessWidget {
  const _ApprovalCard({required this.item, required this.onUpdated});

  final Map<String, dynamic> item;
  final VoidCallback onUpdated;

  Future<void> _process(BuildContext context, String action) async {
    final id = item['approvalId']?.toString();
    final type = item['type']?.toString();
    if (id == null || id.isEmpty || type == null || type.isEmpty) {
      _showMessage(context, 'Thiếu mã hoặc loại yêu cầu phê duyệt.');
      return;
    }
    try {
      await ApiClient.put(
        '/api/store-owner/approvals/${Uri.encodeComponent(id)}',
        body: {
          'type': type,
          'action': action,
          'note': action == 'APPROVED'
              ? 'Duyệt trên ứng dụng ET.TEE'
              : 'Từ chối trên ứng dụng ET.TEE',
        },
      );
      if (context.mounted) {
        _showMessage(
          context,
          action == 'APPROVED' ? 'Đã duyệt yêu cầu.' : 'Đã từ chối yêu cầu.',
        );
        onUpdated();
      }
    } on ApiException catch (error) {
      if (context.mounted) _showMessage(context, error.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = item['title']?.toString() ?? 'Yêu cầu phê duyệt';
    final details = [
      item['description']?.toString(),
      if (item['requestedBy'] != null) 'Người yêu cầu: ${item['requestedBy']}',
      if (item['type'] != null) 'Loại: ${item['type']}',
      if (item['createdAt'] != null) 'Thời gian: ${item['createdAt']}',
    ].whereType<String>().toList();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 7),
            ...details.map(
              (line) => Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text(
                  line,
                  style: const TextStyle(color: Colors.black54),
                ),
              ),
            ),
            const SizedBox(height: 13),
            Wrap(
              spacing: 8,
              children: [
                FilledButton.tonal(
                  onPressed: () => _process(context, 'APPROVED'),
                  child: const Text('Duyệt'),
                ),
                OutlinedButton(
                  onPressed: () => _process(context, 'REJECTED'),
                  child: const Text('Từ chối'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.item, required this.onUpdated});

  final Map<String, dynamic> item;
  final VoidCallback onUpdated;

  @override
  Widget build(BuildContext context) {
    final status = item['status']?.toString() ?? 'OPEN';
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          final id = item['id']?.toString();
          if (id == null || id.isEmpty) {
            _showMessage(context, 'Ticket không có mã hợp lệ.');
            return;
          }
          showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            builder: (_) =>
                _TicketDetailSheet(ticketId: id, onUpdated: onUpdated),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item['subject']?.toString() ?? 'Yêu cầu hỗ trợ',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                  _StatusChip(status: status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${item['ticketCode'] ?? item['id'] ?? ''} · ${item['customerName'] ?? item['customerEmail'] ?? 'Khách hàng'}',
                style: const TextStyle(color: Colors.black54),
              ),
              if (item['orderCode'] != null) ...[
                const SizedBox(height: 4),
                Text(
                  'Đơn hàng: ${item['orderCode']}',
                  style: const TextStyle(color: Colors.black54),
                ),
              ],
              const SizedBox(height: 8),
              const Text(
                'Chạm để xem hội thoại và phản hồi',
                style: TextStyle(fontSize: 12, color: Colors.black45),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TicketDetailSheet extends StatefulWidget {
  const _TicketDetailSheet({required this.ticketId, required this.onUpdated});

  final String ticketId;
  final VoidCallback onUpdated;

  @override
  State<_TicketDetailSheet> createState() => _TicketDetailSheetState();
}

class _TicketDetailSheetState extends State<_TicketDetailSheet> {
  final _messageController = TextEditingController();
  bool _loading = true;
  bool _sending = false;
  String? _error;
  Map<String, dynamic> _ticket = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await ApiClient.get(
        '/api/staff/support/tickets/${Uri.encodeComponent(widget.ticketId)}',
      );
      final data = unwrapResponse(response);
      if (data is! Map) {
        throw const ApiException('Ticket trả về dữ liệu không hợp lệ.');
      }
      if (mounted) setState(() => _ticket = Map<String, dynamic>.from(data));
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ApiClient.post(
        '/api/staff/support/tickets/${Uri.encodeComponent(widget.ticketId)}/messages',
        body: {'message': message},
      );
      _messageController.clear();
      await _load();
      widget.onUpdated();
    } on ApiException catch (error) {
      if (mounted) _showMessage(context, error.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _changeStatus(String status) async {
    try {
      await ApiClient.patch(
        '/api/staff/support/tickets/${Uri.encodeComponent(widget.ticketId)}/status',
        body: {'status': status},
      );
      await _load();
      widget.onUpdated();
    } on ApiException catch (error) {
      if (mounted) _showMessage(context, error.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final messages = _ticket['messages'] is List
        ? (_ticket['messages'] as List).whereType<Map>().toList()
        : const <Map>[];
    return Padding(
      padding: EdgeInsets.only(
        left: 18,
        right: 18,
        top: 12,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 18,
      ),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.8,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.black26,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _ticket['subject']?.toString() ?? 'Chi tiết ticket',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Expanded(child: Center(child: CircularProgressIndicator()))
            else if (_error != null)
              Expanded(
                child: _ErrorState(message: _error!, onRetry: _load),
              )
            else ...[
              Wrap(
                spacing: 8,
                children: [
                  OutlinedButton(
                    onPressed: () => _changeStatus('IN_PROGRESS'),
                    child: const Text('Đang xử lý'),
                  ),
                  FilledButton.tonal(
                    onPressed: () => _changeStatus('RESOLVED'),
                    child: const Text('Đã giải quyết'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Expanded(
                child: messages.isEmpty
                    ? const Center(
                        child: Text('Chưa có tin nhắn trong hội thoại.'),
                      )
                    : ListView.builder(
                        itemCount: messages.length,
                        itemBuilder: (context, index) {
                          final message = Map<String, dynamic>.from(
                            messages[index],
                          );
                          final isStaff =
                              message['senderType']?.toString() == 'STAFF';
                          return Align(
                            alignment: isStaff
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              constraints: const BoxConstraints(maxWidth: 300),
                              margin: const EdgeInsets.only(bottom: 9),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isStaff
                                    ? const Color(0xFFE5F0E7)
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    message['senderName']?.toString() ??
                                        (isStaff ? 'Nhân viên' : 'Khách hàng'),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Colors.black54,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(message['message']?.toString() ?? ''),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      minLines: 1,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: 'Nhập phản hồi...',
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _sendMessage,
                    icon: _sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _OrderLookupScreen extends StatefulWidget {
  const _OrderLookupScreen();

  @override
  State<_OrderLookupScreen> createState() => _OrderLookupScreenState();
}

class _OrderLookupScreenState extends State<_OrderLookupScreen> {
  final _queryController = TextEditingController();
  String _searchType = 'ORDER_CODE';
  bool _loading = false;
  Map<String, dynamic>? _result;
  String? _error;

  @override
  void dispose() {
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _lookup() async {
    final query = _queryController.text.trim();
    if (query.isEmpty) {
      setState(() => _error = 'Vui lòng nhập thông tin cần tra cứu.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });
    try {
      final response = await ApiClient.post(
        '/api/staff/cskh/orders/lookup',
        body: {'searchType': _searchType, 'query': query},
      );
      final data = unwrapResponse(response);
      if (data is! Map) {
        throw const ApiException('Thông tin đơn hàng trả về không hợp lệ.');
      }
      if (mounted) setState(() => _result = Map<String, dynamic>.from(data));
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tra cứu đơn hàng')),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const Text(
            'Chỉ nhập mã đơn hàng hoặc số điện thoại khách hàng theo quy trình CSKH.',
            style: TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _searchType,
            decoration: const InputDecoration(labelText: 'Loại tra cứu'),
            items: const [
              DropdownMenuItem(value: 'ORDER_CODE', child: Text('Mã đơn hàng')),
              DropdownMenuItem(value: 'PHONE', child: Text('Số điện thoại')),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _searchType = value);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _queryController,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => _lookup(),
            decoration: const InputDecoration(
              labelText: 'Từ khóa',
              prefixIcon: Icon(Icons.search_rounded),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _loading ? null : _lookup,
            icon: const Icon(Icons.manage_search_rounded),
            label: Text(_loading ? 'Đang tra cứu...' : 'Tra cứu'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            _ErrorBanner(message: _error!),
          ],
          if (_result != null) ...[
            const SizedBox(height: 22),
            Text(
              'Kết quả',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            _RecordCard(item: _result!),
            if (_result!['items'] is List) ...[
              const SizedBox(height: 12),
              ...(_result!['items'] as List).whereType<Map>().map(
                (item) => _RecordCard(item: Map<String, dynamic>.from(item)),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final label = switch (status) {
      'OPEN' => 'Mới',
      'IN_PROGRESS' => 'Đang xử lý',
      'ESCALATED' => 'Chuyển cấp',
      'RESOLVED' => 'Đã giải quyết',
      'CLOSED' => 'Đã đóng',
      _ => status.replaceAll('_', ' '),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: status == 'RESOLVED' || status == 'CLOSED'
            ? const Color(0xFFE7F4E9)
            : const Color(0xFFFFF2D9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_outlined,
              size: 42,
              color: Colors.black45,
            ),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFECEB),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(message, style: const TextStyle(color: Color(0xFF8D2923))),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inbox_outlined, size: 44, color: Colors.black38),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

String _humanizeKey(String value) {
  final spaced = value.replaceAllMapped(
    RegExp(r'([a-z])([A-Z])'),
    (match) => '${match[1]} ${match[2]}',
  );
  return spaced.replaceAll('_', ' ').toUpperCaseFirst();
}

String _displayValue(Object? value) {
  if (value == null) return '—';
  if (value is bool) return value ? 'Có' : 'Không';
  if (value is Map || value is List) return '—';
  return value.toString();
}

void _showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

extension _StringCapitalization on String {
  String toUpperCaseFirst() =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';
}

extension _IterableFirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}
