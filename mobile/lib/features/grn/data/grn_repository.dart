import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// PUR-02 — a goods receipt saved on the phone; stock moves when the server takes it.
class GrnRepository {
  GrnRepository(this.queue);

  final QueueRepository queue;

  Future<String> save({
    required QueueOwner owner,
    required String siteId,
    required Map<String, dynamic> payload,
    required String title,
  }) {
    return queue.enqueue(
      QueueDraft(
        entity: QueueEntity.goodsReceipt,
        method: 'POST',
        path: ApiEndpoints.goodsReceipts,
        payload: payload,
        title: title,
        siteId: siteId,
      ),
      owner,
    );
  }
}

final grnRepositoryProvider = Provider<GrnRepository>(
  (ref) => GrnRepository(ref.watch(queueRepositoryProvider)),
);
