import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';

/// Tone of a pill or icon badge.
enum Tone { neutral, primary, success, warning, danger, info, gold }

extension ToneColors on Tone {
  (Color fg, Color bg) of(AppColors c) => switch (this) {
    Tone.neutral => (c.mutedForeground, c.surfaceMuted),
    Tone.primary => (c.primary, c.successSoft),
    Tone.success => (c.success, c.successSoft),
    Tone.warning => (c.warning, c.warningSoft),
    Tone.danger => (c.danger, c.dangerSoft),
    Tone.info => (c.info, c.infoSoft),
    Tone.gold => (AppPalette.accent800, AppPalette.accent100),
  };
}

/// A rounded label with an icon — status that reads without relying on colour.
class StatusPill extends StatelessWidget {
  const StatusPill({required this.label, required this.tone, super.key, this.icon});

  final String label;
  final Tone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final (fg, bg) = tone.of(context.colors);
    return AnimatedContainer(
      duration: AppMotion.medium,
      // A pill never pushes its row off the screen; long words truncate.
      constraints: const BoxConstraints(maxWidth: 190),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14, color: fg), const SizedBox(width: 5)],
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: fg),
            ),
          ),
        ],
      ),
    );
  }
}

/// An icon on a tinted rounded square.
class IconBadge extends StatelessWidget {
  const IconBadge({required this.icon, super.key, this.tone = Tone.primary, this.size = 48});

  final IconData icon;
  final Tone tone;
  final double size;

  @override
  Widget build(BuildContext context) {
    final (fg, bg) = tone.of(context.colors);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(size * 0.32)),
      child: Icon(icon, color: fg, size: size * 0.5),
    );
  }
}

/// A small capitalised heading over a group of content.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final style = AppTextStyles.overline(Theme.of(context).textTheme.labelSmall!);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xs,
        AppSpacing.lg,
        AppSpacing.xs,
        AppSpacing.sm,
      ),
      child: Row(
        children: [
          Expanded(child: Text(text.toUpperCase(), style: style)),
          ?trailing,
        ],
      ),
    );
  }
}

/// A titled group on a form: icon, title, optional hint, then its fields.
class FormSection extends StatelessWidget {
  const FormSection({required this.title, required this.children, super.key, this.icon, this.hint});

  final String title;
  final IconData? icon;
  final String? hint;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: colors.border.withValues(alpha: 0.7)),
        boxShadow: colors.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                IconBadge(icon: icon!, size: 36),
                const SizedBox(width: AppSpacing.md),
              ],
              Expanded(child: Text(title, style: text.titleMedium)),
            ],
          ),
          if (hint != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(hint!, style: text.bodySmall),
          ],
          const SizedBox(height: AppSpacing.lg),
          ...children,
        ],
      ),
    );
  }
}

/// A whole number that rolls to its new value instead of jumping.
class AnimatedCount extends StatelessWidget {
  const AnimatedCount({required this.value, super.key, this.style, this.format});

  final num value;
  final TextStyle? style;
  final String Function(num value)? format;

  @override
  Widget build(BuildContext context) {
    final base = AppTextStyles.number(style ?? Theme.of(context).textTheme.headlineSmall!);
    String show(num v) => format?.call(v) ?? v.round().toString();
    if (!MotionScope.of(context)) return Text(show(value), style: base);
    return TweenAnimationBuilder<double>(
      tween: Tween(end: value.toDouble()),
      duration: AppMotion.slow,
      curve: AppMotion.enter,
      builder: (_, v, _) => Text(show(v), style: base),
    );
  }
}

/// A pulsing dot — something is waiting. Still when motion is off.
class PulseDot extends StatefulWidget {
  const PulseDot({required this.color, super.key, this.size = 8});

  final Color color;
  final double size;

  @override
  State<PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<PulseDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MotionScope.of(context)) {
      if (!_c.isAnimating) _c.repeat();
    } else {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    return SizedBox.square(
      dimension: s * 2.4,
      child: AnimatedBuilder(
        animation: _c,
        builder: (_, _) => Stack(
          alignment: Alignment.center,
          children: [
            if (_c.isAnimating)
              Container(
                width: s * (1 + 1.4 * _c.value),
                height: s * (1 + 1.4 * _c.value),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.color.withValues(alpha: 0.45 * (1 - _c.value)),
                ),
              ),
            Container(
              width: s,
              height: s,
              decoration: BoxDecoration(shape: BoxShape.circle, color: widget.color),
            ),
          ],
        ),
      ),
    );
  }
}
