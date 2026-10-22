import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/sync_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_api.dart';
import '../helpers/test_env.dart';

void main() {
  late TestEnv env;
  late QueueRepository queue;
  late SyncService sync;
  const owner = QueueOwner(userId: 'u1', companyId: companyId);

  setUp(() {
    env = TestEnv();
    queue = QueueRepository(env.db, () => env.now);
    final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))..httpClientAdapter = env.api;
    sync = SyncService(api: ApiClient(dio), queue: queue);
  });
  tearDown(() => env.dispose());

  Future<String> enqueue(String entity, String path, {String? dependsOn, String? id}) {
    return queue.enqueue(
      QueueDraft(
        id: id,
        entity: entity,
        method: path.endsWith('confirm') || path.endsWith('acknowledge') ? 'PATCH' : 'POST',
        path: path,
        payload: {'chamber': '3'},
        title: 'entry',
        dependsOn: dependsOn,
      ),
      owner,
    );
  }

  test('backoff follows docs/09: 5 s, 30 s, 2 min, then 10 min', () {
    expect([1, 2, 3, 4, 9].map(backoffFor), [
      const Duration(seconds: 5),
      const Duration(seconds: 30),
      const Duration(minutes: 2),
      const Duration(minutes: 10),
      const Duration(minutes: 10),
    ]);
  });

  test('sends the row id as Idempotency-Key and keeps the server id and number', () async {
    env.api.on(
      'POST',
      '/dispatches',
      (_) => FakeResponse.ok({'id': 's1', 'challanNo': 'DC-00007'}, status: 201),
    );
    final id = await enqueue(QueueEntity.dispatch, '/dispatches');

    final result = await sync.push(owner);

    expect(result.sent, 1);
    expect(env.api.requests.single.header('Idempotency-Key'), id);
    final row = (await queue.byId(id))!;
    expect(row.status, QueueStatus.synced);
    expect(row.serverId, 's1');
    expect(row.serverRef, 'DC-00007');
  });

  test("a child waits for its parent, then goes to the parent's server id", () async {
    final batch = IdempotentCreate((_) => {'id': 'server-batch'});
    env.api
      ..on('POST', '/production/batches', batch.call)
      ..on(
        'POST',
        '/production/batches/*/making',
        (_) => FakeResponse.ok({'ok': true}, status: 201),
      );
    const parentId = '11111111-1111-4111-8111-111111111111';
    await enqueue(QueueEntity.productionBatch, '/production/batches', id: parentId);
    env.now = env.now.add(const Duration(seconds: 1));
    final child = await enqueue(
      QueueEntity.productionMaking,
      '/production/batches/{parent}/making',
      dependsOn: parentId,
    );

    await sync.push(owner);

    expect(env.api.sent('POST', '/production/batches/server-batch/making'), hasLength(1));
    expect((await queue.byId(child))!.status, QueueStatus.synced);
  });

  test('a child of a refused parent is not sent', () async {
    env.api.on(
      'POST',
      '/production/batches',
      (_) => FakeResponse.error(400, 'PRODUCTION_DATE_IN_FUTURE'),
    );
    const parentId = '22222222-2222-4222-8222-222222222222';
    await enqueue(QueueEntity.productionBatch, '/production/batches', id: parentId);
    final child = await enqueue(
      QueueEntity.productionMaking,
      '/production/batches/{parent}/making',
      dependsOn: parentId,
    );

    await sync.push(owner);

    expect((await queue.byId(parentId))!.status, QueueStatus.failed);
    expect((await queue.byId(child))!.status, QueueStatus.pending);
    expect(env.api.sent('POST', '/production/batches/'), isEmpty);
  });

  test('no signal stops the run and schedules a retry 5 s out', () async {
    env.api.offline = true;
    final first = await enqueue(QueueEntity.dispatch, '/dispatches');
    env.now = env.now.add(const Duration(milliseconds: 1));
    await enqueue(QueueEntity.dispatch, '/dispatches');
    env.now = env.now.subtract(const Duration(milliseconds: 1));

    final result = await sync.push(owner);

    expect(result.offline, isTrue);
    final row = (await queue.byId(first))!;
    expect(row.status, QueueStatus.pending);
    expect(row.attempts, 1);
    expect(row.nextAttemptAt, env.now.add(const Duration(seconds: 5)));
    expect(
      await queue.due('u1'),
      hasLength(1),
      reason: 'the second waits its turn; the first is backing off',
    );

    env.now = env.now.add(const Duration(seconds: 6));
    expect(await queue.due('u1'), hasLength(2));
  });

  test('a response lost after the server saved it is replayed, not duplicated', () async {
    final create = IdempotentCreate((_) => {'id': 'g1', 'grnNo': 'GRN-00001'});
    env.api
      ..on('POST', '/purchases/goods-receipts', create.call)
      ..dropResponses = 1;
    final id = await enqueue(QueueEntity.goodsReceipt, '/purchases/goods-receipts');

    await sync.push(owner);
    expect(
      (await queue.byId(id))!.status,
      QueueStatus.pending,
      reason: 'a timeout is not a refusal',
    );

    env.now = env.now.add(const Duration(minutes: 1));
    await sync.push(owner);

    expect(create.created, 1);
    expect(env.api.sent('POST', '/purchases/goods-receipts'), hasLength(2));
    expect((await queue.byId(id))!.serverRef, 'GRN-00001');
  });

  test('a refusal is kept with the reason; send again clears it', () async {
    env.api.on('POST', '/labour/attendance', (_) {
      return const FakeResponse(400, {
        'error': {
          'code': 'VALIDATION_FAILED',
          'message': 'Validation failed',
          'details': [
            {'field': 'entries', 'message': 'At least one attendance entry is required'},
          ],
        },
      });
    });
    final id = await enqueue(QueueEntity.attendance, '/labour/attendance');

    await sync.push(owner);
    var row = (await queue.byId(id))!;
    expect(row.status, QueueStatus.failed);
    expect(row.lastError, contains('At least one attendance entry is required'));

    await queue.retry(id);
    row = (await queue.byId(id))!;
    expect(row.status, QueueStatus.pending);
    expect(row.lastError, isNull);
  });

  test('a finished session leaves the entry waiting, untouched', () async {
    env.api.on('POST', '/dispatches', (_) => FakeResponse.error(401, 'UNAUTHORIZED'));
    final id = await enqueue(QueueEntity.dispatch, '/dispatches');

    final result = await sync.push(owner);

    expect(result.unauthenticated, isTrue);
    final row = (await queue.byId(id))!;
    expect(row.status, QueueStatus.pending);
    expect(row.attempts, 0);
  });

  test("only the author's entries are sent", () async {
    env.api.on('POST', '/dispatches', (_) => FakeResponse.ok({'id': 'x'}, status: 201));
    await queue.enqueue(
      QueueDraft(
        entity: QueueEntity.dispatch,
        method: 'POST',
        path: '/dispatches',
        payload: {},
        title: 't',
      ),
      const QueueOwner(userId: 'someone-else', companyId: companyId),
    );
    await sync.push(owner);
    expect(env.api.requests, isEmpty);
  });

  group('dispatch state changes are not idempotent on the server', () {
    test('"already confirmed" after a lost response counts as done', () async {
      env.api
        ..on(
          'PATCH',
          '/dispatches/*/confirm',
          (_) => FakeResponse.error(400, 'DISPATCH_NOT_DRAFT', 'Challan DC-1 is already confirmed'),
        )
        ..on('GET', '/dispatches/*', (_) => FakeResponse.ok({'id': 'd1', 'status': 'confirmed'}));
      final id = await enqueue(QueueEntity.dispatchConfirm, '/dispatches/d1/confirm');

      await sync.push(owner);

      expect((await queue.byId(id))!.status, QueueStatus.synced);
    });

    test('a challan cancelled meanwhile is a real refusal', () async {
      env.api
        ..on('PATCH', '/dispatches/*/confirm', (_) => FakeResponse.error(400, 'DISPATCH_NOT_DRAFT'))
        ..on('GET', '/dispatches/*', (_) => FakeResponse.ok({'id': 'd1', 'status': 'cancelled'}));
      final id = await enqueue(QueueEntity.dispatchConfirm, '/dispatches/d1/confirm');

      await sync.push(owner);

      expect((await queue.byId(id))!.status, QueueStatus.failed);
    });

    test('"already delivered" on an acknowledgement counts as done', () async {
      env.api
        ..on(
          'PATCH',
          '/dispatches/*/acknowledge',
          (_) => FakeResponse.error(400, 'DISPATCH_ALREADY_DELIVERED'),
        )
        ..on('GET', '/dispatches/*', (_) => FakeResponse.ok({'id': 'd1', 'status': 'delivered'}));
      final id = await enqueue(QueueEntity.dispatchAcknowledge, '/dispatches/d1/acknowledge');

      await sync.push(owner);

      expect((await queue.byId(id))!.status, QueueStatus.synced);
    });
  });

  test('discarding an entry removes what depends on it', () async {
    const parentId = '33333333-3333-4333-8333-333333333333';
    await enqueue(QueueEntity.dispatch, '/dispatches', id: parentId);
    final child = await enqueue(
      QueueEntity.dispatchConfirm,
      '/dispatches/{parent}/confirm',
      dependsOn: parentId,
    );

    expect(await queue.discard(parentId), 2);
    expect(await queue.byId(child), isNull);
  });

  test('an app killed mid-send leaves nothing stuck in "sending"', () async {
    final id = await enqueue(QueueEntity.dispatch, '/dispatches');
    await queue.markSyncing(id);
    await queue.releaseInterrupted();
    expect((await queue.byId(id))!.status, QueueStatus.pending);
  });
}
