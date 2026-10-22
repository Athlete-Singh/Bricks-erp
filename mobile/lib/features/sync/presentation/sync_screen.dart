import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/sync/presentation/entry_editors.dart';
import 'package:brics_mobile/features/sync/presentation/queue_entry_tile.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// MOB-02 — everything entered on this phone and whether it reached the server.
class SyncScreen extends ConsumerWidget {
  const SyncScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final summary = ref.watch(syncControllerProvider);
    final rows = ref.watch(queueRowsProvider(QueueGroup.all));
    final text = Theme.of(context).textTheme;

    return AppScaffold(
      title: l10n.syncTitle,
      scrollable: false,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    SyncStatusBadge(summary: summary),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        summary.lastSyncedAt == null
                            ? l10n.syncNeverSynced
                            : l10n.syncLastSynced(Formatters.displayTime(summary.lastSyncedAt!)),
                        style: text.bodySmall,
                      ),
                    ),
                  ],
                ),
                if (!summary.online) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    l10n.syncOfflineNote,
                    style: text.bodyMedium?.copyWith(color: context.colors.warning),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                AppButton(
                  label: l10n.syncNow,
                  icon: Icons.sync,
                  busy: summary.syncing,
                  onPressed: () =>
                      ref.read(syncControllerProvider.notifier).syncNow(expedite: true),
                ),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: switch (rows) {
              AsyncData(:final value) when value.isEmpty => EmptyView(message: l10n.syncEmpty),
              AsyncData(:final value) => ListView.separated(
                padding: const EdgeInsets.all(AppSpacing.lg),
                itemCount: value.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, i) =>
                    QueueEntryTile(row: value[i], onEdit: editorFor(context, value[i])),
              ),
              AsyncError() => ErrorView(
                onRetry: () => ref.invalidate(queueRowsProvider(QueueGroup.all)),
              ),
              _ => const AppLoader(),
            },
          ),
        ],
      ),
    );
  }
}
