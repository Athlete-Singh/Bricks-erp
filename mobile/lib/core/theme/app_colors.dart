import 'package:flutter/material.dart';

/// Colour tokens from docs/05-design-system.md — the only place a hex value may appear.
abstract final class AppPalette {
  static const primary50 = Color(0xFFE8F5EE);
  static const primary100 = Color(0xFFC8E7D5);
  static const primary300 = Color(0xFF5DB585);
  static const primary400 = Color(0xFF2E9A62);
  static const primary500 = Color(0xFF0F7F47);
  static const primary600 = Color(0xFF0B6B3A);
  static const primary700 = Color(0xFF09572F);
  static const primary800 = Color(0xFF074425);
  static const primary900 = Color(0xFF05321B);

  static const accent100 = Color(0xFFFBE9BA);
  static const accent300 = Color(0xFFF2C55A);
  static const accent400 = Color(0xFFEBB232);
  static const accent500 = Color(0xFFE3A21A);
  static const accent600 = Color(0xFFC48812);
  static const accent800 = Color(0xFF78520D);

  static const info400 = Color(0xFF60A5FA);
  static const info600 = Color(0xFF2563EB);

  /// Fired-brick red, for the brick illustrations only — never for status.
  static const brick = Color(0xFFB4532A);
  static const brickLight = Color(0xFFD9774A);
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
    required this.successSoft,
    required this.warningSoft,
    required this.dangerSoft,
    required this.infoSoft,
    required this.heroStart,
    required this.heroEnd,
    required this.shadow,
  });

  static const light = AppColors(
    background: Color(0xFFF4F7F5),
    surface: Color(0xFFFFFFFF),
    surfaceMuted: Color(0xFFEEF3F0),
    border: Color(0xFFE3EAE6),
    foreground: Color(0xFF0F1A14),
    mutedForeground: Color(0xFF5F6F67),
    primary: AppPalette.primary600,
    onPrimary: Color(0xFFFFFFFF),
    accent: AppPalette.accent500,
    success: Color(0xFF16A34A),
    warning: Color(0xFFD97706),
    danger: Color(0xFFDC2626),
    info: Color(0xFF2563EB),
    successSoft: Color(0xFFE7F6EC),
    warningSoft: Color(0xFFFDF1DE),
    dangerSoft: Color(0xFFFDE8E8),
    infoSoft: Color(0xFFE6EEFD),
    heroStart: AppPalette.primary500,
    heroEnd: AppPalette.primary900,
    shadow: Color(0x1A0B3A22),
  );

  static const dark = AppColors(
    background: Color(0xFF070D0A),
    surface: Color(0xFF0F1814),
    surfaceMuted: Color(0xFF16221C),
    border: Color(0xFF22302A),
    foreground: Color(0xFFE6EDEA),
    mutedForeground: Color(0xFF93A39C),
    primary: AppPalette.primary400,
    onPrimary: Color(0xFFFFFFFF),
    accent: AppPalette.accent400,
    success: Color(0xFF22C55E),
    warning: Color(0xFFF59E0B),
    danger: Color(0xFFEF4444),
    info: Color(0xFF3B82F6),
    successSoft: Color(0xFF10291A),
    warningSoft: Color(0xFF2E2110),
    dangerSoft: Color(0xFF2E1414),
    infoSoft: Color(0xFF111D33),
    heroStart: AppPalette.primary600,
    heroEnd: Color(0xFF03170D),
    shadow: Color(0x66000000),
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

  /// Tinted backgrounds behind a status icon or pill.
  final Color successSoft;
  final Color warningSoft;
  final Color dangerSoft;
  final Color infoSoft;

  /// The deep-green header and sign-in backdrop.
  final Color heroStart;
  final Color heroEnd;
  final Color shadow;

  LinearGradient get heroGradient => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [heroStart, heroEnd],
  );

  /// The primary button: brand green, a touch lighter at the top-left.
  LinearGradient get primaryGradient => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color.lerp(primary, Colors.white, 0.12)!, primary],
  );

  /// Gold, used sparingly: the logo and one highlight per screen at most.
  LinearGradient get goldGradient => const LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppPalette.accent300, AppPalette.accent600],
  );

  /// Surfaces are separated by a hairline border, not by shadow; this is only a
  /// faint lift for what floats (menus, the pinned action bar).
  List<BoxShadow> get softShadow => [
    BoxShadow(color: shadow.withValues(alpha: 0.05), blurRadius: 2, offset: const Offset(0, 1)),
  ];

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
    Color? successSoft,
    Color? warningSoft,
    Color? dangerSoft,
    Color? infoSoft,
    Color? heroStart,
    Color? heroEnd,
    Color? shadow,
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
      successSoft: successSoft ?? this.successSoft,
      warningSoft: warningSoft ?? this.warningSoft,
      dangerSoft: dangerSoft ?? this.dangerSoft,
      infoSoft: infoSoft ?? this.infoSoft,
      heroStart: heroStart ?? this.heroStart,
      heroEnd: heroEnd ?? this.heroEnd,
      shadow: shadow ?? this.shadow,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppColors(
      background: l(background, other.background),
      surface: l(surface, other.surface),
      surfaceMuted: l(surfaceMuted, other.surfaceMuted),
      border: l(border, other.border),
      foreground: l(foreground, other.foreground),
      mutedForeground: l(mutedForeground, other.mutedForeground),
      primary: l(primary, other.primary),
      onPrimary: l(onPrimary, other.onPrimary),
      accent: l(accent, other.accent),
      success: l(success, other.success),
      warning: l(warning, other.warning),
      danger: l(danger, other.danger),
      info: l(info, other.info),
      successSoft: l(successSoft, other.successSoft),
      warningSoft: l(warningSoft, other.warningSoft),
      dangerSoft: l(dangerSoft, other.dangerSoft),
      infoSoft: l(infoSoft, other.infoSoft),
      heroStart: l(heroStart, other.heroStart),
      heroEnd: l(heroEnd, other.heroEnd),
      shadow: l(shadow, other.shadow),
    );
  }
}

extension AppColorsX on BuildContext {
  AppColors get colors => Theme.of(this).extension<AppColors>() ?? AppColors.light;
}
