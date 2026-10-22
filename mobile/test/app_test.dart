import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/app_harness.dart';
import 'helpers/pump_app.dart';
import 'helpers/test_env.dart';

void main() {
  testWidgets('a fresh phone boots to sign in, in light and dark', (tester) async {
    final env = TestEnv();
    addTearDown(env.dispose);
    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);

    expect(find.text('Mobile number or email'), findsOneWidget);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.darkTheme, isNotNull);
    await tester.disposeApp();
  });
}
