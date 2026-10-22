import 'dart:convert';

import 'package:brics_mobile/core/database/app_database.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

/// The `entity` column of `sync_queue` — one per kind of field entry.
abstract final class QueueEntity {
  static const productionBatch = 'production_batch';
  static const productionMaking = 'production_making';
  static const productionDrying = 'production_drying';
  static const productionFiring = 'production_firing';
  static const productionSorting = 'production_sorting';
  static const attendance = 'attendance';
  static const goodsReceipt = 'goods_receipt';
  static const dispatch = 'dispatch';
  static const dispatchConfirm = 'dispatch_confirm';
  static const dispatchAcknowledge = 'dispatch_acknowledge';

  static const List<String> production = [
    productionBatch,
    productionMaking,
    productionDrying,
    productionFiring,
    productionSorting,
  ];
  static const List<String> dispatchAll = [dispatch, dispatchConfirm, dispatchAcknowledge];
}

abstract final class QueueStatus {
  static const pending = 'pending';
  static const syncing = 'syncing';
  static const synced = 'synced';
  static const failed = 'failed';
}

/// What a feature hands the queue. [id] may be set up front so a child entry
/// can name it in [dependsOn] before either is saved.
class QueueDraft {
  QueueDraft({
    required this.entity,
    required this.method,
    required this.path,
    required this.payload,
    required this.title,
    this.siteId,
    this.dependsOn,
    String? id,
  }) : id = id ?? const Uuid().v4();

  final String id;
  final String entity;
  final String method;
  final String path;
  final Map<String, dynamic> payload;
  final String title;
  final String? siteId;
  final String? dependsOn;
}

/// Who the entry belongs to. Entries are only ever sent with their author's token.
class QueueOwner {
  const QueueOwner({required this.userId, required this.companyId});

  final String userId;
  final String companyId;
}

class QueueCounts {
  const QueueCounts({required this.pending, required this.failed});

  final int pending;
  final int failed;
}

class QueueRepository {
  QueueRepository(this._db, this._now);

  final AppDatabase _db;
  final DateTime Function() _now;

  $SyncQueueTable get _q => _db.syncQueue;

  Future<String> enqueue(QueueDraft draft, QueueOwner owner) async {
    final now = _now();
    await _db
        .into(_q)
        .insert(
          SyncQueueCompanion.insert(
            id: draft.id,
            entity: draft.entity,
            method: draft.method,
            path: draft.path,
            payload: jsonEncode(draft.payload),
            dependsOn: Value(draft.dependsOn),
            title: draft.title,
            siteId: Value(draft.siteId),
            userId: owner.userId,
            companyId: owner.companyId,
            createdAt: now,
            updatedAt: now,
          ),
        );
    return draft.id;
  }

  Future<QueueRow?> byId(String id) =>
      (_db.select(_q)..where((t) => t.id.equals(id))).getSingleOrNull();

  Stream<QueueRow?> watchById(String id) =>
      (_db.select(_q)..where((t) => t.id.equals(id))).watchSingleOrNull();

  /// Newest first — the order a supervisor scans "what did I enter today".
  Stream<List<QueueRow>> watch({required String userId, List<String>? entities, String? siteId}) {
    final q = _db.select(_q)..where((t) => t.userId.equals(userId));
    if (entities != null) q.where((t) => t.entity.isIn(entities));
    if (siteId != null) q.where((t) => t.siteId.equals(siteId));
    q.orderBy([(t) => OrderingTerm.desc(t.createdAt)]);
    return q.watch();
  }

  Stream<QueueCounts> watchCounts(String userId) {
    final q = _db.select(_q)
      ..where((t) => t.userId.equals(userId) & t.status.isNotValue(QueueStatus.synced));
    return q.watch().map(
      (rows) => QueueCounts(
        pending: rows.where((r) => r.status != QueueStatus.failed).length,
        failed: rows.where((r) => r.status == QueueStatus.failed).length,
      ),
    );
  }

  Future<int> unsentCount(String userId) async {
    final rows = await (_db.select(
      _q,
    )..where((t) => t.userId.equals(userId) & t.status.isNotValue(QueueStatus.synced))).get();
    return rows.length;
  }

