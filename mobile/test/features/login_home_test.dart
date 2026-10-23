import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/app_harness.dart';
import '../helpers/fake_api.dart';
import '../helpers/pump_app.dart';
import '../helpers/test_env.dart';

void main() {
  late TestEnv env;

  setUp(() => env = TestEnv());
  tearDown(() => env.dispose());

  testWidgets('a suspended company is told who to contact, not "wrong password"', (tester) async {
    env.api.on(
      'POST',
      '/auth/login',
      (_) => FakeResponse.error(401, 'UNAUTHORIZED', suspendedTenantMessage),
    );
    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);

    await tester.enterText(find.byType(TextFormField).at(0), '9800000001');
    await tester.enterText(find.byType(TextFormField).at(1), 'secret1');
    await tester.tap(find.text('Sign in').last);
    await settle(tester);

    expect(find.text('Company access is on hold'), findsOneWidget);
    expect(find.text(suspendedTenantMessage), findsOneWidget);
    await tester.disposeApp();
  });

  testWidgets('no signal at sign-in says so', (tester) async {
    env.api.offline = true;
    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);

    await tester.enterText(find.byType(TextFormField).at(0), '9800000001');
    await tester.enterText(find.byType(TextFormField).at(1), 'secret1');
    await tester.tap(find.text('Sign in').last);
    await settle(tester);

    expect(find.textContaining('Signing in needs the network'), findsWidgets);
    await tester.disposeApp();
  });

  testWidgets('signing in with two kilns asks which one, then opens home', (tester) async {
    stubEmptyLists(env);
    env.api.on('POST', '/auth/login', (_) => FakeResponse.ok(loginResponse(sites: [kilnA, kilnB])));
    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);

    await tester.enterText(find.byType(TextFormField).at(0), '9800000001');
    await tester.enterText(find.byType(TextFormField).at(1), 'secret1');
    await tester.tap(find.text('Sign in').last);
    await settle(tester);

    expect(find.text('Choose your kiln'), findsOneWidget);
    await tester.tap(find.text('Kiln B'));
    await settle(tester);
    expect(find.textContaining('Ramesh'), findsOneWidget);
    expect(find.text('Kiln B'), findsOneWidget);
    await tester.disposeApp();
  });

  group('home shows only what the role may do (MOB-01)', () {
    testWidgets('supervisor: production and dispatch', (tester) async {
      await seedSession(
        env,
        permissions: [
          Permissions.productionManage,
          Permissions.dispatchManage,
          Permissions.dispatchAcknowledge,
        ],
      );
      await tester.runAsync(() => tester.pumpBrics(env));
      await settle(tester);

      expect(find.text('Production'), findsOneWidget);
      expect(find.text('Dispatch'), findsOneWidget);
      expect(find.text('Attendance'), findsNothing);
      expect(find.text('Goods receipt'), findsNothing);
      await tester.disposeApp();
    });

    testWidgets('store keeper: goods receipt and dispatch', (tester) async {
      await seedSession(
        env,
        permissions: [Permissions.purchasesManage, Permissions.dispatchManage],
      );
      await tester.runAsync(() => tester.pumpBrics(env));
      await settle(tester);

      expect(find.text('Goods receipt'), findsOneWidget);
      expect(find.text('Dispatch'), findsOneWidget);
      expect(find.text('Production'), findsNothing);
      await tester.disposeApp();
    });

    testWidgets('a role with no field task is told so', (tester) async {
      await seedSession(env);
      await tester.runAsync(() => tester.pumpBrics(env));
      await settle(tester);

      expect(find.textContaining('nothing to enter from the app'), findsOneWidget);
      await tester.disposeApp();
    });
  });

  testWidgets('the badge says offline, and the sync screen says why', (tester) async {
    env.connectivity.online = false;
    await seedSession(env, permissions: [Permissions.productionManage]);
    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);

    expect(find.text('Offline'), findsOneWidget);
    await tester.tap(find.text('Offline'));
    await settle(tester);
    expect(find.textContaining('No network'), findsOneWidget);
    expect(find.text('Nothing entered on this phone yet.'), findsOneWidget);
    await tester.disposeApp();
  });
}
