import 'package:flutter/material.dart';

/// Type scale from docs/05-design-system.md: 12 / 16 (body on mobile) / 18 / 20 / 24 / 30.
/// Numbers use tabular figures so counts line up in a column.
abstract final class AppTextStyles {
  static const _tabular = [FontFeature.tabularFigures()];

  static TextTheme textTheme(Color foreground, Color muted) {
    return TextTheme(
      displaySmall: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, color: foreground),
      headlineSmall: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: foreground),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: foreground),
      titleMedium: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: foreground),
      bodyLarge: TextStyle(fontSize: 16, color: foreground),
      bodyMedium: TextStyle(fontSize: 16, color: foreground),
      bodySmall: TextStyle(fontSize: 12, color: muted),
      labelLarge: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      labelMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: muted),
      labelSmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: muted),
    );
  }

  /// For counts and quantities.
  static TextStyle number(TextStyle base) => base.copyWith(fontFeatures: _tabular);
}
