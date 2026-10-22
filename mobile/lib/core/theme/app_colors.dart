import 'package:flutter/material.dart';

/// Colour tokens from docs/05-design-system.md — the only place a hex value may appear.
abstract final class AppPalette {
  static const primary50 = Color(0xFFE8F5EE);
  static const primary100 = Color(0xFFC8E7D5);
  static const primary400 = Color(0xFF2E9A62);
  static const primary600 = Color(0xFF0B6B3A);
  static const primary800 = Color(0xFF074425);

  static const accent100 = Color(0xFFFBE9BA);
  static const accent400 = Color(0xFFEBB232);
  static const accent500 = Color(0xFFE3A21A);
  static const accent800 = Color(0xFF78520D);
}

/// Semantic colours, resolved per brightness. Screens read these through
/// `context.colors`, never [AppPalette] directly.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.background,
    required this.surface,
    required this.surfaceMuted,
    required this.border,
    required this.foreground,
    required this.mutedForeground,
    required this.primary,
    required this.onPrimary,
    required this.accent,
    required this.success,
    required this.warning,
    required this.danger,
    required this.info,
  });

  static const light = AppColors(
    background: Color(0xFFF8FAF9),
    surface: Color(0xFFFFFFFF),
    surfaceMuted: Color(0xFFF1F5F3),
    border: Color(0xFFE2E8F0),
    foreground: Color(0xFF0F172A),
    mutedForeground: Color(0xFF64748B),
    primary: AppPalette.primary600,
    onPrimary: Color(0xFFFFFFFF),
    accent: AppPalette.accent500,
    success: Color(0xFF16A34A),
    warning: Color(0xFFD97706),
    danger: Color(0xFFDC2626),
    info: Color(0xFF2563EB),
  );

  static const dark = AppColors(
    background: Color(0xFF0B1210),
    surface: Color(0xFF111A17),
    surfaceMuted: Color(0xFF18241F),
    border: Color(0xFF253430),
    foreground: Color(0xFFE6EDEA),
    mutedForeground: Color(0xFF94A3A0),
    primary: AppPalette.primary400,
    onPrimary: Color(0xFFFFFFFF),
    accent: AppPalette.accent400,
    success: Color(0xFF22C55E),
    warning: Color(0xFFF59E0B),
    danger: Color(0xFFEF4444),
    info: Color(0xFF3B82F6),
  );

  final Color background;
  final Color surface;
  final Color surfaceMuted;
  final Color border;
  final Color foreground;
  final Color mutedForeground;
  final Color primary;
  final Color onPrimary;
  final Color accent;
  final Color success;
  final Color warning;
  final Color danger;
  final Color info;

  @override
  AppColors copyWith({
    Color? background,
    Color? surface,
    Color? surfaceMuted,
    Color? border,
    Color? foreground,
    Color? mutedForeground,
    Color? primary,
    Color? onPrimary,
    Color? accent,
    Color? success,
    Color? warning,
    Color? danger,
    Color? info,
  }) {
    return AppColors(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceMuted: surfaceMuted ?? this.surfaceMuted,
      border: border ?? this.border,
      foreground: foreground ?? this.foreground,
      mutedForeground: mutedForeground ?? this.mutedForeground,
      primary: primary ?? this.primary,
      onPrimary: onPrimary ?? this.onPrimary,
      accent: accent ?? this.accent,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      danger: danger ?? this.danger,
      info: info ?? this.info,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceMuted: Color.lerp(surfaceMuted, other.surfaceMuted, t)!,
      border: Color.lerp(border, other.border, t)!,
      foreground: Color.lerp(foreground, other.foreground, t)!,
      mutedForeground: Color.lerp(mutedForeground, other.mutedForeground, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      info: Color.lerp(info, other.info, t)!,
    );
  }
}

extension AppColorsX on BuildContext {
  AppColors get colors => Theme.of(this).extension<AppColors>() ?? AppColors.light;
}
