import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/sync/sync_summary.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/decor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// The one answer to "has my entry gone through?" — always an icon plus words,
/// never colour alone, so it reads in sunlight and for colour-blind users.
/// A frosted pill on the green header; the icon spins while sending and a dot
/// pulses while anything waits.
class SyncStatusBadge extends StatelessWidget {
  const SyncStatusBadge({required this.summary, super.key, this.onTap, this.onSurface = false});

  final SyncSummary summary;
  final VoidCallback? onTap;

  /// True on a light surface rather than the green header.
  final bool onSurface;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final (IconData icon, Color tint, String label, bool waiting) = switch (summary) {
      SyncSummary(failed: > 0) => (
        Icons.error_rounded,
        colors.danger,
        l10n.syncBadgeFailed(summary.failed),
        true,
      ),
      SyncSummary(syncing: true) => (Icons.sync_rounded, colors.info, l10n.syncBadgeSyncing, false),
      SyncSummary(online: false) => (
        Icons.cloud_off_rounded,
        colors.warning,
        summary.pending > 0 ? l10n.syncBadgePending(summary.pending) : l10n.syncBadgeOffline,
        summary.pending > 0,
      ),
      SyncSummary(pending: > 0) => (
        Icons.schedule_rounded,
        colors.warning,
        l10n.syncBadgePending(summary.pending),
        true,
      ),
      _ => (Icons.cloud_done_rounded, colors.success, l10n.syncBadgeSynced, false),
    };
    final fg = onSurface ? colors.foreground : Colors.white;
    final motion = MotionScope.of(context);

    Widget glyph = Icon(icon, size: 16, color: onSurface ? tint : Colors.white);
    if (summary.syncing && summary.failed == 0 && motion) {
      glyph = glyph.animate(onPlay: (c) => c.repeat()).rotate(begin: 0, end: -1, duration: 1100.ms);
    }

    final pill = AnimatedContainer(
      duration: AppMotion.medium,
      padding: const EdgeInsets.fromLTRB(6, 4, AppSpacing.sm + 2, 4),
      decoration: BoxDecoration(
        color: onSurface ? tint.withValues(alpha: 0.12) : Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadius.button),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: onSurface ? Colors.transparent : tint,
              shape: BoxShape.circle,
            ),
            child: Center(child: glyph),
          ),
          const SizedBox(width: 6),
          AnimatedSwitcher(
            duration: AppMotion.medium,
            transitionBuilder: (child, a) => FadeTransition(
              opacity: a,
              child: SlideTransition(
                position: Tween(begin: const Offset(0, 0.4), end: Offset.zero).animate(a),
                child: child,
              ),
            ),
            child: Text(
              label,
              key: ValueKey(label),
              style: Theme.of(context).textTheme.labelMedium?.copyWith(color: fg),
            ),
          ),
          if (waiting) ...[const SizedBox(width: 2), PulseDot(color: tint, size: 6)],
        ],
      ),
    );

    return Semantics(
      button: onTap != null,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppSpacing.touchTarget),
          child: Center(child: pill),
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
    final (IconData icon, Tone tone, String label) = switch (status) {
      RecordSyncStatus.pending => (Icons.schedule_rounded, Tone.warning, l10n.statusPending),
      RecordSyncStatus.syncing => (Icons.sync_rounded, Tone.info, l10n.statusSyncing),
      RecordSyncStatus.synced => (Icons.check_circle_rounded, Tone.success, l10n.statusSynced),
      RecordSyncStatus.failed => (Icons.error_rounded, Tone.danger, l10n.statusFailed),
      RecordSyncStatus.blocked => (Icons.link_rounded, Tone.neutral, l10n.statusBlocked),
    };
    return StatusPill(label: label, tone: tone, icon: icon);
  }
}

/// The stripe colour of a card for a record in this state.
Color recordAccent(AppColors c, RecordSyncStatus status) => switch (status) {
  RecordSyncStatus.pending => c.warning,
  RecordSyncStatus.syncing => c.info,
  RecordSyncStatus.synced => c.success,
  RecordSyncStatus.failed => c.danger,
  RecordSyncStatus.blocked => c.border,
};
