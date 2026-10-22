import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';

/// docs/09: 5 s → 30 s → 2 min → 10 min, then 10 min for good.
Duration backoffFor(int attempts) {
  const steps = [
    Duration(seconds: 5),
    Duration(seconds: 30),
    Duration(minutes: 2),
    Duration(minutes: 10),
  ];
  return steps[(attempts - 1).clamp(0, steps.length - 1)];
}

class PushResult {
  const PushResult({
    this.sent = 0,
    this.failed = 0,
    this.retrying = 0,
    this.offline = false,
    this.unauthenticated = false,
  });

  final int sent;
  final int failed;
  final int retrying;

  /// Stopped because there is no network — nothing else would get through either.
  final bool offline;

  /// Stopped because the session is over; the entries wait for the same person.
  final bool unauthenticated;
}

/// Sends the queue. Knows nothing about bricks: every row carries its own
/// method, path and body. The only domain knowledge is [_resolveConflict] —
/// the two dispatch actions that are not idempotent on the server.
class SyncService {
  SyncService({required this.api, required this.queue});

  final ApiClient api;
  final QueueRepository queue;

  static const parentPlaceholder = '{parent}';

  Future<PushResult> push(QueueOwner owner) async {
    var sent = 0;
    var failed = 0;
    var retrying = 0;

    // A pass sends what is due; a parent sent in it makes its children due,
    // so go again until a pass sends nothing — a batch and its stages leave
    // together in one run.
    var sentBefore = -1;
    while (sent > sentBefore) {
      sentBefore = sent;
      for (final row in await queue.due(owner.userId)) {
        final String path;
        if (row.dependsOn != null) {
          final parent = await queue.byId(row.dependsOn!);
          if (parent == null) {
            await queue.markFailed(
              row.id,
              code: 'PARENT_MISSING',
              error: 'The entry this depends on was discarded',
            );
            failed++;
            continue;
          }
          // Not yet on the server (or refused) — this one waits; it is not its fault.
          if (parent.status != QueueStatus.synced || parent.serverId == null) continue;
          path = row.path.replaceAll(parentPlaceholder, parent.serverId!);
        } else {
          path = row.path;
        }

        await queue.markSyncing(row.id);
        try {
          final envelope = await api.send(
            row.method,
            path,
            body: row.payloadMap,
            idempotencyKey: row.id,
          );
          await _markSynced(row, envelope.data);
          sent++;
        } on ApiException catch (e) {
          if (e.kind == ApiFailureKind.unauthenticated) {
            await queue.release(row.id);
            return PushResult(
              sent: sent,
              failed: failed,
              retrying: retrying,
              unauthenticated: true,
            );
          }
          if (e.isTransient) {
            final attempts = row.attempts + 1;
            await queue.scheduleRetry(
              row.id,
              attempts: attempts,
              delay: backoffFor(attempts),
              code: e.code,
              error: e.message,
            );
            retrying++;
            if (e.kind == ApiFailureKind.network) {
              return PushResult(sent: sent, failed: failed, retrying: retrying, offline: true);
            }
            continue;
          }
          final resolved = await _resolveConflict(row, path, e);
          if (resolved != null) {
            await _markSynced(row, resolved);
            sent++;
          } else {
            await queue.markFailed(row.id, code: e.code, error: _describe(e));
            failed++;
          }
        }
      }
    }
    return PushResult(sent: sent, failed: failed, retrying: retrying);
  }

  Future<void> _markSynced(QueueRow row, Object? data) {
    String? serverId;
    String? serverRef;
    if (data is Map) {
      serverId = data['id'] as String?;
      serverRef = (data['challanNo'] ?? data['grnNo']) as String?;
    }
    return queue.markSynced(row.id, serverId: serverId, serverRef: serverRef, response: data);
  }

  /// A confirm or acknowledgement is a PATCH that changes a challan's state, so
  /// a resend after a lost response is refused with "already …". That refusal
  /// means the first send worked — read the challan to be sure, and if it is in
  /// the state we asked for, the entry is done (MOB-04: no duplicates, no false
  /// failures).
  Future<Object?> _resolveConflict(QueueRow row, String path, ApiException e) async {
    final wanted = switch ((row.entity, e.code)) {
      (QueueEntity.dispatchConfirm, 'DISPATCH_NOT_DRAFT') => const {'confirmed', 'delivered'},
      (QueueEntity.dispatchAcknowledge, 'DISPATCH_ALREADY_DELIVERED') => const {'delivered'},
      _ => null,
    };
    if (wanted == null) return null;
    final id = RegExp('/dispatches/([^/]+)/').firstMatch(path)?.group(1);
    if (id == null) return null;
    try {
      final current = (await api.get(ApiEndpoints.dispatch(id))).map;
      return wanted.contains(current['status']) ? current : null;
    } on ApiException {
      return null;
    }
  }

  static String _describe(ApiException e) {
    if (e.fieldErrors.isEmpty) return e.message;
    return [e.message, for (final f in e.fieldErrors.entries) '${f.key}: ${f.value}'].join('\n');
  }
}
