import 'package:flutter/material.dart';

import 'screens/dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EtTeeApp());
}

class EtTeeApp extends StatelessWidget {
  const EtTeeApp({super.key});

  @override
  Widget build(BuildContext context) {
    const color = Color(0xFF3E5F4B);
    return MaterialApp(
      title: 'ET.TEE Quản trị',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: color),
        scaffoldBackgroundColor: const Color(0xFFF6F7F4),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFF6F7F4),
          foregroundColor: Color(0xFF18231C),
          elevation: 0,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFFE8ECE7)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE0E6E0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE0E6E0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: color, width: 1.5),
          ),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final Future<UserSession?> _restoreSession =
      AuthService.restoreSession();
  UserSession? _activeSession;
  bool _hasSessionOverride = false;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserSession?>(
      future: _restoreSession,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        final session = _hasSessionOverride ? _activeSession : snapshot.data;
        if (session == null) {
          return LoginScreen(onLogin: _onLogin);
        }
        return DashboardScreen(session: session, onLogout: _onLogout);
      },
    );
  }

  void _onLogin(UserSession session) {
    setState(() {
      _hasSessionOverride = true;
      _activeSession = session;
    });
  }

  Future<void> _onLogout() async {
    await AuthService.logout();
    if (mounted) {
      setState(() {
        _hasSessionOverride = true;
        _activeSession = null;
      });
    }
  }
}
