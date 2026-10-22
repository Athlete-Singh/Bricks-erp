import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';

/// Which entries a list shows. A plain enum so the provider family has a
/// stable key.
enum QueueGroup {
  all(null),
  production(QueueEntity.production),
  attendance([QueueEntity.attendance]),
  goodsReceipt([QueueEntity.goodsReceipt]),
  dispatch(QueueEntity.dispatchAll);

  const QueueGroup(this.entities);

  final List<String>? entities;
}

/// Entries made on this phone by the signed-in person, newest first. Feature
/// lists show the selected kiln only; the sync screen shows every kiln.
final StreamProviderFamily<List<QueueRow>, QueueGroup> queueRowsProvider =
    StreamProvider.family<List<QueueRow>, QueueGroup>((ref, group) {
      final signedIn = ref.watch(currentSessionProvider);
      if (signedIn == null) return Stream.value(const []);
      return ref
          .watch(queueRepositoryProvider)
          .watch(
            userId: signedIn.session.user.id,
            entities: group.entities,
            siteId: group == QueueGroup.all ? null : signedIn.siteId,
          );
    });

final StreamProviderFamily<QueueRow?, String> queueRowProvider =
    StreamProvider.family<QueueRow?, String>((ref, id) {
      return ref.watch(queueRepositoryProvider).watchById(id);
    });
