import 'dart:async';

import 'package:brics_mobile/core/config/app_config.dart';
import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/storage/key_value_store.dart';
import 'package:brics_mobile/core/sync/connectivity.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';

import 'fake_api.dart';

class FakeConnectivity implements ConnectivityWatcher {
  bool online = true;
  final _changes = StreamController<bool>.broadcast();

  void set({required bool online}) {
    this.online = online;
    _changes.add(online);
  }

  @override
  Future<bool> check() async => online;

  @override
  Stream<bool> watch() => _changes.stream;
}

/// One phone: an in-memory database, keychain, clock and network, and a fake
/// backend behind dio.
class TestEnv {
  TestEnv() {
    driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
  }

  final api = FakeApi();
  final store = MemoryKeyValueStore();
  final db = AppDatabase(NativeDatabase.memory());
  final connectivity = FakeConnectivity();
  DateTime now = DateTime(2026, 10, 22, 9);

  List<Override> get overrides => [
    databaseProvider.overrideWithValue(db),
    keyValueStoreProvider.overrideWithValue(store),
    clockProvider.overrideWithValue(() => now),
    appConfigProvider.overrideWithValue(const AppConfig(apiBaseUrl: 'http://api.test')),
    httpAdapterProvider.overrideWithValue(api),
    connectivityWatcherProvider.overrideWithValue(connectivity),
  ];

  ProviderContainer container() {
    final c = ProviderContainer(overrides: overrides, retry: (_, _) => null);
    return c;
  }

  /// Not awaited: a widget test that failed before unmounting still holds
  /// Drift streams open, and awaiting the close would stall the whole run.
  Future<void> dispose() async => unawaited(db.close());
}

const companyId = '00000000-0000-4000-8000-0000000000c1';
const kilnA = '00000000-0000-4000-8000-00000000000a';
const kilnB = '00000000-0000-4000-8000-00000000000b';

/// What `/auth/login` returns for a user with [permissions] at [sites].
Map<String, dynamic> loginResponse({
  String userId = '00000000-0000-4000-8000-000000000001',
  String name = 'Ramesh',
  String roleCode = 'supervisor',
  List<String> permissions = const [],
  List<String> sites = const [kilnA],
}) {
  return {
    'accessToken': 'access-$userId',
    'refreshToken': 'refresh-$userId',
    'user': {
      'id': userId,
      'email': null,
      'mobile': '9800000001',
      'name': name,
      'roleCode': roleCode,
      'permissions': permissions,
      'isSuperAdmin': false,
    },
    'company': {
      'id': companyId,
      'name': 'Shree Bricks',
      'gstin': null,
      'stateCode': '09',
      'gstScheme': 'regular_12_itc',
    },
    'sites': [
      for (final id in sites)
        {
          'id': id,
          'name': id == kilnA ? 'Kiln A' : 'Kiln B',
          'code': id == kilnA ? 'KA' : 'KB',
          'type': 'kiln',
        },
    ],
  };
}

/// Wraps a create handler the way `IdempotencyService.runOnce` does: the same
/// key replays the stored response; [created] counts real inserts.
class IdempotentCreate {
  IdempotentCreate(this._create);

  final Object? Function(RecordedRequest request) _create;
  final Map<String, FakeResponse> _seen = {};
  int created = 0;

  FakeResponse call(RecordedRequest request) {
    final key = request.header('Idempotency-Key');
    if (key != null && _seen.containsKey(key)) return _seen[key]!;
    created++;
    final response = FakeResponse.ok(_create(request), status: 201);
    if (key != null) _seen[key] = response;
    return response;
  }
}
