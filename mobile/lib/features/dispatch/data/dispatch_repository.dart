import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/record_ref.dart';
import 'package:brics_mobile/core/sync/sync_service.dart';

/// DSP-04 — challans, gate-outs and deliveries recorded on the phone.
class DispatchRepository {
  DispatchRepository({required this.queue, required this.cache, required this.api});

  final QueueRepository queue;
  final CacheRepository cache;
  final ApiClient api;

  static const detailKind = 'dispatch_detail';

  Future<String> raise({
    required QueueOwner owner,
    required String siteId,
    required Map<String, dynamic> payload,
    required String title,
  }) {
    return queue.enqueue(
      QueueDraft(
        entity: QueueEntity.dispatch,
        method: 'POST',
        path: ApiEndpoints.dispatches,
        payload: payload,
        title: title,
        siteId: siteId,
      ),
      owner,
    );
  }

  /// DSP-02 / DSP-03 — on a challan the server has, or one still on the phone.
  Future<String> act({
    required QueueOwner owner,
    required String siteId,
    required RecordRef challan,
    required String entity,
    required Map<String, dynamic> payload,
    required String title,
    QueueRow? after,
  }) async {
    final pathFor = entity == QueueEntity.dispatchConfirm
        ? ApiEndpoints.dispatchConfirm
        : ApiEndpoints.dispatchAcknowledge;
    // A delivery recorded while the gate-out is still on the phone must not
    // reach the server first. The gate-out's response is the challan, so its
    // server id is the challan's id — the delivery can simply wait on it.
    final target = after != null && after.status != QueueStatus.synced
        ? (path: pathFor(SyncService.parentPlaceholder), dependsOn: after.id)
        : await actionTarget(queue, challan, pathFor);
    return await queue.enqueue(
      QueueDraft(
        entity: entity,
        method: 'PATCH',
        path: target.path,
        payload: payload,
        title: title,
        siteId: siteId,
        dependsOn: target.dependsOn,
      ),
      owner,
    );
  }

  /// Best effort: the challan's lines, for the screen. Offline, the last copy stays.
  Future<void> refreshDetail(String serverId) async {
    try {
      final data = (await api.get(ApiEndpoints.dispatch(serverId))).map;
      await cache.put(detailKind, data);
    } on ApiException {
      // Shown from the cache, or without lines.
    }
  }
}
