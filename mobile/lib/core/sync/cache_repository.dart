import 'dart:convert';

import 'package:brics_mobile/core/database/app_database.dart';
import 'package:drift/drift.dart';

/// The `kind` column of `cached_records`.
abstract final class CacheKind {
  static const site = 'site';
  static const party = 'party';
  static const unit = 'unit';
  static const item = 'item';
  static const brickType = 'brick_type';
  static const warehouse = 'warehouse';
  static const labourGroup = 'labour_group';
  static const worker = 'worker';
  static const vehicle = 'vehicle';
  static const driver = 'driver';
  static const productionBatch = 'production_batch';
  static const productionBatchDetail = 'production_batch_detail';
  static const dispatch = 'dispatch';
}

/// Read-only copies of server rows, stored as JSON per kind.
class CacheRepository {
  CacheRepository(this._db, this._now);

  final AppDatabase _db;
  final DateTime Function() _now;

  /// Applies a delta page: live rows are upserted, tombstones (`deleted: true`) removed.
  Future<void> applyDelta(String kind, List<Map<String, dynamic>> rows, {String? siteKey}) {
    return _db.transaction(() async {
      for (final row in rows) {
        final id = row['id'] as String;
        if (row['deleted'] == true) {
          await (_db.delete(
            _db.cachedRecords,
          )..where((t) => t.kind.equals(kind) & t.id.equals(id))).go();
        } else {
          await _db.into(_db.cachedRecords).insertOnConflictUpdate(_companion(kind, row, siteKey));
        }
      }
    });
  }

  /// Replaces every row of [kind] (optionally only one kiln's) with [rows] —
  /// for lists the server cannot send as a delta.
  Future<void> replace(
    String kind,
    List<Map<String, dynamic>> rows, {
    String? siteKey,
    String? siteId,
  }) {
    return _db.transaction(() async {
      final del = _db.delete(_db.cachedRecords)..where((t) => t.kind.equals(kind));
      if (siteId != null) del.where((t) => t.siteId.equals(siteId));
      await del.go();
      await _db.batch((b) {
        b.insertAllOnConflictUpdate(_db.cachedRecords, [
          for (final row in rows) _companion(kind, row, siteKey, siteId: siteId),
        ]);
      });
    });
  }

  Future<void> put(String kind, Map<String, dynamic> row, {String? siteId}) {
    return _db
        .into(_db.cachedRecords)
        .insertOnConflictUpdate(_companion(kind, row, null, siteId: siteId));
  }

  Future<Map<String, dynamic>?> get(String kind, String id) async {
    final row = await (_db.select(
      _db.cachedRecords,
    )..where((t) => t.kind.equals(kind) & t.id.equals(id))).getSingleOrNull();
    return row == null ? null : _decode(row);
  }

  Future<List<Map<String, dynamic>>> all(String kind, {String? siteId}) async {
    return (await _query(kind, siteId).get()).map(_decode).toList();
  }

  Stream<List<Map<String, dynamic>>> watch(String kind, {String? siteId}) {
    return _query(kind, siteId).watch().map((rows) => rows.map(_decode).toList());
  }

  /// Everything cached for another company is meaningless once someone else signs in.
  Future<void> clear() => _db.delete(_db.cachedRecords).go();

  SimpleSelectStatement<$CachedRecordsTable, CachedRow> _query(String kind, String? siteId) {
    final q = _db.select(_db.cachedRecords)..where((t) => t.kind.equals(kind));
    // Rows with no kiln (a gang shared by every kiln) belong to every kiln.
    if (siteId != null) q.where((t) => t.siteId.equals(siteId) | t.siteId.isNull());
    return q;
  }

  CachedRecordsCompanion _companion(
    String kind,
    Map<String, dynamic> row,
    String? siteKey, {
    String? siteId,
  }) {
    return CachedRecordsCompanion.insert(
      kind: kind,
      id: row['id'] as String,
      siteId: Value(siteId ?? (siteKey == null ? null : row[siteKey] as String?)),
      json: jsonEncode(row),
      updatedAt: _now(),
    );
  }

  static Map<String, dynamic> _decode(CachedRow row) =>
      (jsonDecode(row.json) as Map).cast<String, dynamic>();
}
