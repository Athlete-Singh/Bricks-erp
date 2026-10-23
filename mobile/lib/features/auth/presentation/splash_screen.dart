import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:flutter/material.dart';

/// While the stored session is read: the logo settles in, the chimney smokes
/// and the leaf drifts. Same light background as the native splash, so the
/// hand-over does not flash.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  static const background = Color(0xFFF8FAF9);

  @override
  Widget build(BuildContext context) {
    const logo = AppLogo(variant: AppLogoVariant.stacked, size: 104);
    return Scaffold(
      backgroundColor: background,
      body: Center(
        child: MotionScope.of(context)
            ? TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 700),
                curve: Curves.easeOutCubic,
                builder: (_, t, child) => Opacity(
                  opacity: t,
                  child: Transform.scale(scale: 0.9 + 0.1 * t, child: child),
                ),
                child: logo,
              )
            : logo,
      ),
    );
  }
}
