/// 4-px grid and radii from docs/05-design-system.md.
abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;

  /// Minimum touch target for the field app — gloves, sunlight, cheap phones.
  static const double touchTarget = 48;
}

abstract final class AppRadius {
  static const double input = 6;
  static const double card = 8;
  static const double modal = 12;
}
