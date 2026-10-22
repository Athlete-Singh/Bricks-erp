// Runs the app's own sync engine and payload builders against a REAL BRICS API.
// Skipped unless LIVE_API_URL is set — never part of the normal gate.
//
//   LIVE_API_URL=http://127.0.0.1:4100/api/v1 LIVE_LOGIN=9000000000 LIVE_PASSWORD=… \
//     flutter test integration/live_api_test.dart
//
// It creates masters and entries in that database: point it at a local or
// scratch API, never at production.
import 'dart:io';

import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/network/auth_interceptor.dart';
import 'package:brics_mobile/core/storage/key_value_store.dart';
import 'package:brics_mobile/core/storage/token_store.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/sync_service.dart';
import 'package:brics_mobile/features/attendance/data/attendance_repository.dart';
import 'package:brics_mobile/features/attendance/domain/attendance.dart';
import 'package:brics_mobile/features/dispatch/data/dispatch_repository.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:brics_mobile/features/grn/data/grn_repository.dart';
import 'package:brics_mobile/features/grn/domain/grn.dart';
import 'package:brics_mobile/features/production/data/production_repository.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final base = Platform.environment['LIVE_API_URL'];

  test(
    'all four field entries reach a real API once, in order, and replay without duplicates',
    () async {
      driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final tag = DateTime.now().millisecondsSinceEpoch.toString().substring(7);

      // ── sign in, exactly as the app does ───────────────────────────────────
      final dio = Dio(BaseOptions(baseUrl: base!, contentType: Headers.jsonContentType));
      final tokens = TokenStore(MemoryKeyValueStore());
      dio.interceptors.add(
        AuthInterceptor(
          dio: dio,
          refreshDio: Dio(BaseOptions(baseUrl: base)),
          tokens: tokens,
          onSessionExpired: () {},
        ),
      );
      final api = ApiClient(dio);
      final login = (await api.post(
        '/auth/login',
        body: {
          'emailOrMobile': Platform.environment['LIVE_LOGIN'],
          'password': Platform.environment['LIVE_PASSWORD'],
        },
      )).map;
      await tokens.write(
        AuthTokens(
          accessToken: login['accessToken'] as String,
          refreshToken: login['refreshToken'] as String,
        ),
      );
      final siteId = ((login['sites'] as List).first as Map)['id'] as String;
      final owner = QueueOwner(
        userId: (login['user'] as Map)['id'] as String,
        companyId: (login['company'] as Map)['id'] as String,
      );

      // ── masters the supervisor would pick from (made by the owner) ─────────
      Future<String> make(String path, Map<String, dynamic> body) async =>
          (await api.post(path, body: body)).map['id'] as String;
      final supplier = await make('/parties', {
        'name': 'Live Coal Co $tag',
        'partyTypes': ['supplier'],
      });
      final customer = await make('/parties', {
        'name': 'Live Builders $tag',
        'partyTypes': ['customer'],
      });
      final sardar = await make('/parties', {
        'name': 'Live Sardar $tag',
        'partyTypes': ['sardar'],
      });
      final unit = await make('/inventory/units', {
        'name': 'Tonne $tag',
        'abbreviation': 't$tag'.substring(0, 6),
      });
      final coal = await make('/inventory/items', {
        'name': 'Coal $tag',
        'category': 'raw_material',
        'unitId': unit,
      });
      final yard = await make('/inventory/warehouses', {
        'siteId': siteId,
        'name': 'Live yard $tag',
      });
      final gang = await make('/labour/groups', {
        'sardarPartyId': sardar,
        'name': 'Live gang $tag',
        'activity': 'making',
        'siteId': siteId,
      });
      final w1 = await make('/labour/workers', {'labourGroupId': gang, 'name': 'Asha $tag'});
      final w2 = await make('/labour/workers', {'labourGroupId': gang, 'name': 'Bhola $tag'});

      // ── the phone: an empty Drift store and the real sender ────────────────
      final db = AppDatabase(NativeDatabase.memory());
      addTearDown(db.close);
      final queue = QueueRepository(db, DateTime.now);
      final cache = CacheRepository(db, DateTime.now);
      final sync = SyncService(api: api, queue: queue);

      // Entries made "offline", oldest first, with the app's own payload builders.
      final production = ProductionRepository(queue: queue, cache: cache, api: api);
      final batch = await production.createBatch(
        owner: owner,
        siteId: siteId,
        payload: ProductionPayloads.batch(siteId: siteId, chamber: 'L$tag', batchDate: today),
        title: 'batch',
      );
      for (final (stage, payload) in [
        (
          ProductionStage.making,
          ProductionPayloads.making(entryDate: today, greenBricks: '12000', sardarPartyId: sardar),
        ),
        (ProductionStage.drying, ProductionPayloads.drying(entryDate: today)),
        (ProductionStage.firing, ProductionPayloads.firing(entryDate: today, firedBricks: '11800')),
      ]) {
        await Future<void>.delayed(const Duration(milliseconds: 5));
        await production.recordStage(
          owner: owner,
          siteId: siteId,
          batch: RecordRef(localId: batch),
          stage: stage,
          payload: payload,
          title: stage.name,
        );
      }
      await AttendanceRepository(queue).save(
        owner: owner,
        siteId: siteId,
        payload: AttendancePayloads.roll(
          siteId: siteId,
          labourGroupId: gang,
          date: today,
          lines: [
            AttendanceLine(workerId: w1, mark: AttendanceMark.present, overtimeHours: '2'),
            AttendanceLine(workerId: w2, mark: AttendanceMark.halfDay),
          ],
        ),
        title: 'roll',
      );
      final grn = await GrnRepository(queue).save(
        owner: owner,
        siteId: siteId,
        payload: GrnPayloads.receipt(
          siteId: siteId,
          supplierPartyId: supplier,
          receiptDate: today,
          challanNo: 'CH-$tag',
          lines: [
            {'itemId': coal, 'warehouseId': yard, 'quantity': '25.500'},
          ],
        ),
        title: 'grn',
      );
      final dispatch = DispatchRepository(queue: queue, cache: cache, api: api);
      final challan = await dispatch.raise(
        owner: owner,
        siteId: siteId,
        payload: DispatchPayloads.challan(
          siteId: siteId,
          customerPartyId: customer,
          dispatchDate: today,
          lines: [
            {'itemId': coal, 'warehouseId': yard, 'quantity': '5'},
          ],
        ),
        title: 'challan',
      );
      final gateOut = await dispatch.act(
        owner: owner,
        siteId: siteId,
        challan: RecordRef(localId: challan),
        entity: QueueEntity.dispatchConfirm,
        payload: DispatchPayloads.confirm(confirmedOn: today),
        title: 'gate out',
      );
      await dispatch.act(
        owner: owner,
        siteId: siteId,
        challan: RecordRef(localId: challan),
        entity: QueueEntity.dispatchAcknowledge,
        payload: DispatchPayloads.acknowledge(receivedBy: 'Site engineer', deliveredOn: today),
        title: 'delivered',
        after: await queue.byId(gateOut),
      );

      // ── signal comes back ──────────────────────────────────────────────────
      final result = await sync.push(owner);
      final rows = await (db.select(
        db.syncQueue,
      )..orderBy([(t) => OrderingTerm.asc(t.createdAt)])).get();
      for (final r in rows) {
        expect(
          r.status,
          QueueStatus.synced,
          reason: '${r.entity}: ${r.lastErrorCode} ${r.lastError}',
        );
      }
      expect(result.failed, 0);

      // The server has what the phone entered.
      final batchId = (await queue.byId(batch))!.serverId!;
      final detail = (await api.get('/production/batches/$batchId')).map;
      expect((detail['entries'] as List).map((e) => (e as Map)['stage']), [
        'making',
        'drying',
        'firing',
      ]);
      final challanId = (await queue.byId(challan))!.serverId!;
      expect((await api.get('/dispatches/$challanId')).map['status'], 'delivered');
      expect((await queue.byId(grn))!.serverRef, isNotNull, reason: 'the GRN number came back');

      // ── a lost answer: every create resent with its key returns the original ──
      for (final r in rows.where((r) => r.method == 'POST' && r.dependsOn == null)) {
        final again = await api.send(r.method, r.path, body: r.payloadMap, idempotencyKey: r.id);
        if (again.data is Map) {
          expect((again.data! as Map)['id'], r.serverId, reason: '${r.entity} replay');
        }
      }
      // …and the non-idempotent gate-out, resent, settles as done rather than failing.
      await queue.retry(gateOut);
      await sync.push(owner);
      expect((await queue.byId(gateOut))!.status, QueueStatus.synced);

      // A refusal comes back as a refusal, with the server's reason.
      try {
        await api.post(
          '/production/batches/$batchId/making',
          body: ProductionPayloads.making(entryDate: today, greenBricks: '1'),
        );
        fail('a second making stage must be refused');
      } on ApiException catch (e) {
        expect(e.kind, ApiFailureKind.rejected);
        expect(e.code, 'PRODUCTION_STAGE_DUPLICATE');
      }
    },
    skip: base == null ? 'set LIVE_API_URL to run against a real API' : false,
    timeout: const Timeout(Duration(minutes: 2)),
  );
}
