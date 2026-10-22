import 'dart:async';

import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
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

String stageHint(AppLocalizations l10n, ProductionStage stage) => switch (stage) {
  ProductionStage.making => l10n.productionMakingHint,
  ProductionStage.drying => l10n.productionDryingHint,
  ProductionStage.firing => l10n.productionFiringHint,
  ProductionStage.sorting => l10n.productionSortingHint,
};

IconData stageIcon(ProductionStage stage) => switch (stage) {
  ProductionStage.making => Icons.back_hand_rounded,
  ProductionStage.drying => Icons.wb_sunny_rounded,
  ProductionStage.firing => Icons.local_fire_department_rounded,
  ProductionStage.sorting => Icons.grid_view_rounded,
};

/// Where one stage of a batch stands, from the server's record and this phone's queue.
enum _StageState { recorded, queued, refused, next, later }

/// One batch and its four stages as a timeline: what the server has, what this
/// phone has queued, and a button for the next one to record.
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
    final serverEntries = <String, Map<dynamic, dynamic>>{
      for (final e in (detail?['entries'] as List?) ?? const []) (e as Map)['stage'] as String: e,
    };
    final localRows = ref.watch(batchStageRowsProvider(ids));
    final canManage =
        ref.watch(currentSessionProvider)?.session.user.can(Permissions.productionManage) ?? false;

    // Work out each stage's state, and which one is next in line.
    final states = <ProductionStage, _StageState>{};
    final locals = <ProductionStage, QueueRow?>{};
    var nextFound = false;
    for (final stage in ProductionStage.values) {
      final local = localRows.where((r) => stageOfEntity(r.entity) == stage).firstOrNull;
      locals[stage] = local;
      if (serverEntries.containsKey(stage.name)) {
        states[stage] = _StageState.recorded;
      } else if (local?.status == QueueStatus.failed) {
        states[stage] = _StageState.refused;
      } else if (local != null) {
        states[stage] = _StageState.queued;
      } else if (!nextFound) {
        states[stage] = _StageState.next;
        nextFound = true;
      } else {
        states[stage] = _StageState.later;
      }
    }
    final done = states.values
        .where((s) => s == _StageState.recorded || s == _StageState.queued)
        .length;

    return AppScaffold(
      title: batch.chamber,
      subtitle: Formatters.displayIsoDate(batch.batchDate),
      actions: const [SyncBadgeAction()],
      header: Row(
        children: [
          BatchStatus(batch: batch),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.productionStagesDone(done),
                  style: text.labelMedium?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(end: done / 4),
                    duration: MotionScope.of(context) ? AppMotion.slow : Duration.zero,
                    curve: AppMotion.enter,
                    builder: (_, v, _) => LinearProgressIndicator(
                      value: v,
                      minHeight: 8,
                      backgroundColor: Colors.white.withValues(alpha: 0.18),
                      valueColor: const AlwaysStoppedAnimation(AppPalette.accent300),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          for (final (i, stage) in ProductionStage.values.indexed)
            Entrance(
              index: i,
              child: _TimelineStep(
                stage: stage,
                state: states[stage]!,
                local: locals[stage],
                batchRow: batch.localRow,
                server: serverEntries[stage.name],
                isLast: i == ProductionStage.values.length - 1,
                enabled: canManage,
                onRecord: () =>
                    context.push(AppRoutes.productionStage(batch.ref.encode(), stage.name)),
                onEdit: (row) => context.push(editRoute(row)!),
              ),
            ),
        ],
      ),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.stage,
    required this.state,
    required this.local,
    required this.batchRow,
    required this.server,
    required this.isLast,
    required this.enabled,
    required this.onRecord,
    required this.onEdit,
  });

  final ProductionStage stage;
  final _StageState state;
  final QueueRow? local;

  /// The batch's own entry when it was started on this phone — a stage waits on it.
  final QueueRow? batchRow;
  final Map<dynamic, dynamic>? server;
  final bool isLast;
  final bool enabled;
  final VoidCallback onRecord;
  final void Function(QueueRow row) onEdit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;

    final (Color fill, Color fg, IconData icon) = switch (state) {
      _StageState.recorded => (colors.success, Colors.white, Icons.check_rounded),
      _StageState.queued => (colors.warning, Colors.white, Icons.schedule_rounded),
      _StageState.refused => (colors.danger, Colors.white, Icons.priority_high_rounded),
      _StageState.next => (colors.primary, Colors.white, stageIcon(stage)),
      _StageState.later => (colors.surfaceMuted, colors.mutedForeground, stageIcon(stage)),
    };
    final lineDone = state == _StageState.recorded || state == _StageState.queued;

    String? figure;
    final count =
        server?['greenBricks'] ??
        server?['firedBricks'] ??
        local?.payloadMap['greenBricks'] ??
        local?.payloadMap['firedBricks'];
    if (count is String && count != '0') {
      figure = stage == ProductionStage.making
          ? l10n.productionGreenCount(Formatters.quantity(count))
          : l10n.productionFiredCount(Formatters.quantity(count));
    }

    final Widget status = switch (state) {
      _StageState.recorded => StatusPill(
        label: l10n.productionStageRecorded,
        tone: Tone.success,
        icon: Icons.check_circle_rounded,
      ),
      _StageState.queued || _StageState.refused => RecordStatusChip(
        status: recordStatus(local!, parent: local!.dependsOn == null ? null : batchRow),
      ),
      _StageState.next || _StageState.later => StatusPill(
        label: stage == ProductionStage.drying
            ? l10n.productionDryingOptional
            : l10n.productionStageNotYet,
        tone: Tone.neutral,
      ),
    };

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 44,
            child: Column(
              children: [
                AnimatedContainer(
                  duration: MotionScope.of(context) ? AppMotion.medium : Duration.zero,
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: fill,
                    shape: BoxShape.circle,
                    boxShadow: state == _StageState.later
                        ? null
                        : [
                            BoxShadow(
                              color: fill.withValues(alpha: 0.4),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                  ),
                  child: Icon(icon, color: fg, size: 22),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 4,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        color: lineDone ? colors.success : colors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.md),
              child: AppCard(
                color: state == _StageState.next ? colors.successSoft : null,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(stageLabel(l10n, stage), style: text.titleMedium)),
                        status,
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(figure ?? stageHint(l10n, stage), style: text.bodySmall),
                    if (local != null && state != _StageState.recorded) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(local!.title, style: text.bodySmall),
                    ],
                    if (enabled && state == _StageState.refused) ...[
                      const SizedBox(height: AppSpacing.md),
                      AppButton(
                        label: l10n.commonEdit,
                        icon: Icons.edit_rounded,
                        variant: AppButtonVariant.secondary,
                        onPressed: () => onEdit(local!),
                      ),
                    ] else if (enabled &&
                        (state == _StageState.next || state == _StageState.later)) ...[
                      const SizedBox(height: AppSpacing.md),
                      AppButton(
                        label: l10n.productionRecord,
                        icon: Icons.add_rounded,
                        variant: state == _StageState.next
                            ? AppButtonVariant.primary
                            : AppButtonVariant.secondary,
                        onPressed: onRecord,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
