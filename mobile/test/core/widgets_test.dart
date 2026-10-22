import 'package:brics_mobile/core/sync/sync_summary.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_app.dart';

void main() {
  group('SyncStatusBadge', () {
    Future<void> pumpBadge(WidgetTester tester, SyncSummary summary) =>
        tester.pumpApp(Center(child: SyncStatusBadge(summary: summary)));

    testWidgets('says everything is sent when the queue is empty', (tester) async {
      await pumpBadge(tester, SyncSummary.empty);
      expect(find.text('All sent'), findsOneWidget);
    });

    testWidgets('counts what is waiting while offline', (tester) async {
      await pumpBadge(
        tester,
        const SyncSummary(online: false, pending: 3, failed: 0, syncing: false),
      );
      expect(find.text('3 waiting'), findsOneWidget);
      expect(find.byIcon(Icons.cloud_off_rounded), findsOneWidget);
    });

    testWidgets('failures win over everything else', (tester) async {
      await pumpBadge(
        tester,
        const SyncSummary(online: false, pending: 3, failed: 1, syncing: true),
      );
      expect(find.text('1 need attention'), findsOneWidget);
    });
  });

  testWidgets('AppButton ignores taps while busy', (tester) async {
    var taps = 0;
    await tester.pumpApp(AppButton(label: 'Save', onPressed: () => taps++, busy: true));
    await tester.tap(find.byType(AppButton));
    expect(taps, 0);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('NumberStepper steps and never goes below its minimum', (tester) async {
    var value = 1;
    await tester.pumpApp(
      StatefulBuilder(
        builder: (context, setState) => NumberStepper(
          label: 'Overtime',
          value: value,
          onChanged: (v) => setState(() => value = v),
        ),
      ),
    );
    await tester.tap(find.byIcon(Icons.add_rounded));
    await tester.pump();
    expect(value, 2);
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.byIcon(Icons.remove_rounded));
      await tester.pump();
    }
    expect(value, 0);
    await tester.enterText(find.byType(TextFormField), '250');
    expect(value, 250);
  });

  testWidgets('touch targets are at least 48 dp', (tester) async {
    await tester.pumpApp(AppButton(label: 'Save', onPressed: () {}));
    expect(tester.getSize(find.byType(AppButton)).height, greaterThanOrEqualTo(48));
  });
}
