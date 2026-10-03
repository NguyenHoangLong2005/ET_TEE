import 'package:get_it/get_it.dart';

import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import '../network/api_client.dart';
import '../network/interceptors/auth_interceptor.dart';
import '../storage/token_storage.dart';

final sl = GetIt.instance;

Future<void> setupDependencies() async {
  // Core
  sl.registerLazySingleton(() => TokenStorage());
  final tokens = sl<TokenStorage>();
  final dio = ApiClient.createDio()..interceptors.add(AuthInterceptor(tokens));
  sl.registerLazySingleton(() => ApiClient(dio, tokens));

  // Repositories
  sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl()));
}