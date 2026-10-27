import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'core/toast.dart';
import 'screens/account/account_screens.dart';
import 'screens/account/tickets_screen.dart';
import 'screens/auth/auth_screens.dart';
import 'screens/customer/cart_screen.dart';
import 'screens/customer/checkout_screen.dart';
import 'screens/customer/home_screen.dart';
import 'screens/customer/info_screens.dart';
import 'screens/customer/misc_screens.dart';
import 'screens/customer/order_success_screen.dart';
import 'screens/customer/product_detail_screen.dart';
import 'screens/customer/products_screen.dart';
import 'screens/staff/content_screens.dart';
import 'screens/staff/dashboard_analytics.dart';
import 'screens/staff/homepage_editor.dart';
import 'screens/staff/marketing_shell.dart';
import 'screens/staff/admin_extra_screens.dart';
import 'screens/staff/cskh_screens.dart';
import 'screens/staff/owner_admin_screens.dart';
import 'screens/staff/owner_extra_screens.dart';
import 'screens/staff/owner_product_screens.dart';
import 'screens/staff/staff_profile_screen.dart';
import 'screens/staff/sales_screens.dart';
import 'screens/staff/shipping_screens.dart';
import 'screens/staff/warehouse_screens.dart';
import 'state/auth_provider.dart';
import 'widgets/common.dart';

