import 'package:intl/intl.dart';

abstract final class Formatters {
  static final _iso = DateFormat('yyyy-MM-dd');
  static final _display = DateFormat('d MMM yyyy');
  static final _displayTime = DateFormat('d MMM, h:mm a');
  // Indian grouping: 12,34,567 — how the kiln reads a brick count.
  static final _count = NumberFormat.decimalPattern('en_IN');

  /// The wire format every date field uses (`YYYY-MM-DD`), in local time.
  static String isoDate(DateTime d) => _iso.format(d);

  static DateTime parseIsoDate(String s) => _iso.parse(s);

  static String displayDate(DateTime d) => _display.format(d);

  static String displayIsoDate(String s) {
    final parsed = DateTime.tryParse(s);
    return parsed == null ? s : _display.format(parsed);
  }

  static String displayTime(DateTime d) => _displayTime.format(d.toLocal());

  /// Formats a decimal string without passing it through a double: the
  /// integer part is grouped, the fraction is kept as typed (trailing zeros cut).
  static String quantity(String value) {
    final parts = value.split('.');
    final whole = BigInt.tryParse(parts.first);
    if (whole == null) return value;
    final grouped = _count.format(whole.toInt());
    if (parts.length < 2) return grouped;
    final fraction = parts[1].replaceAll(RegExp(r'0+$'), '');
    return fraction.isEmpty ? grouped : '$grouped.$fraction';
  }
}
