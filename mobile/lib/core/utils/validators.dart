import 'package:brics_mobile/core/l10n/l10n.dart';

/// Form validators that mirror the backend's Zod rules in `@brics/shared`,
/// so a field entry is refused on the phone rather than failing in the queue.
class Validators {
  const Validators(this.l10n);

  final AppLocalizations l10n;

  static final _wholeNumber = RegExp(r'^\d{1,15}$');
  static final _quantity = RegExp(r'^\d{1,15}(\.\d{1,3})?$');

  String? required(Object? value) {
    if (value == null) return l10n.commonRequired;
    if (value is String && value.trim().isEmpty) return l10n.commonRequired;
    return null;
  }

  /// A brick count: whole, more than zero.
  String? brickCount(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return l10n.commonRequired;
    if (!_wholeNumber.hasMatch(v)) return l10n.validationWholeNumber;
    if (BigInt.parse(v) == BigInt.zero) return l10n.validationMoreThanZero;
    return null;
  }

  /// A brick count where zero is allowed (broken, rejects).
  String? brickCountOrZero(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return l10n.commonRequired;
    if (!_wholeNumber.hasMatch(v)) return l10n.validationWholeNumber;
    return null;
  }

  /// A weighed or measured quantity: up to three decimals, more than zero.
  String? quantity(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return l10n.commonRequired;
    if (!_quantity.hasMatch(v)) return l10n.validationQuantity;
    if (!RegExp('[1-9]').hasMatch(v)) return l10n.validationMoreThanZero;
    return null;
  }

  String? Function(String?) maxLength(int max, {bool optional = true}) {
    return (value) {
      final v = value?.trim() ?? '';
      if (!optional && v.isEmpty) return l10n.commonRequired;
      if (v.length > max) return l10n.validationTooLong(max);
      return null;
    };
  }
}

/// Trims and turns blank into null, the way the backend's optional fields expect.
String? blankToNull(String? value) {
  final v = value?.trim();
  return v == null || v.isEmpty ? null : v;
}
