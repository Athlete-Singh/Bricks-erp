import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/sync_service.dart';
import 'package:flutter/foundation.dart';

/// A document the supervisor can act on: one the server already has, or one
/// saved on this phone and not yet sent (a batch, a challan).
@immutable
class RecordRef {
  const RecordRef({this.serverId, this.localId})
    : assert(serverId != null || localId != null, 'A record needs an id');

  /// `s-<id>` or `l-<id>` — a route parameter.
  factory RecordRef.decode(String value) {
    final id = value.substring(2);
    return value.startsWith('s-') ? RecordRef(serverId: id) : RecordRef(localId: id);
  }

  final String? serverId;
  final String? localId;

  String encode() => serverId != null ? 's-$serverId' : 'l-$localId';

  @override
  bool operator ==(Object other) =>
      other is RecordRef && other.serverId == serverId && other.localId == localId;

  @override
  int get hashCode => Object.hash(serverId, localId);
}

/// Where an action on [target] is sent: straight to its server id when it has
/// one, else to `{parent}`, waiting on the phone's entry for it.
Future<({String path, String? dependsOn})> actionTarget(
  QueueRepository queue,
  RecordRef target,
  String Function(String id) pathFor,
) async {
  var serverId = target.serverId;
  if (serverId == null) {
    final parent = await queue.byId(target.localId!);
    if (parent?.status == QueueStatus.synced) serverId = parent?.serverId;
  }
  return (
    path: pathFor(serverId ?? SyncService.parentPlaceholder),
    dependsOn: serverId == null ? target.localId : null,
  );
}
