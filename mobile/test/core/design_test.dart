import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_theme.dart';
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

  Future<void> pumpCelebrating(WidgetTester tester, {required bool motion}) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: MotionScope(
          enabled: motion,
          child: Builder(
            builder: (context) => Scaffold(
              body: TextButton(onPressed: () => celebrate(context), child: const Text('go')),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('go'));
    await tester.pump();
  }

  testWidgets('saving celebrates, then cleans up after itself', (tester) async {
    await pumpCelebrating(tester, motion: true);
    expect(find.byType(CustomPaint), findsWidgets);
    final during = tester.widgetList(find.byType(IgnorePointer)).length;
    await tester.pump(const Duration(milliseconds: 1400));
    expect(tester.widgetList(find.byType(IgnorePointer)).length, lessThan(during));
  });

  testWidgets('with reduce-motion on there is no celebration at all', (tester) async {
    await pumpCelebrating(tester, motion: false);
    await tester.pump(const Duration(milliseconds: 100));
    // Nothing scheduled: the test ending with no pending timers is the assertion.
    expect(find.text('go'), findsOneWidget);
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
