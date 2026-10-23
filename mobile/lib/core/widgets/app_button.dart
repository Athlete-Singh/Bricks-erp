import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/pressable.dart';
import 'package:flutter/material.dart';

enum AppButtonVariant { primary, secondary, ghost, danger }

/// The only button screens use. Full width by default, 48 dp tall; the
/// primary one is solid brand green.
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

    if (variant == AppButtonVariant.primary || variant == AppButtonVariant.danger) {
      final enabled = action != null;
      final fill = variant == AppButtonVariant.danger ? colors.danger : colors.primary;
      final button = Semantics(
        button: true,
        enabled: enabled,
        label: label,
        child: Pressable(
          onTap: action,
          child: AnimatedOpacity(
            opacity: enabled || busy ? 1 : 0.5,
            duration: const Duration(milliseconds: 150),
            child: Container(
              constraints: const BoxConstraints(
                minHeight: AppSpacing.primaryAction,
                minWidth: AppSpacing.touchTarget,
              ),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              decoration: BoxDecoration(
                color: fill,
                borderRadius: BorderRadius.circular(AppRadius.button),
              ),
              child: Center(
                widthFactor: 1,
                heightFactor: 1,
                child: ExcludeSemantics(
                  child: DefaultTextStyle.merge(
                    style: Theme.of(
                      context,
                    ).textTheme.labelLarge!.copyWith(color: colors.onPrimary),
                    child: IconTheme.merge(
                      data: IconThemeData(color: colors.onPrimary),
                      child: busy
                          ? SizedBox.square(
                              dimension: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: colors.onPrimary,
                              ),
                            )
                          : _Label(label: label, icon: icon),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      return expand ? SizedBox(width: double.infinity, child: button) : button;
    }

    final child = busy
        ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
        : _Label(label: label, icon: icon);
    final Widget button = variant == AppButtonVariant.secondary
        ? OutlinedButton(onPressed: action, child: child)
        : TextButton(onPressed: action, child: child);
    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}

class _Label extends StatelessWidget {
  const _Label({required this.label, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    if (icon == null) return Text(label, textAlign: TextAlign.center);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18),
        const SizedBox(width: AppSpacing.sm),
        Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
