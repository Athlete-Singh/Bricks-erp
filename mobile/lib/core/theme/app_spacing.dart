/// 4-px grid from docs/05-design-system.md.
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

  /// The main action of a screen is taller still.
  static const double primaryAction = 56;
}

/// Mobile radii (docs/05 → Mobile): softer than the web's, for thumbs.
abstract final class AppRadius {
  static const double input = 14;
  static const double button = 14;
  static const double card = 18;
  static const double modal = 24;
  static const double pill = 999;
}
