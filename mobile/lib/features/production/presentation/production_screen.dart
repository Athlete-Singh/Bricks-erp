import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/production/presentation/production_providers.dart';
import 'package:brics_mobile/features/sync/presentation/entry_editors.dart';
import 'package:brics_mobile/features/sync/presentation/queue_entry_tile.dart';
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
        actions: const [SyncBadgeAction()],
        scrollable: false,
        floatingAction: canManage
            ? FloatingActionButton.extended(
                onPressed: () => context.push(AppRoutes.productionNewBatch),
                icon: const Icon(Icons.add),
                label: Text(l10n.productionNewBatch),
              )
            : null,
        body: Column(
          children: [
            TabBar(
              tabs: [
                Tab(text: l10n.productionTabBatches),
                Tab(text: l10n.productionTabEntries),
              ],
            ),
            const Expanded(child: TabBarView(children: [_BatchList(), _EntryList()])),
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
        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 96),
        itemCount: value.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, i) => BatchCard(batch: value[i]),
      ),
      AsyncError() => const ErrorView(),
      _ => const AppLoader(),
    };
  }
}

class BatchCard extends StatelessWidget {
  const BatchCard({required this.batch, super.key});

  final BatchView batch;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return AppCard(
      onTap: () => context.push(AppRoutes.productionBatch(batch.ref.encode())),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(batch.chamber, style: text.titleMedium),
                Text(Formatters.displayIsoDate(batch.batchDate), style: text.bodySmall),
              ],
            ),
          ),
          BatchStatus(batch: batch),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}

/// The server's word for a batch, or the phone's sync state if it has none yet.
class BatchStatus extends StatelessWidget {
  const BatchStatus({required this.batch, super.key});

  final BatchView batch;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final local = batch.localRow;
    if (batch.serverStatus == null && local != null) {
      return RecordStatusChip(status: recordStatus(local));
    }
    final label = switch (batch.serverStatus) {
      'firing' => l10n.productionStatusFiring,
      'sorted' => l10n.productionStatusSorted,
      'closed' => l10n.productionStatusClosed,
      _ => l10n.productionStatusOpen,
    };
    return Text(
      label,
      style: Theme.of(context).textTheme.labelMedium?.copyWith(color: context.colors.info),
    );
  }
}

class _EntryList extends ConsumerWidget {
  const _EntryList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(queueRowsProvider(QueueGroup.production))) {
      AsyncData(:final value) when value.isEmpty => EmptyView(message: l10n.productionNoEntries),
      AsyncData(:final value) => ListView.separated(
        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 96),
        itemCount: value.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, i) =>
            QueueEntryTile(row: value[i], onEdit: editorFor(context, value[i])),
      ),
      AsyncError() => const ErrorView(),
      _ => const AppLoader(),
    };
  }
}
