import 'package:flutter/material.dart';

/// Type scale: a compact field-app scale in Inter (bundled) — 12 / 14 / 15 / 17 / 20 / 24.
/// Headings are semibold rather than heavy; numbers use tabular figures so counts
/// line up in a column.
abstract final class AppTextStyles {
  static const family = 'Inter';
  static const _tabular = [FontFeature.tabularFigures()];

  static TextTheme textTheme(Color foreground, Color muted) {
    TextStyle s(
      double size,
      FontWeight weight,
      Color color, {
      double spacing = 0,
      double? height,
    }) => TextStyle(
      fontFamily: family,
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: spacing,
      height: height,
    );
    return TextTheme(
      displaySmall: s(24, FontWeight.w700, foreground, spacing: -0.4, height: 1.2),
      headlineMedium: s(22, FontWeight.w700, foreground, spacing: -0.3, height: 1.2),
      headlineSmall: s(20, FontWeight.w700, foreground, spacing: -0.2, height: 1.2),
      titleLarge: s(17, FontWeight.w600, foreground, spacing: -0.1),
      titleMedium: s(15, FontWeight.w600, foreground),
      titleSmall: s(14, FontWeight.w600, foreground),
      bodyLarge: s(15, FontWeight.w400, foreground, height: 1.35),
      bodyMedium: s(14, FontWeight.w400, foreground, height: 1.35),
      bodySmall: s(12.5, FontWeight.w400, muted, height: 1.3),
      labelLarge: s(15, FontWeight.w600, foreground),
      labelMedium: s(12.5, FontWeight.w500, muted),
      labelSmall: s(11.5, FontWeight.w600, muted, spacing: 0.1),
    );
  }

  /// For counts and quantities.
  static TextStyle number(TextStyle base) => base.copyWith(fontFeatures: _tabular);

  /// Small capitals over a section, e.g. "STAGES".
  static TextStyle overline(TextStyle base) =>
      base.copyWith(fontSize: 11.5, fontWeight: FontWeight.w600, letterSpacing: 0.6);
}
