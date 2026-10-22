import 'package:drift/drift.dart';

/// Every entry made on the phone, from the moment it is saved until (and after)
/// the server confirms it. The row *is* the field record: the app never edits
/// an entry the server has accepted (docs/09-offline-sync.md), so there is no
/// second per-feature table to keep in step with this one (ADR-053).
@DataClassName('QueueRow')
class SyncQueue extends Table {
  @override
  String get tableName => 'sync_queue';

  /// Client UUID. Also the `Idempotency-Key`, so a resend is a replay.
  TextColumn get id => text()();

  /// What this is, e.g. `production_batch`, `dispatch_confirm` (see `QueueEntity`).
  TextColumn get entity => text()();
  TextColumn get method => text()();

  /// API path; `{parent}` is replaced by the parent entry's server id at send time.
  TextColumn get path => text()();
  TextColumn get payload => text()();

  /// The local id of an entry that must reach the server first (a batch before
  /// its stages, a challan before its confirmation).
  TextColumn get dependsOn => text().nullable()();

  /// `pending` · `syncing` · `synced` · `failed`.
  TextColumn get status => text().withDefault(const Constant('pending'))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  DateTimeColumn get nextAttemptAt => dateTime().nullable()();
  TextColumn get lastErrorCode => text().nullable()();
  TextColumn get lastError => text().nullable()();

  /// What the server called it once accepted: its id, and a human number
  /// (challan no., GRN no.) where it has one.
  TextColumn get serverId => text().nullable()();
  TextColumn get serverRef => text().nullable()();
  TextColumn get response => text().nullable()();

  /// One line the supervisor recognises in a list ("Chamber 3 · 12,000 green").
  TextColumn get title => text()();
  TextColumn get siteId => text().nullable()();

  /// Entries are sent with the token of the person who made them — never another's.
  TextColumn get userId => text()();
  TextColumn get companyId => text()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get syncedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Read-only copies of server data: masters (parties, items…) pulled by
/// `?since=`, and the open batches / challans the supervisor acts on.
@DataClassName('CachedRow')
class CachedRecords extends Table {
  @override
  String get tableName => 'cached_records';

  TextColumn get kind => text()();
  TextColumn get id => text()();
  TextColumn get siteId => text().nullable()();
  TextColumn get json => text()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {kind, id};
}

/// Small settings: delta watermarks, the chosen kiln, last sync time.
@DataClassName('AppStateRow')
class AppState extends Table {
  @override
  String get tableName => 'app_state';

  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}
