import 'package:flutter/material.dart';
<<<<<<< HEAD

import 'app.dart';
import 'core/config/app_config.dart';
import 'core/di/injector.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.load();
  await setupDependencies();
  runApp(const EtteeStaffApp());
}
=======
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/storage.dart';
import 'core/theme.dart';
import 'router.dart';
import 'state/auth_provider.dart';
import 'state/cart_provider.dart';
import 'state/wishlist_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppStorage.instance.init();
  runApp(const EtteeApp());
}

class EtteeApp extends StatefulWidget {
  const EtteeApp({super.key});

  @override
  State<EtteeApp> createState() => _EtteeAppState();
}

class _EtteeAppState extends State<EtteeApp> {
  final _auth = AuthProvider();
  final _cart = CartProvider();
  final _wishlist = WishlistProvider();
  late final GoRouter _router = buildRouter(_auth);
  String? _lastUserKey;

  @override
  void initState() {
    super.initState();
    _auth.addListener(_onAuthChanged);
    _auth.init();
  }

  /// Like the web CartContext / WishlistContext: refetch whenever the signed-in user changes;
  /// staff have no cart or wishlist, so nothing is requested for them.
  void _onAuthChanged() {
    if (_auth.isLoading) return;
    final user = _auth.user;
    final key = user?.id ?? 'guest';
    if (key == _lastUserKey) return;
    _lastUserKey = key;
    if (user != null && user.isStaff) {
      _cart.clearLocal();
      _wishlist.clearLocal();
      return;
    }
    _cart.fetch();
    _wishlist.fetchAll();
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider.value(value: _cart),
        ChangeNotifierProvider.value(value: _wishlist),
      ],
      child: MaterialApp.router(
        title: 'ET.TEE',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        routerConfig: _router,
        locale: const Locale('vi', 'VN'),
        supportedLocales: const [Locale('vi', 'VN'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
      ),
    );
  }
}
>>>>>>> main
