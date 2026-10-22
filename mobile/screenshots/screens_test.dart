// Renders the main screens to PNGs for design review — not part of the gate.
//   flutter test screenshots --update-goldens   →   screenshots/out/*.png
import 'dart:io';

import 'package:brics_mobile/app.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/helpers/app_harness.dart';
import '../test/helpers/test_env.dart';

const allPermissions = [
  'production.manage',
  'production.view',
  'labour.manage',
  'labour.view',
  'purchases.manage',
  'dispatch.manage',
  'dispatch.acknowledge',
  'dispatch.view',
  'parties.view',
  'inventory.view',
  'transport.view',
];

Future<void> loadFonts() async {
  final inter = FontLoader('Inter');
  for (final w in [400, 500, 600, 700, 800]) {
    inter.addFont(rootBundle.load('assets/fonts/Inter-$w.ttf'));
  }
  await inter.load();
  final sdk =
      Platform.environment['FLUTTER_ROOT'] ?? '${Platform.environment['HOME']}/development/flutter';
  final icons = FontLoader('MaterialIcons')
    ..addFont(
      Future.value(
        ByteData.sublistView(
          File(
            '$sdk/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
          ).readAsBytesSync(),
        ),
      ),
    );
  await icons.load();
}

Future<void> seed(TestEnv env) async {
  await seedSession(env, permissions: allPermissions, sites: const [kilnA, kilnB]);
  final cache = CacheRepository(env.db, () => env.now);
  await cache.applyDelta(CacheKind.party, [
    {
      'id': 's1',
      'name': 'Jharia Coal Co',
      'partyTypes': ['supplier'],
    },
    {
      'id': 'c1',
      'name': 'Gupta Constructions',
      'partyTypes': ['customer'],
    },
    {
      'id': 'c2',
      'name': 'Shree Builders',
      'partyTypes': ['customer'],
    },
    {
      'id': 'sd1',
      'name': 'Ramu Sardar',
      'partyTypes': ['sardar'],
    },
  ]);
  await cache.applyDelta(CacheKind.unit, [
    {'id': 't', 'name': 'Tonne', 'abbreviation': 't'},
  ]);
  await cache.applyDelta(CacheKind.item, [
    {'id': 'coal', 'name': 'Coal (steam)', 'category': 'raw_material', 'unitId': 't'},
    {'id': 'i1', 'name': 'Class 1 bricks', 'category': 'other', 'unitId': 't'},
  ]);
  await cache.applyDelta(CacheKind.brickType, [
    {'id': 'b1', 'grade': 'Class 1', 'itemId': 'i1'},
    {'id': 'b2', 'grade': 'Class 2', 'itemId': 'i2'},
    {'id': 'b3', 'grade': 'Awwal', 'itemId': 'i3'},
  ]);
  await cache.applyDelta(CacheKind.warehouse, [
    {'id': 'w1', 'siteId': kilnA, 'name': 'Main yard'},
  ], siteKey: 'siteId');
  await cache.replace(CacheKind.labourGroup, [
    {
      'id': 'g1',
      'siteId': kilnA,
      'sardarPartyId': 'sd1',
      'name': 'Moulding gang — Ramu',
      'activity': 'making',
    },
  ], siteKey: 'siteId');
  await cache.replace(CacheKind.worker, [
    for (final (i, n) in ['Asha Devi', 'Bhola Ram', 'Chandan', 'Dinesh', 'Ganga'].indexed)
      {'id': 'w$i', 'labourGroupId': 'g1', 'name': n},
  ]);
  await cache.replace(CacheKind.productionBatch, [
    {
      'id': 'pb1',
      'siteId': kilnA,
      'chamber': 'Chamber 3',
      'batchDate': '2026-10-20',
      'status': 'firing',
    },
    {
      'id': 'pb2',
      'siteId': kilnA,
      'chamber': 'Chamber 7',
      'batchDate': '2026-10-21',
      'status': 'open',
    },
  ], siteId: kilnA);
  await cache.put(CacheKind.productionBatchDetail, {
    'id': 'pb1',
    'entries': [
      {'stage': 'making', 'greenBricks': '12000'},
      {'stage': 'drying'},
      {'stage': 'firing', 'firedBricks': '11800'},
    ],
  });
  await cache.replace(CacheKind.dispatch, [
    {
      'id': 'd1',
      'siteId': kilnA,
      'customerPartyId': 'c1',
      'challanNo': 'DC-00031',
      'dispatchDate': '2026-10-22',
      'status': 'draft',
    },
    {
      'id': 'd2',
      'siteId': kilnA,
      'customerPartyId': 'c2',
      'challanNo': 'DC-00030',
      'dispatchDate': '2026-10-21',
      'status': 'confirmed',
    },
  ], siteId: kilnA);
  await cache.put(CacheKind.dispatch.replaceAll('dispatch', 'dispatch_detail'), {
    'id': 'd1',
    'lines': [
      {'itemId': 'i1', 'quantity': '5000'},
    ],
  });

  final queue = QueueRepository(env.db, () => env.now);
  const owner = QueueOwner(userId: '00000000-0000-4000-8000-000000000001', companyId: companyId);
  Future<String> add(
    String entity,
    String title,
    Map<String, dynamic> payload, {
    String path = '/x',
  }) async {
    env.now = env.now.add(const Duration(minutes: 9));
    return await queue.enqueue(
      QueueDraft(
        entity: entity,
        method: 'POST',
        path: path,
        payload: payload,
        title: title,
        siteId: kilnA,
      ),
      owner,
    );
  }

  final g = await add(QueueEntity.goodsReceipt, 'Jharia Coal Co · 1 items', {});
  await queue.markSynced(g, serverId: 'g1', serverRef: 'GRN-00012');
  await add(QueueEntity.attendance, 'Moulding gang — Ramu · 4.5 present of 5', {
    'labourGroupId': 'g1',
    'date': '2026-10-22',
  });
  await add(
    QueueEntity.productionMaking,
    'Chamber 7 · 12,000 green',
    {},
    path: '/production/batches/pb2/making',
  );
  final f = await add(QueueEntity.dispatch, 'Shree Builders · 5,000', {
    'customerPartyId': 'c2',
    'dispatchDate': '2026-10-22',
  });
  await queue.markFailed(
    f,
    code: 'CUSTOMER_INACTIVE',
    error: 'That customer is marked inactive. Ask the office to reactivate them.',
  );
}