/// Same paths as the web app, so banner / marketing links ("/products?status=sale") work as-is.
GoRouter buildRouter(AuthProvider auth) {
  return GoRouter(
    navigatorKey: Toast.navigatorKey,
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final path = state.uri.path;
      // Remember where the app was opened (deep link, page reload) and go there once auth is known.
      if (auth.isLoading) {
        return path == '/splash' ? null : '/splash?from=${Uri.encodeComponent(state.uri.toString())}';
      }
      final user = auth.user;
      if (path == '/splash') {
        final from = state.uri.queryParameters['from'];
        if (from != null && from.startsWith('/') && !from.startsWith('/splash')) return from;
        return user == null ? '/' : homeForRole(user.role);
      }

      if (user != null) {
        // Temporary password: nothing else works until it is changed.
        if (auth.passwordChangeRequired) {
          final target = passwordChangePath(user.role);
          return path == target ? null : target;
        }
        if (path == '/auth/login' || path == '/auth/register') return homeForRole(user.role);
        if (user.isStaff) {
          // Staff have no cart / account of a shopper (web proxy.ts); they stay in their workspace.
          return staffMayOpen(user.role, path) ? null : homeForRole(user.role);
        }
      }

      if (path.startsWith('/staff') || path.startsWith('/owner') || path.startsWith('/admin')) return '/auth/login';
      if (user == null && path.startsWith('/account')) {
        return '/auth/login?redirect=${Uri.encodeComponent(state.uri.toString())}';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const _Splash()),
      GoRoute(path: '/', builder: (_, _) => const HomeScreen()),
      GoRoute(
        path: '/products',
        builder: (_, s) => ProductsScreen(key: ValueKey(s.uri.toString()), initialParams: s.uri.queryParameters),
      ),
      GoRoute(
        path: '/products/:slug',
        builder: (_, s) => ProductDetailScreen(key: ValueKey(s.pathParameters['slug']), slug: s.pathParameters['slug']!, color: s.uri.queryParameters['color']),
      ),
      GoRoute(path: '/search', builder: (_, s) => SearchScreen(initialQuery: s.uri.queryParameters['q'] ?? '')),
      GoRoute(path: '/wishlist', builder: (_, _) => const WishlistScreen()),
      GoRoute(path: '/cart', builder: (_, _) => const CartScreen()),
      GoRoute(path: '/checkout', builder: (_, _) => const CheckoutScreen()),
      GoRoute(path: '/order-success/:code', builder: (_, s) => OrderSuccessScreen(orderCode: s.pathParameters['code']!)),
      GoRoute(path: '/size-guide', builder: (_, _) => const SizeGuideScreen()),
      GoRoute(path: '/style-quiz', builder: (_, _) => const StyleQuizScreen()),
      GoRoute(path: '/stores', builder: (_, _) => const StoresScreen()),
      GoRoute(path: '/about', builder: (_, _) => const AboutScreen()),
      GoRoute(path: '/faq', builder: (_, _) => const FaqScreen()),
      GoRoute(path: '/contact', builder: (_, _) => const ContactScreen()),
      GoRoute(path: '/careers', builder: (_, _) => const CareersScreen()),
      GoRoute(path: '/policy', builder: (_, _) => const PolicyScreen()),
      GoRoute(path: '/policy/:kind', builder: (_, s) => PolicyDetailScreen(kind: s.pathParameters['kind']!)),
      GoRoute(path: '/privacy', builder: (_, _) => const PrivacyScreen()),
      GoRoute(path: '/terms', builder: (_, _) => const TermsScreen()),
      GoRoute(path: '/unsubscribe', builder: (_, s) => UnsubscribeScreen(token: s.uri.queryParameters['token'] ?? '')),
      GoRoute(path: '/news', builder: (_, _) => const NewsScreen()),
      GoRoute(path: '/news/:slug', builder: (_, s) => NewsDetailScreen(slug: s.pathParameters['slug']!)),
      GoRoute(path: '/auth/login', builder: (_, s) => LoginScreen(redirect: s.uri.queryParameters['redirect'])),
      GoRoute(path: '/login', redirect: (_, _) => '/auth/login'),
      GoRoute(path: '/auth/register', builder: (_, _) => const RegisterScreen()),
      GoRoute(path: '/auth/verify-email', builder: (_, s) => VerifyEmailScreen(email: s.uri.queryParameters['email'] ?? '')),
      GoRoute(path: '/auth/forgot-password', builder: (_, _) => const ForgotPasswordScreen()),
      GoRoute(path: '/auth/reset-password', builder: (_, s) => ResetPasswordScreen(email: s.uri.queryParameters['email'] ?? '')),
      GoRoute(path: '/account', builder: (_, _) => const AccountHomeScreen()),
      GoRoute(path: '/account/profile', builder: (_, _) => const ProfileScreen()),
      GoRoute(path: '/account/measurements', builder: (_, _) => const MeasurementsScreen()),
      GoRoute(path: '/account/orders', builder: (_, _) => const OrdersScreen()),
      GoRoute(path: '/account/orders/:code', builder: (_, s) => OrderDetailScreen(orderCode: s.pathParameters['code']!)),
      GoRoute(path: '/account/vouchers', builder: (_, _) => const MyVouchersScreen()),
      GoRoute(path: '/account/change-password', builder: (_, _) => const ChangePasswordScreen()),
      GoRoute(path: '/account/reviews', builder: (_, _) => const MyReviewsScreen()),
      GoRoute(path: '/account/tickets', builder: (_, _) => const TicketsScreen()),
      GoRoute(path: '/staff/marketing', builder: (_, _) => const MarketingDashboardScreen()),
      GoRoute(path: '/staff/marketing/homepage', builder: (_, _) => const HomepageEditorScreen()),
      GoRoute(path: '/staff/marketing/posts', builder: (_, _) => const PostsScreen()),
      GoRoute(path: '/staff/marketing/vouchers', builder: (_, _) => const StaffVouchersScreen()),
      GoRoute(path: '/staff/marketing/email', builder: (_, _) => const EmailCampaignsScreen()),
      GoRoute(path: '/staff/marketing/analytics', builder: (_, _) => const MarketingAnalyticsScreen()),
      GoRoute(path: '/staff/warehouse', builder: (_, _) => const WarehouseDashboardScreen()),
      GoRoute(
        path: '/staff/warehouse/fulfillment',
        builder: (_, s) => FulfillmentScreen(key: ValueKey(s.uri.toString()), initialTab: s.uri.queryParameters['tab'] ?? 'CONFIRMED'),
      ),
      GoRoute(path: '/staff/warehouse/inventory', builder: (_, _) => const InventoryScreen()),
      GoRoute(
        path: '/staff/warehouse/receiving',
        builder: (_, s) => ReceivingScreen(
          key: ValueKey(s.uri.toString()),
          productId: int.tryParse(s.uri.queryParameters['productId'] ?? ''),
          quantity: int.tryParse(s.uri.queryParameters['qty'] ?? ''),
        ),
      ),
      GoRoute(path: '/staff/warehouse/replenishment', builder: (_, _) => const ReplenishmentScreen()),
      GoRoute(path: '/staff/shipping', builder: (_, _) => const ShippingDashboardScreen()),
      GoRoute(path: '/staff/shipping/orders', builder: (_, _) => const ShippingOrdersScreen()),
      GoRoute(
        path: '/staff/shipping/shipments',
        builder: (_, s) => ShipmentsScreen(key: ValueKey(s.uri.toString()), initialStatus: s.uri.queryParameters['status'] ?? 'ACTIVE'),
      ),
      GoRoute(path: '/staff/shipping/exceptions', builder: (_, _) => const ShippingExceptionsScreen()),
      GoRoute(path: '/staff/shipping/cod', builder: (_, _) => const CodScreen()),
      GoRoute(path: '/staff/sales', builder: (_, _) => const SalesDashboardScreen()),
      GoRoute(
        path: '/staff/sales/orders',
        builder: (_, s) => SalesOrdersScreen(key: ValueKey(s.uri.toString()), initialFilter: s.uri.queryParameters['filter'] ?? 'all'),
      ),
      GoRoute(path: '/staff/sales/orders/new', builder: (_, _) => const SalesCreateOrderScreen()),
      GoRoute(path: '/staff/sales/orders/:id', builder: (_, s) => SalesOrderDetailScreen(id: int.parse(s.pathParameters['id']!))),
      GoRoute(path: '/staff/cskh', builder: (_, _) => const CskhTicketsScreen()),
      GoRoute(path: '/staff/cskh/tickets/:id', builder: (_, s) => CskhTicketDetailScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/staff/cskh/reviews', builder: (_, _) => const CskhReviewsScreen()),
      GoRoute(path: '/owner', builder: (_, _) => const OwnerDashboardScreen()),
      GoRoute(path: '/owner/approvals', builder: (_, _) => const OwnerApprovalsScreen()),
      GoRoute(path: '/owner/orders', builder: (_, _) => const OwnerOrdersScreen()),
      GoRoute(path: '/owner/products', builder: (_, _) => const OwnerProductsScreen()),
      GoRoute(path: '/owner/products/new', builder: (_, _) => const OwnerProductFormScreen()),
      GoRoute(path: '/owner/products/import', builder: (_, _) => const OwnerProductImportScreen()),
      GoRoute(
        path: '/owner/products/:id/edit',
        builder: (_, s) => OwnerProductFormScreen(productId: int.tryParse(s.pathParameters['id']!)),
      ),
      GoRoute(path: '/owner/staff', builder: (_, _) => const UsersScreen(admin: false)),
      GoRoute(path: '/owner/staff/evaluations', builder: (_, _) => const StaffEvaluationsScreen()),
      GoRoute(path: '/owner/inventory', builder: (_, _) => const InventoryScreen(ownerMode: true)),
      GoRoute(
        path: '/owner/inventory/receiving',
        builder: (_, s) => ReceivingScreen(
          key: ValueKey(s.uri.toString()),
          shellPath: '/owner/inventory',
          productId: int.tryParse(s.uri.queryParameters['productId'] ?? ''),
        ),
      ),
      GoRoute(path: '/owner/promotions', builder: (_, _) => const StaffVouchersScreen(shellPath: '/owner/promotions')),
      GoRoute(path: '/owner/categories', builder: (_, _) => const OwnerCategoriesScreen()),
      GoRoute(path: '/owner/manufacturers', builder: (_, _) => const ManufacturersScreen()),
      GoRoute(path: '/owner/suppliers', builder: (_, _) => const SuppliersScreen()),
      GoRoute(path: '/owner/shifts', builder: (_, _) => const ShiftsScreen()),
      GoRoute(path: '/owner/logs', builder: (_, _) => const OwnerLogsScreen()),
      GoRoute(path: '/admin', builder: (_, _) => const AdminDashboardScreen()),
      GoRoute(path: '/admin/users', builder: (_, _) => const UsersScreen(admin: true)),
      GoRoute(path: '/admin/audit-logs', builder: (_, _) => const AuditLogsScreen()),
      GoRoute(path: '/admin/rbac', builder: (_, _) => const RbacScreen()),
      GoRoute(path: '/admin/shops', builder: (_, _) => const ShopsScreen()),
      GoRoute(path: '/admin/categories', builder: (_, _) => const AdminCategoriesScreen()),
      GoRoute(path: '/admin/ai-models', builder: (_, _) => const AiModelsScreen()),
      GoRoute(path: '/admin/feature-flags', builder: (_, _) => const FeatureFlagsScreen()),
      GoRoute(path: '/admin/mailing', builder: (_, _) => const MailingLogsScreen()),
      GoRoute(path: '/admin/logs', builder: (_, _) => const ServerLogsScreen()),
      GoRoute(path: '/admin/backup', builder: (_, _) => const BackupScreen()),
      GoRoute(path: '/staff/profile', builder: (_, _) => const StaffProfileScreen()),
      GoRoute(path: '/staff/change-password', builder: (_, _) => const ChangePasswordScreen()),
      GoRoute(path: '/staff/unsupported', builder: (_, _) => const UnsupportedRoleScreen()),
      // Web paths of the marketing workspace
      GoRoute(path: '/staff/dashboard/marketing', redirect: (_, _) => '/staff/marketing'),
      GoRoute(path: '/staff/dashboard/marketing/:page', redirect: (_, s) => '/staff/marketing/${s.pathParameters['page']}'),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: EmptyPanel(
          icon: Icons.explore_off_outlined,
          title: 'Không tìm thấy trang',
          message: state.uri.toString(),
          action: PillButton('Về trang chủ', onPressed: () => context.go('/')),
        ),
      ),
    ),
  );
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            ClipOval(child: Image.asset('assets/images/logo.jpg', width: 72, height: 72, fit: BoxFit.cover)),
            const SizedBox(height: 16),
            const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
          ]),
        ),
      );
}
