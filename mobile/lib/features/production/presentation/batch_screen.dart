import 'dart:async';

import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/production/data/production_repository.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/production/presentation/production_providers.dart';
import 'package:brics_mobile/features/production/presentation/production_screen.dart';
import 'package:brics_mobile/features/sync/presentation/entry_editors.dart';
import 'package:brics_mobile/features/sync/presentation/queue_labels.dart';
import 'package:brics_mobile/features/sync/presentation/sync_badge_action.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

String stageLabel(AppLocalizations l10n, ProductionStage stage) => switch (stage) {
  ProductionStage.making => l10n.entityProductionMaking,
  ProductionStage.drying => l10n.entityProductionDrying,
  ProductionStage.firing => l10n.entityProductionFiring,
  ProductionStage.sorting => l10n.entityProductionSorting,
};

/// One batch and its four stages: what the server has, what this phone has
/// queued, and a button for what is still to record.
class BatchScreen extends ConsumerStatefulWidget {
  const BatchScreen({required this.batchRef, super.key});

  final BatchRef batchRef;

  @override
  ConsumerState<BatchScreen> createState() => _BatchScreenState();
}

class _BatchScreenState extends ConsumerState<BatchScreen> {
  @override
  void initState() {
    super.initState();
    final serverId = widget.batchRef.serverId;
    if (serverId != null) unawaited(ref.read(productionRepositoryProvider).refreshDetail(serverId));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final batch = ref.watch(batchViewProvider(widget.batchRef));
    if (batch == null) {
      return AppScaffold(title: l10n.productionTitle, body: const EmptyView());
    }
    final ids = batchIds(batch);
    final detail = ids.serverId == null
        ? null
        : ref.watch(batchDetailProvider(ids.serverId!)).value;
    final serverStages = <String>{
      for (final e in (detail?['entries'] as List?) ?? const []) (e as Map)['stage'] as String,
    };
    final localRows = ref.watch(batchStageRowsProvider(ids));
    final canManage =
        ref.watch(currentSessionProvider)?.session.user.can(Permissions.productionManage) ?? false;

    return AppScaffold(
      title: batch.chamber,
      actions: const [SyncBadgeAction()],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppCard(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(batch.chamber, style: text.titleLarge),
                      Text(Formatters.displayIsoDate(batch.batchDate), style: text.bodySmall),
                    ],
                  ),
                ),
                BatchStatus(batch: batch),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(l10n.productionStages, style: text.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          for (final stage in ProductionStage.values) ...[
            _StageRow(
              stage: stage,
              recordedOnServer: serverStages.contains(stage.name),
              local: localRows.where((r) => stageOfEntity(r.entity) == stage).firstOrNull,
              batchRow: batch.localRow,
              enabled: canManage,
              onRecord: () =>
                  context.push(AppRoutes.productionStage(batch.ref.encode(), stage.name)),
              onEdit: (row) => context.push(editRoute(row)!),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}

class _StageRow extends StatelessWidget {
  const _StageRow({
    required this.stage,
    required this.recordedOnServer,
    required this.local,
    required this.batchRow,
    required this.enabled,
    required this.onRecord,
    required this.onEdit,
  });

  final ProductionStage stage;
  final bool recordedOnServer;
  final QueueRow? local;

  /// The batch's own entry when it was started on this phone — a stage waits on it.
  final QueueRow? batchRow;
  final bool enabled;
  final VoidCallback onRecord;
  final void Function(QueueRow row) onEdit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    // Once recorded or queued, a stage is done from the phone's side: a batch
    // stage is immutable on the server, and a correction is the web's job.
    final queued = local != null && local!.status != QueueStatus.failed;
    final done = recordedOnServer || queued;

    final Widget state;
    if (recordedOnServer) {
      state = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_circle, size: 16, color: colors.success),
          const SizedBox(width: AppSpacing.xs),
          Text(
            l10n.productionStageRecorded,
            style: text.labelSmall?.copyWith(color: colors.success),
          ),
        ],
      );
    } else if (local != null) {
      state = RecordStatusChip(
        status: recordStatus(local!, parent: local!.dependsOn == null ? null : batchRow),
      );
    } else {
      state = Text(
        stage == ProductionStage.drying
            ? l10n.productionDryingOptional
            : l10n.productionStageNotYet,
        style: text.labelSmall,
      );
    }

    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(stageLabel(l10n, stage), style: text.titleMedium),
                if (local != null && !recordedOnServer) Text(local!.title, style: text.bodySmall),
                state,
              ],
            ),
          ),
          if (local?.status == QueueStatus.failed && enabled)
            AppButton(
              label: l10n.commonEdit,
              onPressed: () => onEdit(local!),
              expand: false,
              variant: AppButtonVariant.secondary,
            )
          else if (!done && enabled)
            AppButton(label: l10n.productionRecord, onPressed: onRecord, expand: false),
        ],
      ),
    );
  }
}