void main() {
  setUpAll(loadFonts);

  for (final dark in [false, true]) {
    testWidgets('screens (${dark ? 'dark' : 'light'})', (tester) async {
      debugDisableShadows = false;
      tester.view
        ..physicalSize = const Size(1179, 2556)
        ..devicePixelRatio = 3;
      tester.platformDispatcher.platformBrightnessTestValue = dark
          ? Brightness.dark
          : Brightness.light;
      addTearDown(tester.view.reset);

      final env = TestEnv()..connectivity.online = false;
      env.api.offline = true;
      await tester.runAsync(() => seed(env));
      final container = ProviderContainer(overrides: env.overrides, retry: (_, _) => null);
      await tester.pumpWidget(
        UncontrolledProviderScope(container: container, child: const BricsApp()),
      );
      await settle(tester);

      final router = container.read(routerProvider);
      Future<void> shot(String name, String route) async {
        router.go(route);
        await settle(tester);
        await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
        await tester.pump();
        await expectLater(
          find.byType(BricsApp),
          matchesGoldenFile('out/${dark ? 'dark_' : ''}$name.png'),
        );
      }

      await shot('home', AppRoutes.home);
      if (!dark) {
        await shot('production', AppRoutes.production);
        await shot('batch', AppRoutes.productionBatch('s-pb1'));
        await shot('stage_making', AppRoutes.productionStage('s-pb2', 'making'));
        await shot('stage_sorting', AppRoutes.productionStage('s-pb1', 'sorting'));
        await shot('attendance_form', AppRoutes.attendanceNew);
        await shot('grn_form', AppRoutes.grnNew);
        await shot('dispatch', AppRoutes.dispatch);
        await shot('challan', AppRoutes.dispatchChallan('s-d1'));
        await shot('sync', AppRoutes.sync);
        await shot('kiln', AppRoutes.kiln);
      }
      await tester.runAsync(() => container.read(sessionControllerProvider.notifier).signOut());
      await settle(tester);
      await shot('login', AppRoutes.login);
      container.read(syncControllerProvider.notifier);
      await tester.pumpWidget(const SizedBox.shrink());
      container.dispose();
      await tester.pump(const Duration(minutes: 1));
      debugDisableShadows = true;
    });
  }
}
