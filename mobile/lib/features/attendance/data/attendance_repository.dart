import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// LAB-02 — the muster roll is saved on the phone and sent by the queue.
class AttendanceRepository {
  AttendanceRepository(this.queue);

  final QueueRepository queue;

  Future<String> save({
    required QueueOwner owner,
    required String siteId,
    required Map<String, dynamic> payload,
    required String title,
  }) {
    return queue.enqueue(
      QueueDraft(
        entity: QueueEntity.attendance,
        method: 'POST',
        path: ApiEndpoints.attendance,
        payload: payload,
        title: title,
        siteId: siteId,
      ),
      owner,
    );
  }
}

final attendanceRepositoryProvider = Provider<AttendanceRepository>(
  (ref) => AttendanceRepository(ref.watch(queueRepositoryProvider)),
);
