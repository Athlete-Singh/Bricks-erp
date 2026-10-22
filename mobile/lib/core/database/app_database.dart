import 'package:brics_mobile/core/database/tables.dart';
import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [SyncQueue, CachedRecords, AppState])
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);

  factory AppDatabase.open() => AppDatabase(driftDatabase(name: 'brics'));

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) async {
      await m.createAll();
      await customStatement(
        'CREATE INDEX idx_sync_queue_status ON sync_queue (status, created_at)',
      );
      await customStatement('CREATE INDEX idx_sync_queue_entity ON sync_queue (entity, site_id)');
      await customStatement(
        'CREATE INDEX idx_cached_records_kind_site ON cached_records (kind, site_id)',
      );
    },
  );

  // ── app_state ──────────────────────────────────────────────────────────────

  Future<String?> readState(String key) async {
    final row = await (select(appState)..where((t) => t.key.equals(key))).getSingleOrNull();
    return row?.value;
  }

  Future<void> writeState(String key, String value) {
    return into(appState).insertOnConflictUpdate(AppStateCompanion.insert(key: key, value: value));
  }

  Future<void> deleteState(String key) {
    return (delete(appState)..where((t) => t.key.equals(key))).go();
  }

  /// Sign-out: nothing of one person's company may be left for the next.
  Future<void> wipe() {
    return transaction(() async {
      await delete(syncQueue).go();
      await delete(cachedRecords).go();
      await delete(appState).go();
    });
  }
}
