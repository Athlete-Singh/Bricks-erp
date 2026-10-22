import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum AppFieldKind { text, wholeNumber, decimal, phone, password }

/// A labelled form field. The kind picks the keyboard so a count opens the
/// number pad — the supervisor should not have to switch keyboards.
class AppTextField extends StatefulWidget {
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
    this.prefixIcon,
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
  final IconData? prefixIcon;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: TextFormField(
        controller: widget.controller,
        initialValue: widget.controller == null ? widget.initialValue : null,
        enabled: widget.enabled,
        decoration: InputDecoration(
          labelText: widget.label,
          hintText: widget.hint,
          counterText: '',
          prefixIcon: widget.prefixIcon == null ? null : Icon(widget.prefixIcon),
          suffixIcon: widget.kind == AppFieldKind.password
              ? IconButton(
                  icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure = !_obscure),
                )
              : null,
        ),
        keyboardType: switch (widget.kind) {
          AppFieldKind.wholeNumber => TextInputType.number,
          AppFieldKind.decimal => const TextInputType.numberWithOptions(decimal: true),
          AppFieldKind.phone => TextInputType.phone,
          _ => widget.maxLines > 1 ? TextInputType.multiline : TextInputType.text,
        },
        inputFormatters: switch (widget.kind) {
          AppFieldKind.wholeNumber => [FilteringTextInputFormatter.digitsOnly],
          AppFieldKind.decimal => [FilteringTextInputFormatter.allow(RegExp('[0-9.]'))],
          _ => null,
        },
        obscureText: widget.kind == AppFieldKind.password && _obscure,
        autocorrect: widget.kind == AppFieldKind.text,
        maxLines: widget.kind == AppFieldKind.password ? 1 : widget.maxLines,
        maxLength: widget.maxLength,
        autofillHints: widget.autofillHints,
        textInputAction: widget.textInputAction,
        onFieldSubmitted: widget.onSubmitted,
        validator: widget.validator,
        onChanged: widget.onChanged,
      ),
    );
  }
}
