import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/production/presentation/production_providers.dart';
import 'package:brics_mobile/features/sync/presentation/entry_list.dart';
import 'package:brics_mobile/features/sync/presentation/queue_labels.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_badge_action.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// PRD-06 — open batches at this kiln, and what this phone has entered.
class ProductionScreen extends ConsumerWidget {
  const ProductionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final canManage =
        ref.watch(currentSessionProvider)?.session.user.can(Permissions.productionManage) ?? false;

    return DefaultTabController(
      length: 2,
      child: AppScaffold(
        title: l10n.productionTitle,
        subtitle: ref.watch(selectedSiteProvider)?.name,
        actions: const [SyncBadgeAction()],
        scrollable: false,
        header: HeaderTabs(labels: [l10n.productionTabBatches, l10n.productionTabEntries]),
        floatingAction: canManage
            ? FloatingActionButton.extended(
                onPressed: () => context.push(AppRoutes.productionNewBatch),
                icon: const Icon(Icons.add_rounded),
                label: Text(l10n.productionNewBatch),
              )
            : null,
        body: TabBarView(
          children: [
            const _BatchList(),
            EntryList(group: QueueGroup.production, emptyMessage: l10n.productionNoEntries),
          ],
        ),
      ),
    );
  }
}

class _BatchList extends ConsumerWidget {
  const _BatchList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(batchesProvider)) {
      AsyncData(:final value) when value.isEmpty => EmptyView(
        message: l10n.productionNoBatches,
        icon: Icons.local_fire_department_outlined,
      ),
      AsyncData(:final value) => ListView.separated(
        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 112),
        itemCount: value.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (context, i) => Entrance(
          index: i,
          child: BatchCard(batch: value[i]),
        ),
      ),
      AsyncError() => const ErrorView(),
      _ => const AppLoader(),
    };
  }
}

/// How far along a batch is, as the server sees it: stages behind it.
int stagesDone(String? serverStatus) => switch (serverStatus) {
  'firing' => 3,
  'sorted' || 'closed' => 4,
  _ => 0,
};

class BatchCard extends StatelessWidget {
  const BatchCard({required this.batch, super.key});

  final BatchView batch;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final local = batch.serverStatus == null;
    return AppCard(
      accent: local
          ? colors.warning
          : (batch.serverStatus == 'firing' ? AppPalette.brick : colors.primary),
      onTap: () => context.push(AppRoutes.productionBatch(batch.ref.encode())),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppPalette.brickLight, AppPalette.brick],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.local_fire_department_rounded, color: Colors.white),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(batch.chamber, style: text.titleMedium),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(Icons.event_rounded, size: 14, color: colors.mutedForeground),
                    const SizedBox(width: 4),
                    Text(Formatters.displayIsoDate(batch.batchDate), style: text.bodySmall),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                StageDots(done: stagesDone(batch.serverStatus)),
              ],
            ),
          ),
          BatchStatus(batch: batch),
        ],
      ),
    );
  }
}

/// Four segments for making → drying → firing → sorting, filled as they are done.
class StageDots extends StatelessWidget {
  const StageDots({required this.done, super.key});

  final int done;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Row(
      children: [
        for (var i = 0; i < 4; i++) ...[
          AnimatedContainer(
            duration: AppMotion.slow,
            curve: AppMotion.enter,
            width: i < done ? 26 : 16,
            height: 6,
            decoration: BoxDecoration(
              color: i < done ? colors.success : colors.surfaceMuted,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ],
    );
  }
}

/// The server's word for a batch, or the phone's sync state if it has none yet.
class BatchStatus extends StatelessWidget {
  const BatchStatus({required this.batch, super.key, this.onHeader = false});

  final BatchView batch;
  final bool onHeader;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final local = batch.localRow;
    if (batch.serverStatus == null && local != null) {
      return RecordStatusChip(status: recordStatus(local));
    }
    final (label, tone, icon) = switch (batch.serverStatus) {
      'firing' => (l10n.productionStatusFiring, Tone.warning, Icons.local_fire_department_rounded),
      'sorted' => (l10n.productionStatusSorted, Tone.success, Icons.check_circle_rounded),
      'closed' => (l10n.productionStatusClosed, Tone.neutral, Icons.lock_rounded),
      _ => (l10n.productionStatusOpen, Tone.info, Icons.radio_button_unchecked_rounded),
    };
    return StatusPill(label: label, tone: tone, icon: icon);
  }
}
