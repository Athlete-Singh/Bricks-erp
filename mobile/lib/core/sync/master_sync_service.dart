import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';

enum PullMode {
  /// SYN-02: `?since=` returns changed rows and tombstones; the watermark is kept.
  delta,

  /// No `since` on the server: fetch everything and replace.
  full,
}

/// One server list the phone keeps a copy of.
class PullSpec {
  const PullSpec({
    required this.kind,
    required this.path,
    required this.mode,
    this.permission,
    this.siteKey,
    this.paged = true,
    this.perSite = false,
    this.query = const {},
  });

  final String kind;
  final String path;
  final PullMode mode;

  /// Skipped when the role lacks it — the server would answer 403 anyway.
  final String? permission;

  /// The field naming the row's kiln, so lists can be filtered per kiln.
  final String? siteKey;
  final bool paged;

  /// Fetched for the selected kiln only (`?siteId=`), replaced per kiln.
  final bool perSite;

  /// Extra filters; a list value fetches once per value (e.g. two statuses).
  final Map<String, Object> query;
}

/// The masters every field screen picks from. Feature lists (open batches,
/// open challans) are added by the features through [PullSpec]s of their own.
const masterPullSpecs = <PullSpec>[
  PullSpec(kind: CacheKind.site, path: ApiEndpoints.sites, mode: PullMode.delta, paged: false),
  PullSpec(
    kind: CacheKind.party,
    path: ApiEndpoints.parties,
    mode: PullMode.delta,
    permission: Permissions.partiesView,
  ),
  PullSpec(
    kind: CacheKind.unit,
    path: ApiEndpoints.units,
    mode: PullMode.delta,
    permission: Permissions.inventoryView,
  ),
  PullSpec(
    kind: CacheKind.item,
    path: ApiEndpoints.items,
    mode: PullMode.delta,
    permission: Permissions.inventoryView,
  ),
  PullSpec(
    kind: CacheKind.brickType,
    path: ApiEndpoints.brickTypes,
    mode: PullMode.delta,
    permission: Permissions.inventoryView,
  ),
  PullSpec(
    kind: CacheKind.warehouse,
    path: ApiEndpoints.warehouses,
    mode: PullMode.delta,
    permission: Permissions.inventoryView,
    siteKey: 'siteId',
  ),
  PullSpec(
    kind: CacheKind.labourGroup,
    path: ApiEndpoints.labourGroups,
    mode: PullMode.full,
    permission: Permissions.labourView,
    siteKey: 'siteId',
    paged: false,
  ),
  PullSpec(
    kind: CacheKind.worker,
    path: ApiEndpoints.labourWorkers,
    mode: PullMode.full,
    permission: Permissions.labourView,
    paged: false,
  ),
  PullSpec(
    kind: CacheKind.vehicle,
    path: ApiEndpoints.vehicles,
    mode: PullMode.full,
    permission: Permissions.transportView,
  ),
  PullSpec(
    kind: CacheKind.driver,
    path: ApiEndpoints.drivers,
    mode: PullMode.full,
    permission: Permissions.transportView,
  ),
];

class PullResult {
  const PullResult({required this.pulled, this.offline = false, this.unauthenticated = false});

  final int pulled;
  final bool offline;
  final bool unauthenticated;
}

class MasterSyncService {
  MasterSyncService({required this.api, required this.cache, required this.db});

  final ApiClient api;
  final CacheRepository cache;
  final AppDatabase db;

  static const pageSize = 100;
  static const epoch = '1970-01-01T00:00:00.000Z';

  static String watermarkKey(String kind) => 'since.$kind';

  /// Pulls every spec the role may read. One list failing (a 403, a bad row)
  /// does not stop the others; losing the network does.
  Future<PullResult> pull(
    List<PullSpec> specs, {
    required bool Function(String permission) can,
    String? siteId,
  }) async {
    var pulled = 0;
    for (final spec in specs) {
      if (spec.permission != null && !can(spec.permission!)) continue;
      if (spec.perSite && siteId == null) continue;
      try {
        switch (spec.mode) {
          case PullMode.delta:
            await _pullDelta(spec);
          case PullMode.full:
            await _pullFull(spec, siteId);
        }
        pulled++;
      } on ApiException catch (e) {
        if (e.kind == ApiFailureKind.network || e.kind == ApiFailureKind.timeout) {
          return PullResult(pulled: pulled, offline: true);
        }
        if (e.kind == ApiFailureKind.unauthenticated) {
          return PullResult(pulled: pulled, unauthenticated: true);
        }
        // A refused list keeps its last copy; the rest still refresh.
      }
    }
    return PullResult(pulled: pulled);
  }

  Future<void> _pullDelta(PullSpec spec) async {
    final since = await db.readState(watermarkKey(spec.kind)) ?? epoch;
    var page = 1;
    String? nextSince;
    while (true) {
      final envelope = await api.get(
        spec.path,
        query: {
          'since': since,
          if (spec.paged) ...{'page': page, 'limit': pageSize},
        },
      );
      await cache.applyDelta(spec.kind, envelope.list, siteKey: spec.siteKey);
      nextSince = envelope.meta?['nextSince'] as String? ?? nextSince;
      final total = envelope.meta?['total'];
      if (!spec.paged || total is! int || page * pageSize >= total) break;
      page++;
    }
    // Only move the watermark once every page has landed.
    if (nextSince != null) await db.writeState(watermarkKey(spec.kind), nextSince);
  }

  Future<void> _pullFull(PullSpec spec, String? siteId) async {
    final rows = <Map<String, dynamic>>[];
    final base = <String, Object?>{if (spec.perSite) 'siteId': siteId};
    // A list-valued filter (two statuses) is fetched once per value.
    final multi = spec.query.entries.where((e) => e.value is List).firstOrNull;
    final variants = multi == null
        ? [spec.query]
        : [
            for (final v in multi.value as List) {...spec.query, multi.key: v},
          ];
    for (final variant in variants) {
      var page = 1;
      while (true) {
        final envelope = await api.get(
          spec.path,
          query: {
            ...base,
            ...variant,
            if (spec.paged) ...{'page': page, 'limit': pageSize},
          },
        );
        rows.addAll(envelope.list);
        final total = envelope.meta?['total'];
        if (!spec.paged || total is! int || page * pageSize >= total) break;
        page++;
      }
    }
    await cache.replace(
      spec.kind,
      rows,
      siteKey: spec.siteKey,
      siteId: spec.perSite ? siteId : null,
    );
  }
}
