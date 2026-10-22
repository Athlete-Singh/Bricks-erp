import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/sync_service.dart';
import 'package:brics_mobile/features/production/domain/production.dart';

/// PRD-06 — production entries are written to the phone first and sent by the
/// queue. Nothing here waits for the network.
class ProductionRepository {
  ProductionRepository({required this.queue, required this.cache, required this.api});

  final QueueRepository queue;
  final CacheRepository cache;
  final ApiClient api;

  Future<String> createBatch({
    required QueueOwner owner,
    required String siteId,
    required Map<String, dynamic> payload,
    required String title,
  }) {
    return queue.enqueue(
      QueueDraft(
        entity: QueueEntity.productionBatch,
        method: 'POST',
        path: ApiEndpoints.productionBatches,
        payload: payload,
        title: title,
        siteId: siteId,
      ),
      owner,
    );
  }

  /// A stage against a batch the server has goes straight to its id; against a
  /// batch still on the phone it waits for that batch and uses its new id.
  Future<String> recordStage({
    required QueueOwner owner,
    required String siteId,
    required BatchRef batch,
    required ProductionStage stage,
    required Map<String, dynamic> payload,
    required String title,
  }) async {
    var serverId = batch.serverId;
    if (serverId == null) {
      final parent = await queue.byId(batch.localId!);
      if (parent?.status == QueueStatus.synced) serverId = parent?.serverId;
    }
    return await queue.enqueue(
      QueueDraft(
        entity: switch (stage) {
          ProductionStage.making => QueueEntity.productionMaking,
          ProductionStage.drying => QueueEntity.productionDrying,
          ProductionStage.firing => QueueEntity.productionFiring,
          ProductionStage.sorting => QueueEntity.productionSorting,
        },
        method: 'POST',
        path: ApiEndpoints.productionStage(serverId ?? SyncService.parentPlaceholder, stage.name),
        payload: payload,
        title: title,
        siteId: siteId,
        dependsOn: serverId == null ? batch.localId : null,
      ),
      owner,
    );
  }

  /// Best effort: the stages the server has recorded, for the batch screen.
  /// Offline, the last copy (if any) stays.
  Future<void> refreshDetail(String serverId) async {
    try {
      final data = (await api.get(ApiEndpoints.productionBatch(serverId))).map;
      await cache.put(CacheKind.productionBatchDetail, {...data, 'id': serverId});
    } on ApiException {
      // Shown from the cache, or from the phone's own entries.
    }
  }
}

/// Which stage a queued production entry is, from its entity.
ProductionStage? stageOfEntity(String entity) => switch (entity) {
  QueueEntity.productionMaking => ProductionStage.making,
  QueueEntity.productionDrying => ProductionStage.drying,
  QueueEntity.productionFiring => ProductionStage.firing,
  QueueEntity.productionSorting => ProductionStage.sorting,
  _ => null,
};