  /// FIFO: an entry is never sent before one made earlier (docs/09 "Ordering").
  Future<List<QueueRow>> due(String userId) {
    final now = _now();
    return (_db.select(_q)
          ..where(
            (t) =>
                t.userId.equals(userId) &
                t.status.equals(QueueStatus.pending) &
                (t.nextAttemptAt.isNull() | t.nextAttemptAt.isSmallerOrEqualValue(now)),
          )
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt), (t) => OrderingTerm.asc(t.id)]))
        .get();
  }

  /// When the next retry falls due, so the scheduler can wake for it.
  Future<DateTime?> nextRetryAt(String userId) async {
    final row =
        await (_db.select(_q)
              ..where(
                (t) =>
                    t.userId.equals(userId) &
                    t.status.equals(QueueStatus.pending) &
                    t.nextAttemptAt.isNotNull(),
              )
              ..orderBy([(t) => OrderingTerm.asc(t.nextAttemptAt)])
              ..limit(1))
            .getSingleOrNull();
    return row?.nextAttemptAt;
  }

  Future<void> markSyncing(String id) =>
      _update(id, const SyncQueueCompanion(status: Value(QueueStatus.syncing)));

  Future<void> markSynced(String id, {String? serverId, String? serverRef, Object? response}) {
    return _update(
      id,
      SyncQueueCompanion(
        status: const Value(QueueStatus.synced),
        serverId: Value(serverId),
        serverRef: Value(serverRef),
        response: Value(response == null ? null : jsonEncode(response)),
        lastError: const Value(null),
        lastErrorCode: const Value(null),
        nextAttemptAt: const Value(null),
        syncedAt: Value(_now()),
      ),
    );
  }

  /// A network or server failure: try again after [delay].
  Future<void> scheduleRetry(
    String id, {
    required int attempts,
    required Duration delay,
    String? code,
    String? error,
  }) {
    return _update(
      id,
      SyncQueueCompanion(
        status: const Value(QueueStatus.pending),
        attempts: Value(attempts),
        nextAttemptAt: Value(_now().add(delay)),
        lastErrorCode: Value(code),
        lastError: Value(error),
      ),
    );
  }

  /// The server read the entry and refused it. Only a person can fix that.
  Future<void> markFailed(String id, {required String code, required String error}) {
    return _update(
      id,
      SyncQueueCompanion(
        status: const Value(QueueStatus.failed),
        lastErrorCode: Value(code),
        lastError: Value(error),
        nextAttemptAt: const Value(null),
      ),
    );
  }

  /// Back to the queue untouched — the attempt never really happened (signed out mid-send).
  Future<void> release(String id) =>
      _update(id, const SyncQueueCompanion(status: Value(QueueStatus.pending)));

  /// An app killed mid-send leaves rows in `syncing`; they were never confirmed.
  Future<void> releaseInterrupted() {
    return (_db.update(_q)..where((t) => t.status.equals(QueueStatus.syncing))).write(
      const SyncQueueCompanion(status: Value(QueueStatus.pending)),
    );
  }

  Future<void> retry(String id) {
    return _update(
      id,
      const SyncQueueCompanion(
        status: Value(QueueStatus.pending),
        attempts: Value(0),
        nextAttemptAt: Value(null),
        lastError: Value(null),
        lastErrorCode: Value(null),
      ),
    );
  }

  /// Resend now: pulls every waiting retry forward (the "Sync now" button).
  Future<void> expediteRetries(String userId) {
    return (_db.update(_q)
          ..where((t) => t.userId.equals(userId) & t.status.equals(QueueStatus.pending)))
        .write(const SyncQueueCompanion(nextAttemptAt: Value(null)));
  }

  /// A corrected entry after the server refused it. Same id, so still one
  /// record: the refused attempt never stored the key on the server.
  Future<void> updateFailed(
    String id, {
    required Map<String, dynamic> payload,
    required String title,
  }) {
    return (_db.update(
      _q,
    )..where((t) => t.id.equals(id) & t.status.equals(QueueStatus.failed))).write(
      SyncQueueCompanion(
        payload: Value(jsonEncode(payload)),
        title: Value(title),
        status: const Value(QueueStatus.pending),
        attempts: const Value(0),
        nextAttemptAt: const Value(null),
        lastError: const Value(null),
        lastErrorCode: const Value(null),
        updatedAt: Value(_now()),
      ),
    );
  }

  /// Removes an unsent entry and everything waiting on it.
  Future<int> discard(String id) {
    return _db.transaction(() async {
      final ids = <String>[id];
      for (var i = 0; i < ids.length; i++) {
        final children = await (_db.select(_q)..where((t) => t.dependsOn.equals(ids[i]))).get();
        ids.addAll(children.map((c) => c.id));
      }
      return await (_db.delete(
        _q,
      )..where((t) => t.id.isIn(ids) & t.status.isNotValue(QueueStatus.synced))).go();
    });
  }

  Future<void> _update(String id, SyncQueueCompanion values) {
    return (_db.update(
      _q,
    )..where((t) => t.id.equals(id))).write(values.copyWith(updatedAt: Value(_now())));
  }
}

extension QueueRowX on QueueRow {
  Map<String, dynamic> get payloadMap => (jsonDecode(payload) as Map).cast<String, dynamic>();

  Map<String, dynamic>? get responseMap {
    final r = response;
    if (r == null) return null;
    final decoded = jsonDecode(r);
    return decoded is Map ? decoded.cast<String, dynamic>() : null;
  }
}
