import 'dart:math' as math;

import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/sync_summary.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/theme/app_text_styles.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/sync/presentation/entry_list.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
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
      header: Row(
        children: [
          _Ring(sent: sent, total: rows.length, summary: summary),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SyncStatusBadge(summary: summary),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  summary.online ? l10n.syncSentOf(sent, rows.length) : l10n.syncOfflineNote,
                  style: text.bodySmall?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
                ),
                const SizedBox(height: AppSpacing.md),
                _SyncNowButton(summary: summary),
              ],
            ),
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

/// Sent / total as a ring that sweeps to its value; the centre spins while sending.
class _Ring extends StatelessWidget {
  const _Ring({required this.sent, required this.total, required this.summary});

  final int sent;
  final int total;
  final SyncSummary summary;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final fraction = total == 0 ? 1.0 : sent / total;
    final motion = MotionScope.of(context);
    Widget icon = Icon(
      summary.syncing
          ? Icons.sync_rounded
          : (summary.online ? Icons.cloud_done_rounded : Icons.cloud_off_rounded),
      color: Colors.white,
      size: 20,
    );
    if (summary.syncing && motion) {
      icon = icon.animate(onPlay: (c) => c.repeat()).rotate(begin: 0, end: -1, duration: 1100.ms);
    }
    return SizedBox.square(
      dimension: 96,
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: fraction),
        duration: motion ? AppMotion.slow * 2 : Duration.zero,
        curve: AppMotion.enter,
        builder: (_, v, _) => CustomPaint(
          painter: _RingPainter(v),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                icon,
                Text(
                  '${(v * 100).round()}%',
                  style: AppTextStyles.number(text.titleMedium!.copyWith(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.value);

  final double value;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(6);
    canvas
      ..drawArc(
        rect,
        0,
        math.pi * 2,
        false,
        Paint()
          ..color = Colors.white.withValues(alpha: 0.18)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 9,
      )
      ..drawArc(
        rect,
        -math.pi / 2,
        math.pi * 2 * value,
        false,
        Paint()
          ..shader = const SweepGradient(
            colors: [AppPalette.accent300, AppPalette.primary300, AppPalette.accent300],
          ).createShader(rect)
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round
          ..strokeWidth = 9,
      );
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.value != value;
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
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm + 2),
        decoration: BoxDecoration(
          gradient: context.colors.goldGradient,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          boxShadow: const [
            BoxShadow(color: Color(0x40000000), blurRadius: 12, offset: Offset(0, 4)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.sync_rounded, size: 18, color: AppPalette.primary900),
            const SizedBox(width: AppSpacing.sm),
            Text(
              context.l10n.syncNow,
              style: text.labelLarge?.copyWith(color: AppPalette.primary900),
            ),
          ],
        ),
      ),
    );
  }
}
