// A real run of the app on a device or simulator against a real API: signs in,
// walks every screen, makes real entries, and screenshots each step.
//
//   flutter drive --driver=test_driver/integration_test.dart \
//     --target=integration_test/app_tour_test.dart -d <device> \
//     --dart-define=API_BASE_URL=http://127.0.0.1:4000/api/v1 \
//     --dart-define=TOUR_LOGIN=<mobile> --dart-define=TOUR_PASSWORD=<password> --dart-define=TOUR_KILN=<kiln name>
//
// It writes to that API's database. Use a local or demo API, never production. Each run
// raises a gate-out on one waiting challan; a second run on the same day has today's
// attendance refused as a duplicate, which shows on the Sync screen.
import 'package:brics_mobile/app.dart';
import 'package:brics_mobile/core/widgets/sync_status_badge.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

const _login = String.fromEnvironment('TOUR_LOGIN');
const _password = String.fromEnvironment('TOUR_PASSWORD');
const _kiln = String.fromEnvironment('TOUR_KILN');

// A chamber the API has not seen yet, so a rerun can open a new batch (one open batch per chamber).
final int _chamber = 10 + DateTime.now().millisecondsSinceEpoch ~/ 60000 % 90;

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('app tour', (tester) async {
    // Real animations run (glow, smoke), so frames never "settle": step time instead.
    Future<void> wait([int ms = 900]) async {
      final end = DateTime.now().add(Duration(milliseconds: ms));
      while (DateTime.now().isBefore(end)) {
        await tester.pump(const Duration(milliseconds: 50));
      }
    }

    Future<void> until(Finder finder, {int seconds = 30}) async {
      final end = DateTime.now().add(Duration(seconds: seconds));
      while (finder.evaluate().isEmpty && DateTime.now().isBefore(end)) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(finder, findsWidgets);
    }

    Future<void> shot(String name) async {
      await wait(700);
      await binding.takeScreenshot(name);
    }

    Future<void> tap(Finder finder) async {
      await until(finder);
      await tester.ensureVisible(finder.first);
      await wait(200);
      await tester.tap(finder.first);
      await wait();
    }

    Future<void> hideKeyboard() async {
      FocusManager.instance.primaryFocus?.unfocus();
      await wait(400);
    }

    /// Home's task grid builds lazily; bring the tile into view first.
    Future<void> openTask(String name) async {
      await tester.scrollUntilVisible(
        find.text(name),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tap(find.text(name));
    }

    Future<void> back() async {
      await tester.pageBack();
      await wait();
    }

    Future<void> pick(String label, String option) async {
      await tap(find.text(label));
      await tap(find.text(option).last);
    }

    await tester.pumpWidget(const ProviderScope(child: BricsApp()));
    await wait(1200);
    await shot('00_splash');
    await until(find.text('Welcome back'));
    await wait(1500);
    await shot('01_login');

    await tester.enterText(find.byType(TextFormField).at(0), _login);
    await tester.enterText(find.byType(TextFormField).at(1), _password);
    await tester.testTextInput.receiveAction(TextInputAction.done);
    // A distant server can take a few seconds: wait for whichever screen comes next.
    await until(
      find.byWidgetPredicate(
        (w) => w is Text && (w.data == 'Choose your kiln' || w.data == 'YOUR WORK'),
      ),
    );
    await wait(800);
    if (find.text('Choose your kiln').evaluate().isNotEmpty) {
      await shot('02_kiln_picker');
      await tap(find.text(_kiln));
    }
    await until(find.text('YOUR WORK'));
    await wait(6000); // masters and lists arrive from the server
    await shot('03_home');

    // ── production ────────────────────────────────────────────────────────────
    await openTask('Production');
    await until(find.text('Chamber 5'));
    await shot('04_production_batches');
    await tap(find.text('Chamber 8'));
    await shot('05_batch_moulded');
    await back();
    await tap(find.text('Chamber 5'));
    await shot('06_batch_firing');
    await shot('06b_batch_firing_top');
    await tap(find.text('Record'));
    await shot('07_stage_sorting_form');
    await back();
    await back();

    await tap(find.text('New batch'));
    await tester.enterText(find.byType(TextFormField).first, 'Chamber $_chamber');
    await hideKeyboard();
    await shot('08_new_batch_form');
    await tap(find.text('Save'));
    await wait(300);
    await shot('09_saved_celebration');
    await wait(1500);
    await shot('10_new_batch_timeline');
    await tap(find.text('Record'));
    await tap(find.text('5,000'));
    await tap(find.text('5,000'));
    await tap(find.text('1,000'));
    await shot('11_making_form');
    await tap(find.text('Save'));
    await wait(2500);
    await shot('12_after_making');
    await back();
    await tap(find.text('My entries'));
    await shot('13_production_entries');
    await back();

    // ── attendance ────────────────────────────────────────────────────────────
    await openTask('Attendance');
    await shot('14_attendance_list');
    await tap(find.text('Take attendance'));
    await pick('Gang', 'Moulding Gang — Ramu');
    await shot('15_attendance_roll');
    await tap(find.text('Half day').at(1));
    await tap(find.text('Absent').at(2));
    await shot('16_attendance_marked');
    await tap(find.text('Save'));
    await wait(2500);
    await shot('17_attendance_saved');
    await back();

    // ── goods receipt ─────────────────────────────────────────────────────────
    await openTask('Goods receipt');
    await tap(find.text('New receipt'));
    await pick('Supplier', 'Jharia Coal Traders');
    await pick('Material', 'Steam Coal');
    await pick('Into store', 'Coal & Soil Store');
    await tester.enterText(find.widgetWithText(TextFormField, 'Quantity (t)'), '18.750');
    await hideKeyboard();
    await shot('18_grn_form');
    await tap(find.text('Save'));
    await wait(2500);
    await shot('19_grn_list');
    await back();

    // ── dispatch ──────────────────────────────────────────────────────────────
    await openTask('Dispatch');
    await until(find.text('Raised'));
    await shot('20_dispatch_list');
    // The first challan still waiting at the gate, so a rerun finds a fresh one.
    await tap(find.text('Raised'));
    await shot('21_challan_raised');
    await tap(find.text('Gate out'));
    await shot('22_gate_out_form');
    await tap(find.text('Save'));
    await wait(2500);
    await shot('23_challan_left_gate');
    await back();
    await back();

    // ── sync ──────────────────────────────────────────────────────────────────
    await tap(find.byType(SyncStatusBadge));
    await wait(2000);
    await shot('24_sync');
  });
}
