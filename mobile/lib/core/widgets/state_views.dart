import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/app_button.dart';
import 'package:brics_mobile/core/widgets/decor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Three bricks hopping in turn — the app is working.
class AppLoader extends StatelessWidget {
  const AppLoader({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final motion = MotionScope.of(context);
    Widget brick(int i) {
      final b = Container(
        width: 22,
        height: 11,
        margin: const EdgeInsets.symmetric(horizontal: 3),
        decoration: BoxDecoration(
          color: [AppPalette.brick, AppPalette.accent500, colors.primary][i],
          borderRadius: BorderRadius.circular(3),
        ),
      );
      if (!motion) return b;
      return b
          .animate(onPlay: (c) => c.repeat(reverse: true), delay: (i * 140).ms)
          .moveY(begin: 0, end: -10, duration: 420.ms, curve: Curves.easeInOut);
    }

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 24,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [for (var i = 0; i < 3; i++) brick(i)],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(message ?? context.l10n.commonLoading, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({super.key, this.message, this.icon = Icons.inbox_outlined, this.action});

  final String? message;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return _Centered(
      art: _Illustration(icon: icon, tone: Tone.primary),
      message: message ?? context.l10n.commonNothingHere,
      action: action,
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, this.message, this.onRetry});

  final String? message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return _Centered(
      art: const _Illustration(icon: Icons.error_outline, tone: Tone.danger),
      message: message ?? context.l10n.commonSomethingWrong,
      action: onRetry == null
          ? null
          : AppButton(
              label: context.l10n.commonRetry,
              onPressed: onRetry,
              variant: AppButtonVariant.secondary,
              expand: false,
            ),
    );
  }
}

/// An icon on two soft rings, floating gently.
class _Illustration extends StatelessWidget {
  const _Illustration({required this.icon, required this.tone});

  final IconData icon;
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final (fg, bg) = tone.of(context.colors);
    final art = SizedBox.square(
      dimension: 132,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 132,
            height: 132,
            decoration: BoxDecoration(shape: BoxShape.circle, color: bg.withValues(alpha: 0.5)),
          ),
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(shape: BoxShape.circle, color: bg),
          ),
          Icon(icon, size: 44, color: fg),
        ],
      ),
    );
    if (!MotionScope.of(context)) return art;
    return art
        .animate()
        .scale(
          begin: const Offset(0.85, 0.85),
          duration: AppMotion.slow,
          curve: AppMotion.emphasized,
        )
        .then()
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .moveY(begin: 0, end: -6, duration: 1800.ms, curve: Curves.easeInOut);
  }
}

class _Centered extends StatelessWidget {
  const _Centered({required this.art, required this.message, this.action});

  final Widget art;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            art,
            const SizedBox(height: AppSpacing.lg),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: context.colors.mutedForeground),
              ),
            ),
            if (action != null) ...[const SizedBox(height: AppSpacing.lg), action!],
          ],
        ),
      ),
    );
  }
}
