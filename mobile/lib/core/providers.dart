import 'dart:async';

import 'package:brics_mobile/core/config/app_config.dart';
import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/network/auth_interceptor.dart';
import 'package:brics_mobile/core/storage/key_value_store.dart';
import 'package:brics_mobile/core/storage/token_store.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Overridden in tests; everything else in the app is built from these.
final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment());

final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

final keyValueStoreProvider = Provider<KeyValueStore>((ref) => SecureKeyValueStore());

final tokenStoreProvider = Provider<TokenStore>(
  (ref) => TokenStore(ref.watch(keyValueStoreProvider)),
);

final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase.open();
  ref.onDispose(db.close);
  return db;
});

/// Fires when the server refuses the refresh token — the session is over.
final sessionExpiredProvider = Provider<StreamController<void>>((ref) {
  final controller = StreamController<void>.broadcast();
  ref.onDispose(controller.close);
  return controller;
});

BaseOptions _options(AppConfig config) => BaseOptions(
  baseUrl: config.apiBaseUrl,
  connectTimeout: const Duration(seconds: 15),
  sendTimeout: const Duration(seconds: 30),
  receiveTimeout: const Duration(seconds: 30),
  contentType: Headers.jsonContentType,
);

/// Replaced in tests by an in-memory backend; null uses dio's real HTTP client.
final httpAdapterProvider = Provider<HttpClientAdapter?>((ref) => null);

final dioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final adapter = ref.watch(httpAdapterProvider);
  final dio = Dio(_options(config));
  final refreshDio = Dio(_options(config));
  if (adapter != null) {
    dio.httpClientAdapter = adapter;
    refreshDio.httpClientAdapter = adapter;
  }
  dio.interceptors.add(
    AuthInterceptor(
      dio: dio,
      refreshDio: refreshDio,
      tokens: ref.watch(tokenStoreProvider),
      onSessionExpired: () => ref.read(sessionExpiredProvider).add(null),
    ),
  );
  ref.onDispose(dio.close);
  return dio;
});

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.watch(dioProvider)));
