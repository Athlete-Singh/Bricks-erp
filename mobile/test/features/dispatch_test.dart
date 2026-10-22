import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/record_ref.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/app_harness.dart';
import '../helpers/fake_api.dart';
import '../helpers/pump_app.dart';
import '../helpers/test_env.dart';

void main() {
  group("effective status counts this phone's unsent steps", () {
    const draft = ChallanView(
      ref: RecordRef(serverId: 'd1'),
      customerPartyId: 'c1',
      dispatchDate: '2026-10-22',
      serverStatus: DispatchStatus.draft,
    );
    test("nothing queued: the server's word", () {
      expect(effectiveStatus(draft), DispatchStatus.draft);
    });
  });

  test(
    'a challan raised, sent out and delivered offline reaches the server in that order',
    () async {
      final env = TestEnv()..connectivity.online = false;
      addTearDown(env.dispose);
      env.api.offline = true;
      await seedSession(
        env,
        permissions: [
          Permissions.dispatchManage,
          Permissions.dispatchAcknowledge,
          Permissions.dispatchView,
        ],
      );
      final c = env.container();
      addTearDown(c.dispose);
      await c.read(sessionControllerProvider.future);
      final owner = c.read(queueOwnerProvider)!;
      final repo = c.read(dispatchRepositoryProvider);
      final queue = c.read(queueRepositoryProvider);

      final local = await repo.raise(
        owner: owner,
        siteId: kilnA,
        payload: DispatchPayloads.challan(
          siteId: kilnA,
          customerPartyId: 'c1',
          dispatchDate: '2026-10-22',
          lines: [
            {'itemId': 'class1', 'warehouseId': 'yard', 'quantity': '5000'},
          ],
        ),
        title: 'challan',
      );
      env.now = env.now.add(const Duration(minutes: 5));
      final confirm = await repo.act(
        owner: owner,
        siteId: kilnA,
        challan: RecordRef(localId: local),
        entity: QueueEntity.dispatchConfirm,
        payload: DispatchPayloads.confirm(confirmedOn: '2026-10-22'),
        title: 'gate out',
      );
      env.now = env.now.add(const Duration(hours: 3));
      final confirmRow = await queue.byId(confirm);
      await repo.act(
        owner: owner,
        siteId: kilnA,
        challan: RecordRef(localId: local),
        entity: QueueEntity.dispatchAcknowledge,
        payload: DispatchPayloads.acknowledge(receivedBy: 'Mr Gupta', deliveredOn: '2026-10-22'),
        title: 'delivered',
        after: confirmRow,
      );

      var status = DispatchStatus.draft;
      final raise = IdempotentCreate(
        (_) => {'id': 'srv-d', 'challanNo': 'DC-00031', 'status': 'draft'},
      );
      env.api
        ..on('POST', '/dispatches', raise.call)
        ..on('PATCH', '/dispatches/*/confirm', (r) {
          status = DispatchStatus.confirmed;
          return FakeResponse.ok({'id': 'srv-d', 'challanNo': 'DC-00031', 'status': status});
        })
        ..on('PATCH', '/dispatches/*/acknowledge', (r) {
          if (status != DispatchStatus.confirmed) {
            return FakeResponse.error(400, 'DISPATCH_NOT_CONFIRMED');
          }
          status = DispatchStatus.delivered;
          return FakeResponse.ok({'id': 'srv-d', 'status': status});
        })
        ..offline = false;
      env.connectivity.online = true;

      await c.read(syncControllerProvider.notifier).syncNow();

      expect(env.api.requests.where((r) => r.method != 'GET').map((r) => '${r.method} ${r.path}'), [
        'POST /dispatches',
        'PATCH /dispatches/srv-d/confirm',
        'PATCH /dispatches/srv-d/acknowledge',
      ]);
      expect(status, DispatchStatus.delivered);
      expect(await queue.unsentCount(owner.userId), 0);
      expect((await queue.byId(local))!.serverRef, 'DC-00031');
    },
  );

  testWidgets('a supervisor sends a server challan out of the gate with no signal', (tester) async {
    final env = TestEnv()..connectivity.online = false;
    addTearDown(env.dispose);
    // The supervisor role: dispatch, but no parties.view — so no "New challan".
    await seedSession(
      env,
      permissions: [
        Permissions.dispatchManage,
        Permissions.dispatchAcknowledge,
        Permissions.dispatchView,
      ],
    );
    env.api.offline = true;
    await CacheRepository(env.db, () => env.now).replace(CacheKind.dispatch, [
      {
        'id': 'd7',
        'siteId': kilnA,
        'customerPartyId': 'c1',
        'challanNo': 'DC-00007',
        'dispatchDate': '2026-10-22',
        'status': 'draft',
      },
    ], siteId: kilnA);

    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);
    await tester.tap(find.text('Dispatch'));
    await settle(tester);

    expect(find.text('New challan'), findsNothing);
    expect(find.text('DC-00007'), findsOneWidget);
    await tester.tap(find.text('DC-00007'));
    await settle(tester);
    await tester.tap(find.text('Gate out'));
    await settle(tester);
    await tester.tap(find.text('Save'));
    await settle(tester);

    expect(find.text('Left the gate'), findsOneWidget);
    expect(
      find.text('Record delivery'),
      findsOneWidget,
      reason: 'the next step is offered at once',
    );

    env.api
      ..offline = false
      ..on(
        'PATCH',
        '/dispatches/*/confirm',
        (_) => FakeResponse.ok({'id': 'd7', 'status': 'confirmed'}),
      );
    env.connectivity.set(online: true);
    await settle(tester);

    expect(env.api.sent('PATCH', '/dispatches/d7/confirm'), hasLength(1));
    await tester.disposeApp();
  });
}
