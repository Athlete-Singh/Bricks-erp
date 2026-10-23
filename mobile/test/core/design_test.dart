import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_app.dart';

void main() {
  testWidgets('the logo builds from nothing to the full mark', (tester) async {
    for (final p in [0.0, 0.5, 1.0]) {
      await tester.pumpApp(BricsLogo(progress: p, size: 96));
      expect(tester.takeException(), isNull);
    }
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
