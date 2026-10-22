import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/master_sync_service.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/production/data/production_repository.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';

/// The batches a supervisor can still record stages against: open and firing.
const productionPullSpecs = <PullSpec>[
  PullSpec(
    kind: CacheKind.productionBatch,
    path: ApiEndpoints.productionBatches,
    mode: PullMode.full,
    permission: Permissions.productionView,
    perSite: true,
    siteKey: 'siteId',
    query: {
      'status': ['open', 'firing'],
    },
  ),
];

final productionRepositoryProvider = Provider<ProductionRepository>(
  (ref) => ProductionRepository(
    queue: ref.watch(queueRepositoryProvider),
    cache: ref.watch(cacheRepositoryProvider),
    api: ref.watch(apiClientProvider),
  ),
);

final _cachedBatchesProvider = StreamProvider<List<Map<String, dynamic>>>((ref) {
  final siteId = ref.watch(currentSessionProvider)?.siteId;
  if (siteId == null) return Stream.value(const []);
  return ref.watch(cacheRepositoryProvider).watch(CacheKind.productionBatch, siteId: siteId);
});

/// The server's open batches, plus batches started on this phone that the
/// server has not listed back yet — so a batch made offline is usable at once.
final batchesProvider = Provider<AsyncValue<List<BatchView>>>((ref) {
  final cached = ref.watch(_cachedBatchesProvider);
  final rows = ref.watch(queueRowsProvider(QueueGroup.production));
  if (cached is AsyncLoading || rows is AsyncLoading) return const AsyncLoading();

  final server = cached.value ?? const [];
  final serverIds = {for (final b in server) b['id'] as String};
  final views = <BatchView>[
    for (final b in server)
      BatchView(
        ref: BatchRef(serverId: b['id'] as String),
        chamber: b['chamber'] as String,
        batchDate: b['batchDate'] as String,
        serverStatus: b['status'] as String?,
      ),
    for (final row in rows.value ?? const <QueueRow>[])
      if (row.entity == QueueEntity.productionBatch && !serverIds.contains(row.serverId))
        BatchView(
          ref: BatchRef(localId: row.id),
          chamber: row.payloadMap['chamber'] as String,
          batchDate: row.payloadMap['batchDate'] as String,
          localRow: row,
        ),
  ]..sort((a, b) => b.batchDate.compareTo(a.batchDate));
  return AsyncData(views);
});

/// One batch, wherever it is: the server's copy, or the phone's entry.
final ProviderFamily<BatchView?, BatchRef> batchViewProvider =
    Provider.family<BatchView?, BatchRef>((ref, batchRef) {
      final all = ref.watch(batchesProvider).value ?? const [];
      final direct = all.where((b) => b.ref == batchRef).firstOrNull;
      if (direct != null) return direct;
      // A local batch that has since been sent shows up under its server id.
      final localId = batchRef.localId;
      if (localId != null) {
        final row = ref.watch(queueRowProvider(localId)).value;
        final sent = all.where((b) => b.ref.serverId != null && b.ref.serverId == row?.serverId);
        if (sent.isNotEmpty) return sent.first;
        if (row != null) {
          return BatchView(
            ref: batchRef,
            chamber: row.payloadMap['chamber'] as String,
            batchDate: row.payloadMap['batchDate'] as String,
            localRow: row,
          );
        }
      }
      return null;
    });

/// The stages the server has recorded for a batch (fetched when online).
final StreamProviderFamily<Map<String, dynamic>?, String> batchDetailProvider =
    StreamProvider.family<Map<String, dynamic>?, String>((ref, serverId) {
      return ref.watch(cacheRepositoryProvider).watchOne(CacheKind.productionBatchDetail, serverId);
    });

/// The two ids a batch may go by: the phone's entry and the server's row.
typedef BatchIds = ({String? localId, String? serverId});

BatchIds batchIds(BatchView batch) => (
  localId: batch.ref.localId ?? batch.localRow?.id,
  serverId: batch.ref.serverId ?? batch.localRow?.serverId,
);

/// Stage entries made on this phone for a batch, whichever id they were sent to.
final ProviderFamily<List<QueueRow>, BatchIds> batchStageRowsProvider =
    Provider.family<List<QueueRow>, BatchIds>((ref, ids) {
      final rows = ref.watch(queueRowsProvider(QueueGroup.production)).value ?? const [];
      return [
        for (final row in rows)
          if (stageOfEntity(row.entity) != null &&
              ((ids.localId != null && row.dependsOn == ids.localId) ||
                  (ids.serverId != null &&
                      row.path.contains('/production/batches/${ids.serverId}/'))))
            row,
      ];
    });
