import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/pressable.dart';
import 'package:flutter/material.dart';

/// A raised surface for grouped content. Tappable cards squeeze under the
/// thumb; [accent] draws a status stripe down the left edge.
class AppCard extends StatelessWidget {
  const AppCard({
    required this.child,
    super.key,
    this.onTap,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.accent,
    this.color,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final Color? accent;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    Widget content = Padding(padding: padding, child: child);
    if (accent != null) {
      // The stripe is laid over the card's left edge rather than measured into
      // a row: an intrinsic-height row miscounts content that is animating
      // its size (a field collapsing) and overflows for a frame.
      content = Stack(
        children: [
          Padding(padding: const EdgeInsets.only(left: 5), child: content),
          Positioned(left: 0, top: 0, bottom: 0, width: 5, child: ColoredBox(color: accent!)),
        ],
      );
    }
    final card = DecoratedBox(
      decoration: BoxDecoration(
        color: color ?? colors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: colors.border.withValues(alpha: 0.7)),
        boxShadow: colors.softShadow,
      ),
      child: ClipRRect(borderRadius: BorderRadius.circular(AppRadius.card), child: content),
    );
    if (onTap == null) return card;
    return Semantics(
      button: true,
      child: Pressable(onTap: onTap, child: card),
    );
  }
}
