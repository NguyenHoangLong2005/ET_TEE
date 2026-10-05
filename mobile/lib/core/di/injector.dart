import 'package:get_it/get_it.dart';

import '../../data/datasources/remote/sales_remote_datasource.dart';
import '../../data/datasources/remote/shipping_remote_datasource.dart';
import '../../data/datasources/remote/warehouse_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/sales_repository_impl.dart';
import '../../data/repositories/shipping_repository_impl.dart';
import '../../data/repositories/warehouse_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/sales_repository.dart';
import '../../domain/repositories/shipping_repository.dart';
import '../../domain/repositories/warehouse_repository.dart';
import '../network/api_client.dart';
import '../network/interceptors/auth_interceptor.dart';
import '../../presentation/sales/controllers/sales_controller.dart';
import '../../presentation/shipping/controllers/shipping_controller.dart';
import '../../presentation/warehouse/controllers/warehouse_controller.dart';
import '../storage/token_storage.dart';

final sl = GetIt.instance;

Future<void> setupDependencies() async {
  // Core
  final tokens = TokenStorage();
  sl.registerSingleton<TokenStorage>(tokens);

  final dio = ApiClient.createDio()..interceptors.add(AuthInterceptor(tokens));
  sl.registerLazySingleton<ApiClient>(() => ApiClient(dio));

  // Repositories
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(sl<ApiClient>(), tokens),
  );
  sl.registerLazySingleton<SalesRepository>(
    () => SalesRepositoryImpl(SalesRemoteDataSource(sl<ApiClient>())),
  );
  sl.registerLazySingleton<WarehouseRepository>(
    () => WarehouseRepositoryImpl(WarehouseRemoteDataSource(sl<ApiClient>())),
  );
  sl.registerLazySingleton<ShippingRepository>(
    () => ShippingRepositoryImpl(ShippingRemoteDataSource(sl<ApiClient>())),
  );

  // Controller: tao moi theo role de tranh tranh cho cung mot danh sach don.
  sl.registerFactory<SalesController>(() => SalesController(sl()));
  sl.registerFactory<WarehouseController>(() => WarehouseController(sl()));
  sl.registerFactory<ShippingController>(() => ShippingController(sl()));
}