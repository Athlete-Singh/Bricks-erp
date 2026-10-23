import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:flutter/material.dart';

/// Raised → Left the gate → Delivered, with the leg travelled filled in.
class JourneyTracker extends StatelessWidget {
  const JourneyTracker({
    required this.status,
    super.key,
    this.onHeader = false,
    this.compact = false,
  });

  final String status;
  final bool onHeader;

  /// Dots only, for list cards.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final reached = switch (status) {
      DispatchStatus.delivered => 2,
      DispatchStatus.confirmed => 1,
      _ => 0,
    };
    final cancelled = status == DispatchStatus.cancelled;
    final on = cancelled ? colors.danger : (onHeader ? AppPalette.accent300 : colors.success);
    final off = onHeader ? Colors.white.withValues(alpha: 0.25) : colors.border;
    final labels = [
      l10n.dispatchStatusDraft,
      l10n.dispatchStatusConfirmed,
      l10n.dispatchStatusDelivered,
    ];
    final icons = [
      Icons.receipt_long_rounded,
      Icons.local_shipping_rounded,
      Icons.handshake_rounded,
    ];
    final dot = compact ? 8.0 : 28.0;

    return Column(
      children: [
        Row(
          children: [
            for (var i = 0; i < 3; i++) ...[
              AnimatedContainer(
                duration: AppMotion.medium,
                width: dot,
                height: dot,
                decoration: BoxDecoration(shape: BoxShape.circle, color: i <= reached ? on : off),
                child: compact
                    ? null
                    : Icon(
                        icons[i],
                        size: 15,
                        color: i <= reached
                            ? (onHeader ? AppPalette.primary900 : Colors.white)
                            : Colors.white70,
                      ),
              ),
              if (i < 2)
                Expanded(
                  child: Container(
                    height: compact ? 3 : 4,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(color: off, borderRadius: BorderRadius.circular(2)),
                    alignment: Alignment.centerLeft,
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(end: i < reached ? 1 : 0),
                      duration: MotionScope.of(context) ? AppMotion.slow : Duration.zero,
                      curve: AppMotion.enter,
                      builder: (_, v, _) => FractionallySizedBox(
                        widthFactor: v,
                        child: Container(
                          decoration: BoxDecoration(
                            color: on,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ],
        ),
        if (!compact) ...[
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              for (var i = 0; i < 3; i++)
                Expanded(
                  child: Text(
                    labels[i],
                    textAlign: switch (i) {
                      0 => TextAlign.start,
                      1 => TextAlign.center,
                      _ => TextAlign.end,
                    },
                    style: text.labelSmall?.copyWith(
                      color: onHeader
                          ? Colors.white.withValues(alpha: i <= reached ? 1 : 0.6)
                          : (i <= reached ? colors.foreground : colors.mutedForeground),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}
