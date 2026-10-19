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
      if (auth.isLoading) return path == '/splash' ? null : '/splash';
      final user = auth.user;
      if (path == '/splash') return user == null ? '/' : homeForRole(user.role);

      if (user != null) {
        // Temporary password: nothing else works until it is changed.
        if (auth.passwordChangeRequired) {
          final target = passwordChangePath(user.role);
          return path == target ? null : target;
        }
        if (path == '/auth/login' || path == '/auth/register') return homeForRole(user.role);
        if (user.isStaff) {
          // Staff have no cart / account of a shopper (web proxy.ts); they stay in their workspace.
          if (path == '/staff/change-password') return null;
          if (user.isMarketing) return path.startsWith('/staff/marketing') ? null : '/staff/marketing';
          return path == '/staff/unsupported' ? null : '/staff/unsupported';
        }
      }

      if (path.startsWith('/staff')) return '/auth/login';
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
