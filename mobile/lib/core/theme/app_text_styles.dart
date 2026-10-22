import 'package:flutter/material.dart';

/// Type scale from docs/05-design-system.md: 12 / 16 (body on mobile) / 18 / 20 / 24 / 30,
/// in Inter (bundled). Headings are heavy and tight; numbers use tabular figures
/// so counts line up in a column.
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
      displaySmall: s(30, FontWeight.w800, foreground, spacing: -0.8, height: 1.15),
      headlineMedium: s(26, FontWeight.w800, foreground, spacing: -0.6, height: 1.2),
      headlineSmall: s(24, FontWeight.w800, foreground, spacing: -0.5, height: 1.2),
      titleLarge: s(20, FontWeight.w700, foreground, spacing: -0.3),
      titleMedium: s(17, FontWeight.w600, foreground, spacing: -0.2),
      titleSmall: s(15, FontWeight.w600, foreground),
      bodyLarge: s(16, FontWeight.w400, foreground, height: 1.4),
      bodyMedium: s(15, FontWeight.w400, foreground, height: 1.4),
      bodySmall: s(13, FontWeight.w400, muted, height: 1.35),
      labelLarge: s(16, FontWeight.w600, foreground),
      labelMedium: s(13, FontWeight.w600, muted, spacing: 0.1),
      labelSmall: s(12, FontWeight.w600, muted, spacing: 0.2),
    );
  }

  /// For counts and quantities.
  static TextStyle number(TextStyle base) => base.copyWith(fontFeatures: _tabular);

  /// Small capitals over a section, e.g. "STAGES".
  static TextStyle overline(TextStyle base) =>
      base.copyWith(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.2);
}
