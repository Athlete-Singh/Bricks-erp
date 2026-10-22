import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/features/attendance/domain/attendance.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/app_harness.dart';
import '../helpers/pump_app.dart';
import '../helpers/test_env.dart';

void main() {
  group('attendance payload (LAB-02)', () {
    test('matches createAttendanceSchema', () {
      final p = AttendancePayloads.roll(
        siteId: kilnA,
        labourGroupId: 'g1',
        date: '2026-10-22',
        lines: const [
          AttendanceLine(workerId: 'w1', mark: AttendanceMark.present, overtimeHours: '2'),
          AttendanceLine(workerId: 'w2', mark: AttendanceMark.halfDay),
        ],
      );
      expect(p['entries'], [
        {'workerId': 'w1', 'status': 'present', 'overtimeHours': '2'},
        {'workerId': 'w2', 'status': 'half_day'},
      ]);
    });

    test('present count reads half days as halves', () {
      expect(
        AttendancePayloads.presentCount(const [
          AttendanceLine(mark: AttendanceMark.present),
          AttendanceLine(mark: AttendanceMark.halfDay),
          AttendanceLine(mark: AttendanceMark.absent),
        ]),
        '1.5',
      );
    });

    test('overtime follows the backend pattern', () {
      expect(isValidOvertime('1.5'), isTrue);
      expect(isValidOvertime(''), isTrue);
      expect(isValidOvertime('100'), isFalse);
      expect(isValidOvertime('1.555'), isFalse);
    });
  });

  testWidgets("a gang's roll is taken offline and sent once the signal returns", (tester) async {
    final env = TestEnv()..connectivity.online = false;
    addTearDown(env.dispose);
    await seedSession(env, permissions: [Permissions.labourManage, Permissions.labourView]);
    env.api.offline = true;
    final create = IdempotentCreate((r) => {'saved': (r.json['entries'] as List).length});
    env.api.on('POST', '/labour/attendance', create.call);
    final cache = CacheRepository(env.db, () => env.now);
    await cache.replace(CacheKind.labourGroup, [
      {
        'id': 'g1',
        'siteId': kilnA,
        'sardarPartyId': 's1',
        'name': 'Moulding gang',
        'activity': 'making',
      },
    ], siteKey: 'siteId');
    await cache.replace(CacheKind.worker, [
      {'id': 'w1', 'labourGroupId': 'g1', 'name': 'Asha'},
      {'id': 'w2', 'labourGroupId': 'g1', 'name': 'Bhola'},
    ]);

    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);
    await tester.tap(find.text('Attendance'));
    await settle(tester);
    await tester.tap(find.text('Take attendance'));
    await settle(tester);

    await tester.tap(find.text('Gang'));
    await settle(tester);
    await tester.tap(find.text('Moulding gang').last);
    await settle(tester);
    expect(find.text('Asha'), findsOneWidget);
    await tester.tap(find.text('Half day').last);
    await settle(tester);
    await tester.tap(find.text('Save'));
    await settle(tester);

    expect(find.text('Moulding gang · 1.5 present of 2'), findsOneWidget);

    env.api.offline = false;
    env.connectivity.set(online: true);
    await settle(tester);

    final sent = env.api.sent('POST', '/labour/attendance');
    expect(sent, hasLength(1));
    expect(sent.single.json['entries'], [
      {'workerId': 'w1', 'status': 'present'},
      {'workerId': 'w2', 'status': 'half_day'},
    ]);
    final container = ProviderScope.containerOf(tester.element(find.byType(Scaffold).first));
    expect(
      await tester.runAsync(
        () => container
            .read(queueRepositoryProvider)
            .unsentCount(container.read(queueOwnerProvider)!.userId),
      ),
      0,
    );
    await tester.disposeApp();
  });
}
