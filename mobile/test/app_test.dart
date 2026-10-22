import 'package:brics_mobile/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('boots with the theme and localisations', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: BricsApp()));
    await tester.pumpAndSettle();
    expect(find.text('BRICS'), findsOneWidget);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.darkTheme, isNotNull);
  });
}
