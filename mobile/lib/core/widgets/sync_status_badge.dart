import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/sync/sync_summary.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';

/// The one answer to "has my entry gone through?" — always an icon plus words,
/// never colour alone, so it reads in sunlight and for colour-blind users.
class SyncStatusBadge extends StatelessWidget {
  const SyncStatusBadge({required this.summary, super.key, this.onTap});

  final SyncSummary summary;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final (IconData icon, Color color, String label) = switch (summary) {
      SyncSummary(failed: > 0) => (
        Icons.error,
        colors.danger,
        l10n.syncBadgeFailed(summary.failed),
      ),
      SyncSummary(syncing: true) => (Icons.sync, colors.info, l10n.syncBadgeSyncing),
      SyncSummary(online: false) => (
        Icons.cloud_off,
        colors.warning,
        summary.pending > 0 ? l10n.syncBadgePending(summary.pending) : l10n.syncBadgeOffline,
      ),
      SyncSummary(pending: > 0) => (
        Icons.schedule,
        colors.warning,
        l10n.syncBadgePending(summary.pending),
      ),
      _ => (Icons.cloud_done, colors.success, l10n.syncBadgeSynced),
    };

    return Semantics(
      button: onTap != null,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.modal),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppSpacing.touchTarget),
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(AppRadius.modal),
                border: Border.all(color: color, width: 1.5),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 16, color: color),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    label,
                    style: Theme.of(
                      context,
                    ).textTheme.labelMedium?.copyWith(color: colors.foreground),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Per-record status chip for lists of field entries.
enum RecordSyncStatus { pending, syncing, synced, failed, blocked }

class RecordStatusChip extends StatelessWidget {
  const RecordStatusChip({required this.status, super.key});

  final RecordSyncStatus status;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final (IconData icon, Color color, String label) = switch (status) {
      RecordSyncStatus.pending => (Icons.schedule, colors.warning, l10n.statusPending),
      RecordSyncStatus.syncing => (Icons.sync, colors.info, l10n.statusSyncing),
      RecordSyncStatus.synced => (Icons.check_circle, colors.success, l10n.statusSynced),
      RecordSyncStatus.failed => (Icons.error, colors.danger, l10n.statusFailed),
      RecordSyncStatus.blocked => (Icons.link, colors.mutedForeground, l10n.statusBlocked),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: AppSpacing.xs),
        Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color)),
      ],
    );
  }
}
