import 'dart:convert';

import 'package:brics_mobile/app.dart';
import 'package:brics_mobile/core/storage/token_store.dart';
import 'package:brics_mobile/features/auth/domain/session.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_api.dart';
import 'test_env.dart';

/// Puts a signed-in session on the "phone" as if the person signed in earlier.
Future<void> seedSession(
  TestEnv env, {
  List<String> permissions = const [],
  String? siteId = kilnA,
  List<String> sites = const [kilnA],
}) async {
  final login = loginResponse(permissions: permissions, sites: sites);
  await TokenStore(env.store).write(const AuthTokens(accessToken: 'a', refreshToken: 'r'));
  final session = Session.fromJson(login);
  await env.store.write('auth.session', jsonEncode(session.toJson()));
  if (siteId != null) await env.db.writeState('site.selected', siteId);
  await env.db.writeState('session.userId', session.user.id);
  await env.db.writeState('app.installed', '1');
  stubEmptyLists(env);
}

/// Every list the app pulls answers empty unless a test says otherwise.
void stubEmptyLists(TestEnv env) {
  for (final path in [
    '/sites',
    '/parties',
    '/inventory/units',
    '/inventory/items',
    '/inventory/brick-types',
    '/inventory/warehouses',
    '/labour/groups',
    '/labour/workers',
    '/transport/vehicles',
    '/transport/drivers',
    '/production/batches',
    '/dispatches',
  ]) {
    env.api.on(
      'GET',
      path,
      (_) => FakeResponse.ok(<Object>[], meta: {'page': 1, 'limit': 100, 'total': 0}),
    );
  }
}

extension PumpBrics on WidgetTester {
  /// The whole app — router, session, sync engine — on a fake phone.
  Future<void> pumpBrics(TestEnv env) async {
    // A tall phone, so long forms fit without scrolling the target into view.
    view
      ..physicalSize = const Size(1200, 4200)
      ..devicePixelRatio = 3;
    addTearDown(view.reset);
    await pumpWidget(
      ProviderScope(overrides: env.overrides, retry: (_, _) => null, child: const BricsApp()),
    );
    await pumpAndSettle();
  }
}

/// Lets async work finish between frames: real time for Drift's streams, fake
/// time for dio's timeouts and the widgets' own timers.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 20)));
    await tester.pump(const Duration(milliseconds: 50));
  }
}
