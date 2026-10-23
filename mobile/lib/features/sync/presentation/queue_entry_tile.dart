import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/theme/app_text_styles.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/sync/presentation/queue_labels.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

(IconData, Tone) entityLook(String entity) => switch (entity) {
  QueueEntity.attendance => (Icons.groups_rounded, Tone.info),
  QueueEntity.goodsReceipt => (Icons.inventory_2_rounded, Tone.gold),
  QueueEntity.dispatch => (Icons.local_shipping_rounded, Tone.primary),
  QueueEntity.dispatchConfirm => (Icons.logout_rounded, Tone.primary),
  QueueEntity.dispatchAcknowledge => (Icons.assignment_turned_in_rounded, Tone.success),
  QueueEntity.productionBatch => (Icons.add_box_rounded, Tone.warning),
  _ => (Icons.local_fire_department_rounded, Tone.warning),
};

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
    final (icon, tone) = entityLook(row.entity);

    return AppCard(
      accent: recordAccent(colors, status),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconBadge(icon: icon, tone: tone, size: 32),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entityLabel(l10n, row.entity).toUpperCase(),
                      style: AppTextStyles.overline(text.labelSmall!),
                    ),
                    Text(row.title, style: text.titleSmall),
                    const SizedBox(height: 2),
                    Wrap(
                      spacing: AppSpacing.md,
                      runSpacing: 2,
                      children: [
                        _Meta(
                          icon: Icons.access_time_rounded,
                          label: Formatters.displayTime(row.createdAt),
                        ),
                        if (row.serverRef != null)
                          _Meta(icon: Icons.tag_rounded, label: l10n.syncServerNo(row.serverRef!)),
                        if (row.status == QueueStatus.pending && row.attempts > 0)
                          _Meta(icon: Icons.replay_rounded, label: l10n.syncAttempts(row.attempts)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              RecordStatusChip(status: status),
            ],
          ),
          if (row.status == QueueStatus.failed) ...[
            const SizedBox(height: AppSpacing.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: colors.dangerSoft,
                borderRadius: BorderRadius.circular(AppRadius.input),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.report_rounded, size: 18, color: colors.danger),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      row.lastError ?? l10n.commonSomethingWrong,
                      style: text.bodySmall?.copyWith(color: colors.foreground),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            // One quiet row of actions under the reason, not three big buttons.
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                _Action(
                  label: l10n.commonDiscard,
                  icon: Icons.delete_outline_rounded,
                  color: colors.danger,
                  onPressed: () => _confirmDiscard(context, ref),
                ),
                if (onEdit != null)
                  _Action(label: l10n.commonEdit, icon: Icons.edit_outlined, onPressed: onEdit!),
                _Action(
                  label: l10n.syncRetry,
                  icon: Icons.refresh_rounded,
                  onPressed: () async {
                    await ref.read(queueRepositoryProvider).retry(row.id);
                    ref.read(syncControllerProvider.notifier).kick();
                  },
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
        icon: Icon(Icons.delete_forever_rounded, color: context.colors.danger, size: 36),
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

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final muted = context.colors.mutedForeground;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: muted),
        const SizedBox(width: 3),
        Flexible(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({required this.label, required this.icon, required this.onPressed, this.color});

  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: TextButton.styleFrom(
        foregroundColor: color,
        minimumSize: const Size(0, 40),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
        textStyle: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
      ),
    );
  }
}
