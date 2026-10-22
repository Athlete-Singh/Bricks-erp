import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum AppFieldKind { text, wholeNumber, decimal, phone, password }

/// A labelled form field. The kind picks the keyboard so a count opens the
/// number pad — the supervisor should not have to switch keyboards.
class AppTextField extends StatelessWidget {
  const AppTextField({
    required this.label,
    super.key,
    this.controller,
    this.initialValue,
    this.kind = AppFieldKind.text,
    this.hint,
    this.validator,
    this.onChanged,
    this.maxLines = 1,
    this.maxLength,
    this.autofillHints,
    this.textInputAction,
    this.onSubmitted,
    this.enabled = true,
  });

  final String label;
  final TextEditingController? controller;
  final String? initialValue;
  final AppFieldKind kind;
  final String? hint;
  final FormFieldValidator<String>? validator;
  final ValueChanged<String>? onChanged;
  final int maxLines;
  final int? maxLength;
  final Iterable<String>? autofillHints;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: TextFormField(
        controller: controller,
        initialValue: controller == null ? initialValue : null,
        enabled: enabled,
        decoration: InputDecoration(labelText: label, hintText: hint, counterText: ''),
        keyboardType: switch (kind) {
          AppFieldKind.wholeNumber => TextInputType.number,
          AppFieldKind.decimal => const TextInputType.numberWithOptions(decimal: true),
          AppFieldKind.phone => TextInputType.phone,
          _ => maxLines > 1 ? TextInputType.multiline : TextInputType.text,
        },
        inputFormatters: switch (kind) {
          AppFieldKind.wholeNumber => [FilteringTextInputFormatter.digitsOnly],
          AppFieldKind.decimal => [FilteringTextInputFormatter.allow(RegExp('[0-9.]'))],
          _ => null,
        },
        obscureText: kind == AppFieldKind.password,
        autocorrect: kind == AppFieldKind.text,
        maxLines: kind == AppFieldKind.password ? 1 : maxLines,
        maxLength: maxLength,
        autofillHints: autofillHints,
        textInputAction: textInputAction,
        onFieldSubmitted: onSubmitted,
        validator: validator,
        onChanged: onChanged,
      ),
    );
  }
}
