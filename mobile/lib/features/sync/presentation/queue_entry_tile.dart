import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/sync/presentation/queue_labels.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One field entry and where it stands. A refused entry shows the server's
/// reason and the ways out: send again, correct it, or discard it.
class QueueEntryTile extends ConsumerWidget {
  const QueueEntryTile({required this.row, super.key, this.onEdit});

  final QueueRow row;

  /// Opens the entry's form to correct it. Only offered once the server refused it.
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final parent = row.dependsOn == null ? null : ref.watch(queueRowProvider(row.dependsOn!)).value;
    final status = recordStatus(row, parent: parent);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(entityLabel(l10n, row.entity), style: text.labelMedium)),
              RecordStatusChip(status: status),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(row.title, style: text.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.md,
            children: [
              Text(Formatters.displayTime(row.createdAt), style: text.bodySmall),
              if (row.serverRef != null)
                Text(l10n.syncServerNo(row.serverRef!), style: text.bodySmall),
              if (row.status == QueueStatus.pending && row.attempts > 0)
                Text(l10n.syncAttempts(row.attempts), style: text.bodySmall),
            ],
          ),
          if (row.status == QueueStatus.failed) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              row.lastError ?? l10n.commonSomethingWrong,
              style: text.bodyMedium?.copyWith(color: colors.danger),
            ),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                AppButton(
                  label: l10n.syncRetry,
                  icon: Icons.refresh,
                  expand: false,
                  variant: AppButtonVariant.secondary,
                  onPressed: () async {
                    await ref.read(queueRepositoryProvider).retry(row.id);
                    ref.read(syncControllerProvider.notifier).kick();
                  },
                ),
                if (onEdit != null)
                  AppButton(
                    label: l10n.commonEdit,
                    icon: Icons.edit,
                    expand: false,
                    variant: AppButtonVariant.secondary,
                    onPressed: onEdit,
                  ),
                AppButton(
                  label: l10n.commonDiscard,
                  icon: Icons.delete_outline,
                  expand: false,
                  variant: AppButtonVariant.ghost,
                  onPressed: () => _confirmDiscard(context, ref),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _confirmDiscard(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.syncDiscardTitle),
        content: Text(l10n.syncDiscardBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(l10n.commonCancel),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(l10n.commonDiscard),
          ),
        ],
      ),
    );
    if (ok ?? false) await ref.read(queueRepositoryProvider).discard(row.id);
  }
}
