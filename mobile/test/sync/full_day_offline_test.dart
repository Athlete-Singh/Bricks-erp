import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/attendance/data/attendance_repository.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_providers.dart';
import 'package:brics_mobile/features/grn/data/grn_repository.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/production/presentation/production_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/app_harness.dart';
import '../helpers/fake_api.dart';
import '../helpers/test_env.dart';

/// MOB-04 — a whole day at the kiln with no signal, then a bad connection.
void main() {
  test('a full day offline syncs with no duplicates and in order', () async {
    final env = TestEnv()..connectivity.online = false;
    addTearDown(env.dispose);
    env.api.offline = true;
    await seedSession(
      env,
      permissions: [
        Permissions.productionManage,
        Permissions.labourManage,
        Permissions.purchasesManage,
        Permissions.dispatchManage,
        Permissions.dispatchAcknowledge,
      ],
    );
    final c = env.container();
    addTearDown(c.dispose);
    await c.read(sessionControllerProvider.future);
    final owner = c.read(queueOwnerProvider)!;
    final queue = c.read(queueRepositoryProvider);
    void later() => env.now = env.now.add(const Duration(minutes: 7));

    // ── the day ──────────────────────────────────────────────────────────────
    final production = c.read(productionRepositoryProvider);
    for (final chamber in ['3', '4']) {
      later();
      final batch = await production.createBatch(
        owner: owner,
        siteId: kilnA,
        payload: ProductionPayloads.batch(siteId: kilnA, chamber: chamber, batchDate: '2026-10-22'),
        title: chamber,
      );
      for (final stage in ProductionStage.values) {
        later();
        await production.recordStage(
          owner: owner,
          siteId: kilnA,
          batch: RecordRef(localId: batch),
          stage: stage,
          payload: {'entryDate': '2026-10-22', 'chamber': chamber},
          title: '$chamber ${stage.name}',
        );
      }
    }
    for (final gang in ['g1', 'g2', 'g3']) {
      later();
      await c
          .read(attendanceRepositoryProvider)
          .save(
            owner: owner,
            siteId: kilnA,
            payload: {
              'siteId': kilnA,
              'labourGroupId': gang,
              'date': '2026-10-22',
              'entries': <Object>[],
            },
            title: gang,
          );
    }
    for (final load in ['coal', 'soil']) {
      later();
      await c
          .read(grnRepositoryProvider)
          .save(
            owner: owner,
            siteId: kilnA,
            payload: {
              'supplierPartyId': 's1',
              'siteId': kilnA,
              'receiptDate': '2026-10-22',
              'lines': load,
            },
            title: load,
          );
    }
    final dispatch = c.read(dispatchRepositoryProvider);
    for (final customer in ['c1', 'c2']) {
      later();
      final challan = await dispatch.raise(
        owner: owner,
        siteId: kilnA,
        payload: {'customerPartyId': customer, 'dispatchDate': '2026-10-22', 'lines': <Object>[]},
        title: customer,
      );
      later();
      final gateOut = await dispatch.act(
        owner: owner,
        siteId: kilnA,
        challan: RecordRef(localId: challan),
        entity: QueueEntity.dispatchConfirm,
        payload: DispatchPayloads.confirm(confirmedOn: '2026-10-22'),
        title: 'out',
      );
      later();
      await dispatch.act(
        owner: owner,
        siteId: kilnA,
        challan: RecordRef(localId: challan),
        entity: QueueEntity.dispatchAcknowledge,
        payload: DispatchPayloads.acknowledge(receivedBy: 'site', deliveredOn: '2026-10-22'),
        title: 'delivered',
        after: await queue.byId(gateOut),
      );
    }
    const entries = 2 * 5 + 3 + 2 + 2 * 3;
    expect(await queue.unsentCount(owner.userId), entries);

    // ── the server, idempotent where the API is, stateful where it is not ────
    final batches = IdempotentCreate((r) => {'id': 'batch-${r.json['chamber']}'});
    final stages = IdempotentCreate((r) => {'stage': r.path.split('/').last});
    final rolls = IdempotentCreate((r) => [r.json['labourGroupId']]);
    final receipts = IdempotentCreate(
      (r) => {'id': 'grn-${r.json['lines']}', 'grnNo': 'GRN-${r.json['lines']}'},
    );
    final challans = IdempotentCreate(
      (r) => {'id': 'd-${r.json['customerPartyId']}', 'status': 'draft'},
    );
    final status = <String, String>{};
    final stageOrder = <String>[];
    var grnHiccup = true;
    env.api
      ..on('POST', '/production/batches', batches.call)
      ..on('POST', '/production/batches/*/*', (r) {
        final response = stages(r);
        if (response.status == 201 && !stageOrder.contains(r.path)) stageOrder.add(r.path);
        return response;
      })
      ..on('POST', '/labour/attendance', rolls.call)
      ..on('POST', '/purchases/goods-receipts', (r) {
        if (grnHiccup) {
          grnHiccup = false;
          return FakeResponse.error(503, 'UNAVAILABLE');
        }
        return receipts(r);
      })
      ..on('POST', '/dispatches', (r) {
        final response = challans(r);
        status.putIfAbsent('d-${r.json['customerPartyId']}', () => 'draft');
        return response;
      })
      ..on('PATCH', '/dispatches/*/confirm', (r) {
        final id = r.path.split('/')[2];
        if (status[id] != 'draft') return FakeResponse.error(400, 'DISPATCH_NOT_DRAFT');
        status[id] = 'confirmed';
        return FakeResponse.ok({'id': id, 'status': 'confirmed'});
      })
      ..on('PATCH', '/dispatches/*/acknowledge', (r) {
        final id = r.path.split('/')[2];
        if (status[id] == 'delivered') return FakeResponse.error(400, 'DISPATCH_ALREADY_DELIVERED');
        if (status[id] != 'confirmed') return FakeResponse.error(400, 'DISPATCH_NOT_CONFIRMED');
        status[id] = 'delivered';
        return FakeResponse.ok({'id': id, 'status': 'delivered'});
      })
      ..on('GET', '/dispatches/*', (r) {
        final id = r.path.split('/')[2];
        return FakeResponse.ok({'id': id, 'status': status[id]});
      })
      // A weak signal: the first few answers are lost after the server saved.
      ..dropResponses = 4
      ..offline = false;
    env.connectivity.online = true;

    // ── evening: signal comes and goes; sync until the phone is empty ───────
    final sync = c.read(syncControllerProvider.notifier);
    for (var round = 0; round < 12 && await queue.unsentCount(owner.userId) > 0; round++) {
      env.now = env.now.add(const Duration(minutes: 11));
      await sync.syncNow();
    }

    expect(await queue.unsentCount(owner.userId), 0, reason: 'everything reached the server');
    expect(batches.created, 2);
    expect(stages.created, 8);
    expect(rolls.created, 3);
    expect(receipts.created, 2);
    expect(challans.created, 2);
    expect(status, {'d-c1': 'delivered', 'd-c2': 'delivered'});
    for (final chamber in ['3', '4']) {
      expect(stageOrder.where((p) => p.contains('batch-$chamber/')).map((p) => p.split('/').last), [
        'making',
        'drying',
        'firing',
        'sorting',
      ]);
    }
  });

  test('a refused parent does not keep waking the sync', () async {
    final env = TestEnv();
    addTearDown(env.dispose);
    final queue = QueueRepository(env.db, () => env.now);
    const owner = QueueOwner(userId: 'u', companyId: companyId);
    final parent = await queue.enqueue(
      QueueDraft(
        entity: QueueEntity.dispatch,
        method: 'POST',
        path: '/dispatches',
        payload: {},
        title: 'p',
      ),
      owner,
    );
    await queue.enqueue(
      QueueDraft(
        entity: QueueEntity.dispatchConfirm,
        method: 'PATCH',
        path: '/dispatches/{parent}/confirm',
        payload: {},
        title: 'c',
        dependsOn: parent,
      ),
      owner,
    );
    await queue.markFailed(parent, code: 'CUSTOMER_INACTIVE', error: 'Customer is inactive');
    expect(await queue.due('u'), isEmpty);
  });

  test('sent entries are cleared after 30 days, unsent ones never', () async {
    final env = TestEnv();
    addTearDown(env.dispose);
    final queue = QueueRepository(env.db, () => env.now);
    const owner = QueueOwner(userId: 'u', companyId: companyId);
    QueueDraft draft() => QueueDraft(
      entity: QueueEntity.goodsReceipt,
      method: 'POST',
      path: '/x',
      payload: {},
      title: 't',
    );
    final old = await queue.enqueue(draft(), owner);
    final unsent = await queue.enqueue(draft(), owner);
    await queue.markSynced(old, serverId: 's');
    env.now = env.now.add(const Duration(days: 31));
    final fresh = await queue.enqueue(draft(), owner);
    await queue.markSynced(fresh, serverId: 's2');

    expect(await queue.pruneSynced(const Duration(days: 30)), 1);
    expect(await queue.byId(old), isNull);
    expect(await queue.byId(unsent), isNotNull);
    expect(await queue.byId(fresh), isNotNull);
  });
}
