import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/production/data/production_repository.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// Where to correct a refused entry: its own form, filled with what was sent.
/// Null when the entry is not refused, or has no form to correct it in.
VoidCallback? editorFor(BuildContext context, QueueRow row) {
  if (row.status != QueueStatus.failed) return null;
  final route = editRoute(row);
  return route == null ? null : () => context.push(route);
}

String? editRoute(QueueRow row) {
  final edit = '?edit=${row.id}';
  if (row.entity == QueueEntity.attendance) return '${AppRoutes.attendanceNew}$edit';
  if (row.entity == QueueEntity.productionBatch) return '${AppRoutes.productionNewBatch}$edit';
  final stage = stageOfEntity(row.entity);
  if (stage != null) {
    final serverId = RegExp('/production/batches/([^/{}]+)/').firstMatch(row.path)?.group(1);
    final batch = row.dependsOn != null
        ? BatchRef(localId: row.dependsOn)
        : BatchRef(serverId: serverId);
    return '${AppRoutes.productionStage(batch.encode(), stage.name)}$edit';
  }
  return null;
}
