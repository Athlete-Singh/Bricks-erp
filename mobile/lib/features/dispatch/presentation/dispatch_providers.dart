import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/master_sync_service.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/record_ref.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/dispatch/data/dispatch_repository.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';

/// Challans still to leave the gate or to be signed for, at this kiln.
const dispatchPullSpecs = <PullSpec>[
  PullSpec(
    kind: CacheKind.dispatch,
    path: ApiEndpoints.dispatches,
    mode: PullMode.full,
    permission: Permissions.dispatchView,
    perSite: true,
    siteKey: 'siteId',
    query: {
      'status': [DispatchStatus.draft, DispatchStatus.confirmed],
    },
  ),
];

final dispatchRepositoryProvider = Provider<DispatchRepository>(
  (ref) => DispatchRepository(
    queue: ref.watch(queueRepositoryProvider),
    cache: ref.watch(cacheRepositoryProvider),
    api: ref.watch(apiClientProvider),
  ),
);

final _cachedChallansProvider = StreamProvider<List<Map<String, dynamic>>>((ref) {
  final siteId = ref.watch(currentSessionProvider)?.siteId;
  if (siteId == null) return Stream.value(const []);
  return ref.watch(cacheRepositoryProvider).watch(CacheKind.dispatch, siteId: siteId);
});

ChallanView _fromServer(Map<String, dynamic> d) => ChallanView(
  ref: RecordRef(serverId: d['id'] as String),
  customerPartyId: d['customerPartyId'] as String,
  dispatchDate: d['dispatchDate'] as String,
  challanNo: d['challanNo'] as String?,
  serverStatus: d['status'] as String?,
  vehicleId: d['vehicleId'] as String?,
);

ChallanView _fromRow(QueueRow row, {RecordRef? ref}) {
  final p = row.payloadMap;
  return ChallanView(
    ref: ref ?? RecordRef(localId: row.id),
    customerPartyId: p['customerPartyId'] as String,
    dispatchDate: p['dispatchDate'] as String,
    challanNo: row.serverRef,
    localRow: row,
    vehicleId: p['vehicleId'] as String?,
  );
}

/// The server's open challans plus those raised on this phone and not yet
/// listed back, newest first.
final challansProvider = Provider<AsyncValue<List<ChallanView>>>((ref) {
  final cached = ref.watch(_cachedChallansProvider);
  final rows = ref.watch(queueRowsProvider(QueueGroup.dispatch));
  if (cached is AsyncLoading || rows is AsyncLoading) return const AsyncLoading();
  final server = cached.value ?? const [];
  final serverIds = {for (final d in server) d['id'] as String};
  final views = <ChallanView>[
    for (final d in server) _fromServer(d),
    for (final row in rows.value ?? const <QueueRow>[])
      if (row.entity == QueueEntity.dispatch && !serverIds.contains(row.serverId)) _fromRow(row),
  ]..sort((a, b) => b.dispatchDate.compareTo(a.dispatchDate));
  return AsyncData(views);
});

final ProviderFamily<ChallanView?, RecordRef> challanViewProvider =
    Provider.family<ChallanView?, RecordRef>((ref, target) {
      final all = ref.watch(challansProvider).value ?? const [];
      final direct = all.where((c) => c.ref == target).firstOrNull;
      if (direct != null) return direct;
      final localId = target.localId;
      if (localId != null) {
        final row = ref.watch(queueRowProvider(localId)).value;
        // A delivery that waited on a gate-out names the gate-out; follow it
        // back to its challan.
        if (row != null && row.entity == QueueEntity.dispatchConfirm) {
          final serverId = RegExp('/dispatches/([^/{}]+)/').firstMatch(row.path)?.group(1);
          final challan = row.dependsOn != null
              ? RecordRef(localId: row.dependsOn)
              : RecordRef(serverId: serverId);
          return ref.watch(challanViewProvider(challan));
        }
        final sent = all.where((c) => c.ref.serverId != null && c.ref.serverId == row?.serverId);
        if (sent.isNotEmpty) return sent.first;
        if (row != null) return _fromRow(row, ref: target);
      }
      return null;
    });

typedef ChallanIds = ({String? localId, String? serverId});

ChallanIds challanIds(ChallanView c) =>
    (localId: c.ref.localId ?? c.localRow?.id, serverId: c.ref.serverId ?? c.localRow?.serverId);

/// The newest gate-out and delivery entries this phone made for a challan.
final ProviderFamily<({QueueRow? confirm, QueueRow? acknowledge}), ChallanIds>
challanActionsProvider = Provider.family<({QueueRow? confirm, QueueRow? acknowledge}), ChallanIds>((
  ref,
  ids,
) {
  final rows = ref.watch(queueRowsProvider(QueueGroup.dispatch)).value ?? const [];
  bool mine(QueueRow r) =>
      (ids.localId != null && r.dependsOn == ids.localId) ||
      (ids.serverId != null && r.path.contains('/dispatches/${ids.serverId}/'));
  final confirms = rows.where((r) => r.entity == QueueEntity.dispatchConfirm && mine(r)).toList();
  final confirmIds = {for (final c in confirms) c.id};
  return (
    confirm: confirms.firstOrNull,
    // A delivery may wait on this phone's gate-out rather than on the challan.
    acknowledge: rows
        .where(
          (r) =>
              r.entity == QueueEntity.dispatchAcknowledge &&
              (mine(r) || confirmIds.contains(r.dependsOn)),
        )
        .firstOrNull,
  );
});

final StreamProviderFamily<Map<String, dynamic>?, String> challanDetailProvider =
    StreamProvider.family<Map<String, dynamic>?, String>(
      (ref, serverId) =>
          ref.watch(cacheRepositoryProvider).watchOne(DispatchRepository.detailKind, serverId),
    );
