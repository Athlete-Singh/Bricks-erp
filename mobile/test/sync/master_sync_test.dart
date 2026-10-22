import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/master_sync_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_api.dart';
import '../helpers/test_env.dart';

void main() {
  late TestEnv env;
  late CacheRepository cache;
  late MasterSyncService masters;

  setUp(() {
    env = TestEnv();
    cache = CacheRepository(env.db, () => env.now);
    final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))..httpClientAdapter = env.api;
    masters = MasterSyncService(api: ApiClient(dio), cache: cache, db: env.db);
  });
  tearDown(() => env.dispose());

  const parties = PullSpec(
    kind: CacheKind.party,
    path: '/parties',
    mode: PullMode.delta,
    permission: 'parties.view',
  );

  test('a first delta pull starts at the epoch, pages, and keeps the watermark', () async {
    env.api.on('GET', '/parties', (r) {
      expect(r.query['since'], MasterSyncService.epoch);
      final page = r.query['page'] as int;
      return FakeResponse.ok(
        [
          for (var i = 0; i < (page == 1 ? 100 : 20); i++) {'id': 'p$page-$i', 'name': 'Party $i'},
        ],
        meta: {'page': page, 'limit': 100, 'total': 120, 'nextSince': '2026-10-22T03:00:00.000Z'},
      );
    });

    await masters.pull([parties], can: (_) => true);

    expect(await cache.all(CacheKind.party), hasLength(120));
    expect(
      await env.db.readState(MasterSyncService.watermarkKey(CacheKind.party)),
      '2026-10-22T03:00:00.000Z',
    );
  });

  test('the next pull sends the watermark and applies tombstones', () async {
    await cache.applyDelta(CacheKind.party, [
      {'id': 'p1', 'name': 'Old'},
      {'id': 'p2', 'name': 'Gone'},
    ]);
    await env.db.writeState(
      MasterSyncService.watermarkKey(CacheKind.party),
      '2026-10-21T00:00:00.000Z',
    );
    env.api.on('GET', '/parties', (r) {
      expect(r.query['since'], '2026-10-21T00:00:00.000Z');
      return FakeResponse.ok(
        [
          {'id': 'p1', 'name': 'Renamed', 'deleted': false},
          {'id': 'p2', 'name': 'Gone', 'deleted': true},
        ],
        meta: {'page': 1, 'limit': 100, 'total': 2, 'nextSince': '2026-10-22T00:00:00.000Z'},
      );
    });

    await masters.pull([parties], can: (_) => true);

    final rows = await cache.all(CacheKind.party);
    expect(rows.single['name'], 'Renamed');
  });

  test('a full list replaces what was there, per kiln when asked', () async {
    await cache.replace(CacheKind.dispatch, [
      {'id': 'old-a'},
    ], siteId: kilnA);
    await cache.replace(CacheKind.dispatch, [
      {'id': 'old-b'},
    ], siteId: kilnB);
    env.api.on('GET', '/dispatches', (r) {
      expect(r.query['siteId'], kilnA);
      return FakeResponse.ok(
        [
          {'id': 'new-${r.query['status']}'},
        ],
        meta: {'page': 1, 'limit': 100, 'total': 1},
      );
    });
    const spec = PullSpec(
      kind: CacheKind.dispatch,
      path: '/dispatches',
      mode: PullMode.full,
      perSite: true,
      query: {
        'status': ['draft', 'confirmed'],
      },
    );

    await masters.pull([spec], can: (_) => true, siteId: kilnA);

    final a = (await cache.all(CacheKind.dispatch, siteId: kilnA)).map((r) => r['id']).toSet();
    expect(a, {'new-draft', 'new-confirmed'});
    expect((await cache.all(CacheKind.dispatch, siteId: kilnB)).single['id'], 'old-b');
  });

  test('lists the role may not read are skipped; a refused list does not stop the rest', () async {
    env.api
      ..on('GET', '/parties', (_) => FakeResponse.error(403, 'FORBIDDEN'))
      ..on(
        'GET',
        '/sites',
        (_) => FakeResponse.ok(
          [
            {'id': kilnA, 'name': 'Kiln A', 'code': 'KA'},
          ],
          meta: {'nextSince': '2026-10-22T00:00:00.000Z'},
        ),
      );
    const items = PullSpec(
      kind: CacheKind.item,
      path: '/inventory/items',
      mode: PullMode.delta,
      permission: 'inventory.view',
    );
    const sites = PullSpec(
      kind: CacheKind.site,
      path: '/sites',
      mode: PullMode.delta,
      paged: false,
    );

    final result = await masters.pull([parties, items, sites], can: (p) => p == 'parties.view');

    expect(env.api.sent('GET', '/inventory/items'), isEmpty);
    expect(result.pulled, 1);
    expect(await cache.all(CacheKind.site), hasLength(1));
  });

  test('losing the network stops the pull and keeps the watermark', () async {
    env.api.offline = true;
    final result = await masters.pull([parties], can: (_) => true);
    expect(result.offline, isTrue);
    expect(await env.db.readState(MasterSyncService.watermarkKey(CacheKind.party)), isNull);
  });
}
