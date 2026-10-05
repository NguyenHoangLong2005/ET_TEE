class AppConfig {
  AppConfig._();

  /// Override khi chay app:
  ///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8081   (emulator)
  ///   flutter run --dart-define=API_BASE_URL=http://localhost:8081 (adb reverse / iOS)
  static const String _kBaseUrl = 'API_BASE_URL';

  static late String apiBaseUrl;
  static late bool isMock;

  static Future<void> load() async {
    apiBaseUrl = const String.fromEnvironment(
      _kBaseUrl,
      defaultValue: 'http://10.0.2.2:8081',
    );
    isMock = const bool.fromEnvironment('USE_MOCK', defaultValue: false);
  }

  static String get authBase => '$apiBaseUrl/api/auth';
  static String get salesBase => '$apiBaseUrl/api/staff/sales';
  static String get warehouseBase => '$apiBaseUrl/api/staff/warehouse';
  static String get shippingBase => '$apiBaseUrl/api/staff/shipping';
}