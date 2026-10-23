import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/sync_summary.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/sync/presentation/entry_list.dart';
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
    final rows = ref.watch(queueRowsProvider(QueueGroup.all)).value ?? const [];
    final sent = rows.where((r) => r.status == QueueStatus.synced).length;
    final text = Theme.of(context).textTheme;

    return AppScaffold(
      title: l10n.syncTitle,
      subtitle: summary.lastSyncedAt == null
          ? l10n.syncNeverSynced
          : l10n.syncLastSynced(Formatters.displayTime(summary.lastSyncedAt!)),
      scrollable: false,
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              SyncStatusBadge(summary: summary),
              const Spacer(),
              _SyncNowButton(summary: summary),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          _Progress(sent: sent, total: rows.length),
          const SizedBox(height: AppSpacing.xs),
          Text(
            summary.online ? l10n.syncSentOf(sent, rows.length) : l10n.syncOfflineNote,
            style: text.bodySmall?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
          ),
        ],
      ),
      body: EntryList(
        group: QueueGroup.all,
        emptyMessage: l10n.syncEmpty,
        emptyIcon: Icons.cloud_done_outlined,
      ),
    );
  }
}

/// Sent / total as a thin bar that slides to its value.
class _Progress extends StatelessWidget {
  const _Progress({required this.sent, required this.total});

  final int sent;
  final int total;

  @override
  Widget build(BuildContext context) {
    final fraction = total == 0 ? 1.0 : sent / total;
    return TweenAnimationBuilder<double>(
      tween: Tween(end: fraction),
      duration: MotionScope.of(context) ? AppMotion.slow : Duration.zero,
      curve: AppMotion.enter,
      builder: (_, v, _) => ClipRRect(
        borderRadius: BorderRadius.circular(2),
        child: LinearProgressIndicator(
          value: v,
          minHeight: 4,
          color: AppPalette.accent300,
          backgroundColor: Colors.white.withValues(alpha: 0.18),
        ),
      ),
    );
  }
}

class _SyncNowButton extends ConsumerWidget {
  const _SyncNowButton({required this.summary});

  final SyncSummary summary;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    return Pressable(
      onTap: summary.syncing
          ? null
          : () => ref.read(syncControllerProvider.notifier).syncNow(expedite: true),
      child: Container(
        constraints: const BoxConstraints(minHeight: 36),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        decoration: BoxDecoration(
          color: AppPalette.accent300,
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.sync_rounded, size: 16, color: AppPalette.primary900),
            const SizedBox(width: AppSpacing.sm),
            Text(
              context.l10n.syncNow,
              style: text.labelMedium?.copyWith(
                color: AppPalette.primary900,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
