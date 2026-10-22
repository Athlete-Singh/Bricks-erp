import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/production/presentation/production_providers.dart';
import 'package:brics_mobile/features/sync/presentation/entry_editors.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/app_harness.dart';
import '../helpers/pump_app.dart';
import '../helpers/test_env.dart';

void main() {
  group('payloads match @brics/shared production schemas', () {
    test('making carries counts as strings and drops blank optionals', () {
      final p = ProductionPayloads.making(
        entryDate: '2026-10-22',
        greenBricks: '12000',
        consumption: const [ConsumptionLine(itemId: 'soil', warehouseId: 'w1', quantity: '3.500')],
      );
      expect(p, {
        'entryDate': '2026-10-22',
        'greenBricks': '12000',
        'consumption': [
          {'itemId': 'soil', 'warehouseId': 'w1', 'quantity': '3.500'},
        ],
      });
    });

    test('sorting lists only grades with good bricks', () {
      final p = ProductionPayloads.sorting(
        entryDate: '2026-10-22',
        warehouseId: 'yard',
        gradeCounts: {'class1': '9000', 'class2': '', 'class3': '0'},
        brokenBricks: '120',
        rejectBricks: '0',
      );
      expect(p['outputs'], [
        {'brickTypeId': 'class1', 'quantity': '9000'},
      ]);
      expect(p.containsKey('notes'), isFalse);
    });
  });

  group('offline production (PRD-06)', () {
    late TestEnv env;
    late ProviderContainer c;
    late QueueOwner owner;

    setUp(() async {
      env = TestEnv()..connectivity.online = false;
      env.api.offline = true;
      await seedSession(
        env,
        permissions: [Permissions.productionManage, Permissions.productionView],
      );
      c = env.container();
      await c.read(sessionControllerProvider.future);
      owner = c.read(queueOwnerProvider)!;
    });
    tearDown(() async {
      c.dispose();
      await env.dispose();
    });

    test('a stage on an unsent batch waits for it; on a sent one it goes straight there', () async {
      final repo = c.read(productionRepositoryProvider);
      final local = await repo.createBatch(
        owner: owner,
        siteId: kilnA,
        payload: ProductionPayloads.batch(
          siteId: kilnA,
          chamber: 'Chamber 3',
          batchDate: '2026-10-22',
        ),
        title: 'Chamber 3',
      );
      final making = await repo.recordStage(
        owner: owner,
        siteId: kilnA,
        batch: BatchRef(localId: local),
        stage: ProductionStage.making,
        payload: ProductionPayloads.making(entryDate: '2026-10-22', greenBricks: '12000'),
        title: 'making',
      );
      final queue = c.read(queueRepositoryProvider);
      var row = (await queue.byId(making))!;
      expect(row.path, '/production/batches/{parent}/making');
      expect(row.dependsOn, local);

      await queue.markSynced(local, serverId: 'srv-1');
      final firing = await repo.recordStage(
        owner: owner,
        siteId: kilnA,
        batch: BatchRef(localId: local),
        stage: ProductionStage.firing,
        payload: ProductionPayloads.firing(entryDate: '2026-10-23', firedBricks: '11800'),
        title: 'firing',
      );
      row = (await queue.byId(firing))!;
      expect(row.path, '/production/batches/srv-1/firing');
      expect(row.dependsOn, isNull);
    });

    test('a day of entries made offline reaches the server once, in order', () async {
      final repo = c.read(productionRepositoryProvider);
      final batches = IdempotentCreate((r) => {'id': 'srv-${r.json['chamber']}', 'status': 'open'});
      final stages = IdempotentCreate((r) => {'stage': r.path.split('/').last});
      env.api
        ..on('POST', '/production/batches', batches.call)
        ..on('POST', '/production/batches/*/*', stages.call);

      final local = await repo.createBatch(
        owner: owner,
        siteId: kilnA,
        payload: ProductionPayloads.batch(siteId: kilnA, chamber: '3', batchDate: '2026-10-22'),
        title: 'b',
      );
      for (final (i, stage) in [
        ProductionStage.making,
        ProductionStage.drying,
        ProductionStage.firing,
      ].indexed) {
        env.now = env.now.add(Duration(minutes: i + 1));
        await repo.recordStage(
          owner: owner,
          siteId: kilnA,
          batch: BatchRef(localId: local),
          stage: stage,
          payload: {'entryDate': '2026-10-22', 'n': i},
          title: stage.name,
        );
      }

      env.api.offline = false;
      env.connectivity.online = true;
      await c.read(syncControllerProvider.notifier).syncNow();
      await c.read(syncControllerProvider.notifier).syncNow();

      final posts = env.api.sent('POST', '/production/batches');
      expect(posts.map((r) => r.path), [
        '/production/batches',
        '/production/batches/srv-3/making',
        '/production/batches/srv-3/drying',
        '/production/batches/srv-3/firing',
      ]);
      expect(batches.created, 1);
      expect(stages.created, 3);
      expect(await c.read(queueRepositoryProvider).unsentCount(owner.userId), 0);
    });

    test("an open batch listed by the server replaces the phone's copy", () async {
      final queue = c.read(queueRepositoryProvider);
      final local = await c
          .read(productionRepositoryProvider)
          .createBatch(
            owner: owner,
            siteId: kilnA,
            payload: ProductionPayloads.batch(siteId: kilnA, chamber: '3', batchDate: '2026-10-22'),
            title: 'b',
          );
      final sub = c.listen(batchesProvider, (_, _) {});
      addTearDown(sub.close);
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(c.read(batchesProvider).value!.single.ref, BatchRef(localId: local));

      await queue.markSynced(local, serverId: 'srv-9');
      await c.read(cacheRepositoryProvider).replace(CacheKind.productionBatch, [
        {
          'id': 'srv-9',
          'siteId': kilnA,
          'chamber': '3',
          'batchDate': '2026-10-22',
          'status': 'open',
        },
      ], siteId: kilnA);
      await Future<void>.delayed(const Duration(milliseconds: 20));

      final views = c.read(batchesProvider).value!;
      expect(views, hasLength(1));
      expect(views.single.ref, const BatchRef(serverId: 'srv-9'));
    });
  });

  test('a refused stage opens its own form to be corrected', () async {
    final env = TestEnv();
    addTearDown(env.dispose);
    final queue = QueueRepository(env.db, () => env.now);
    const owner = QueueOwner(userId: 'u', companyId: companyId);
    final id = await queue.enqueue(
      QueueDraft(
        entity: QueueEntity.productionFiring,
        method: 'POST',
        path: '/production/batches/srv-1/firing',
        payload: {},
        title: 't',
      ),
      owner,
    );
    await queue.markFailed(id, code: 'PRODUCTION_STAGE_OUT_OF_ORDER', error: 'Record making first');
    expect(editRoute((await queue.byId(id))!), '/production/batch/s-srv-1/firing?edit=$id');
  });

  testWidgets('start a batch and record making with no network', (tester) async {
    final env = TestEnv()..connectivity.online = false;
    addTearDown(env.dispose);
    await seedSession(env, permissions: [Permissions.productionManage, Permissions.productionView]);
    env.api.offline = true;
    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);

    await tester.tap(find.text('Production'));
    await settle(tester);
    expect(find.textContaining('No open batches'), findsOneWidget);

    await tester.tap(find.text('New batch'));
    await settle(tester);
    await tester.enterText(find.byType(TextFormField).first, 'Chamber 3');
    await tester.tap(find.text('Save'));
    await settle(tester);

    expect(find.text('0 of 4 stages'), findsOneWidget);
    await tester.tap(find.text('Record').first);
    await settle(tester);
    await tester.enterText(find.widgetWithText(TextFormField, 'Green bricks'), '12000');
    await tester.tap(find.text('Save'));
    await settle(tester);

    expect(find.text('Chamber 3 · 12,000 green'), findsOneWidget);
    expect(find.text('Waiting on another entry'), findsOneWidget);
    await tester.disposeApp();
  });
}
