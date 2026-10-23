import 'dart:async';

import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/theme/app_text_styles.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/pressable.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A whole-number field with big − / + buttons and quick-add chips, for brick
/// counts and overtime. The text stays a string so a count never passes
/// through a double.
class NumberStepper extends StatefulWidget {
  const NumberStepper({
    required this.label,
    required this.value,
    required this.onChanged,
    super.key,
    this.step = 1,
    this.min = 0,
    this.validator,
    this.quickAdds = const [],
  });

  final String label;
  final int value;
  final ValueChanged<int> onChanged;
  final int step;
  final int min;
  final FormFieldValidator<String>? validator;

  /// Amounts offered as one-tap chips, e.g. `[500, 1000, 5000]`.
  final List<int> quickAdds;

  @override
  State<NumberStepper> createState() => _NumberStepperState();
}

class _NumberStepperState extends State<NumberStepper> {
  late final TextEditingController _controller = TextEditingController(text: '${widget.value}');

  @override
  void didUpdateWidget(NumberStepper oldWidget) {
    super.didUpdateWidget(oldWidget);
    final text = '${widget.value}';
    if (_controller.text != text && int.tryParse(_controller.text) != widget.value) {
      _controller.text = text;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _set(int next) {
    final clamped = next < widget.min ? widget.min : next;
    _controller.text = '$clamped';
    widget.onChanged(clamped);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;

    Widget round({
      required IconData icon,
      required String tooltip,
      required VoidCallback? onTap,
      required bool filled,
    }) {
      return Tooltip(
        message: tooltip,
        child: Semantics(
          button: true,
          label: tooltip,
          child: Pressable(
            onTap: onTap,
            scale: 0.9,
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 150),
              opacity: onTap == null ? 0.4 : 1,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadius.button),
                  color: filled ? colors.primary : colors.surface,
                  border: filled ? null : Border.all(color: colors.border),
                ),
                child: Icon(icon, color: filled ? colors.onPrimary : colors.foreground),
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              round(
                icon: Icons.remove_rounded,
                tooltip: l10n.commonDecrease,
                filled: false,
                onTap: widget.value > widget.min ? () => _set(widget.value - widget.step) : null,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: TextFormField(
                  controller: _controller,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.number(text.headlineSmall!),
                  decoration: InputDecoration(
                    labelText: widget.label,
                    floatingLabelAlignment: FloatingLabelAlignment.center,
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: widget.validator,
                  onChanged: (text) => widget.onChanged(int.tryParse(text) ?? 0),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              round(
                icon: Icons.add_rounded,
                tooltip: l10n.commonIncrease,
                filled: true,
                onTap: () => _set(widget.value + widget.step),
              ),
            ],
          ),
          if (widget.quickAdds.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (final amount in widget.quickAdds)
                  ActionChip(
                    avatar: Icon(Icons.add_rounded, size: 16, color: colors.primary),
                    label: Text(Formatters.quantity('$amount')),
                    labelStyle: text.labelMedium?.copyWith(color: colors.primary),
                    backgroundColor: colors.successSoft,
                    side: BorderSide.none,
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.button),
                    ),
                    onPressed: () {
                      unawaited(HapticFeedback.selectionClick());
                      _set(widget.value + amount);
                    },
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
