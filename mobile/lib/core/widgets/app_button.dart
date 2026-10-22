import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';

enum AppButtonVariant { primary, secondary, ghost, danger }

/// The only button screens use. Full width by default, ≥ 48 dp tall.
class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.busy = false,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;

  /// Shows a spinner and ignores taps — stops a double submit.
  final bool busy;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final action = busy ? null : onPressed;
    final child = busy
        ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
        : _Label(label: label, icon: icon);

    final Widget button = switch (variant) {
      AppButtonVariant.primary => FilledButton(onPressed: action, child: child),
      AppButtonVariant.danger => FilledButton(
        onPressed: action,
        style: FilledButton.styleFrom(
          backgroundColor: colors.danger,
          foregroundColor: colors.onPrimary,
        ),
        child: child,
      ),
      AppButtonVariant.secondary => OutlinedButton(onPressed: action, child: child),
      AppButtonVariant.ghost => TextButton(onPressed: action, child: child),
    };

    if (expand) return SizedBox(width: double.infinity, child: button);
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: AppSpacing.touchTarget),
      child: button,
    );
  }
}

class _Label extends StatelessWidget {
  const _Label({required this.label, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    if (icon == null) return Text(label);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: AppSpacing.sm),
        Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
