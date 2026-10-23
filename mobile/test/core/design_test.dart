import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_app.dart';

void main() {
  testWidgets('every logo variant builds, wordmark from brand config', (tester) async {
    for (final variant in AppLogoVariant.values) {
      await tester.pumpApp(AppLogo(variant: variant, size: 72));
      expect(tester.takeException(), isNull);
    }
    await tester.pumpApp(const AppLogo(variant: AppLogoVariant.stacked));
    // "BRICK KILN" with the I in KILN drawn as a dotless ı for the leaf.
    expect(find.text('BRICK K'), findsOneWidget);
    expect(find.text('ı'), findsOneWidget);
    expect(find.text('LN'), findsOneWidget);
    expect(find.text('1999'), findsOneWidget);
    expect(find.bySemanticsLabel('BRICS'), findsOneWidget);
  });

  testWidgets('quick-add chips add to the count', (tester) async {
    var value = 0;
    await tester.pumpApp(
      StatefulBuilder(
        builder: (context, setState) => NumberStepper(
          label: 'Green bricks',
          value: value,
          step: 1000,
          quickAdds: const [500, 5000],
          onChanged: (v) => setState(() => value = v),
        ),
      ),
    );
    await tester.tap(find.text('5,000'));
    await tester.pump();
    await tester.tap(find.text('500'));
    await tester.pump();
    expect(value, 5500);
  });
}
