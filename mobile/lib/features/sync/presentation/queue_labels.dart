import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';

String entityLabel(AppLocalizations l10n, String entity) => switch (entity) {
  QueueEntity.productionBatch => l10n.entityProductionBatch,
  QueueEntity.productionMaking => l10n.entityProductionMaking,
  QueueEntity.productionDrying => l10n.entityProductionDrying,
  QueueEntity.productionFiring => l10n.entityProductionFiring,
  QueueEntity.productionSorting => l10n.entityProductionSorting,
  QueueEntity.attendance => l10n.entityAttendance,
  QueueEntity.goodsReceipt => l10n.entityGoodsReceipt,
  QueueEntity.dispatch => l10n.entityDispatch,
  QueueEntity.dispatchConfirm => l10n.entityDispatchConfirm,
  QueueEntity.dispatchAcknowledge => l10n.entityDispatchAcknowledge,
  _ => entity,
};

/// What the chip on a row says. A pending row whose parent has not gone yet
/// reads "waiting on another entry", so nobody retries the wrong one.
RecordSyncStatus recordStatus(QueueRow row, {QueueRow? parent}) {
  return switch (row.status) {
    QueueStatus.synced => RecordSyncStatus.synced,
    QueueStatus.failed => RecordSyncStatus.failed,
    QueueStatus.syncing => RecordSyncStatus.syncing,
    _ when parent != null && parent.status != QueueStatus.synced => RecordSyncStatus.blocked,
    _ => RecordSyncStatus.pending,
  };
}
