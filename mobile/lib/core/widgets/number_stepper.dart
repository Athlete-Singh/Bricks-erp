import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/theme/app_text_styles.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A whole-number field with − / + buttons, for brick counts and overtime.
/// The text stays a string so a count never passes through a double.
class NumberStepper extends StatefulWidget {
  const NumberStepper({
    required this.label,
    required this.value,
    required this.onChanged,
    super.key,
    this.step = 1,
    this.min = 0,
    this.validator,
  });

  final String label;
  final int value;
  final ValueChanged<int> onChanged;
  final int step;
  final int min;
  final FormFieldValidator<String>? validator;

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
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconButton.outlined(
            tooltip: l10n.commonDecrease,
            constraints: const BoxConstraints.tightFor(
              width: AppSpacing.touchTarget,
              height: AppSpacing.touchTarget,
            ),
            onPressed: widget.value > widget.min ? () => _set(widget.value - widget.step) : null,
            icon: const Icon(Icons.remove),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: TextFormField(
              controller: _controller,
              textAlign: TextAlign.center,
              style: AppTextStyles.number(Theme.of(context).textTheme.titleMedium!),
              decoration: InputDecoration(labelText: widget.label),
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              validator: widget.validator,
              onChanged: (text) => widget.onChanged(int.tryParse(text) ?? 0),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          IconButton.filled(
            tooltip: l10n.commonIncrease,
            constraints: const BoxConstraints.tightFor(
              width: AppSpacing.touchTarget,
              height: AppSpacing.touchTarget,
            ),
            onPressed: () => _set(widget.value + widget.step),
            icon: const Icon(Icons.add),
          ),
        ],
      ),
    );
  }
}
