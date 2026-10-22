import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Lists and sections arrive one after another: a short fade and rise, offset
/// by [index]. Plain child when motion is off.
class Entrance extends StatelessWidget {
  const Entrance({required this.child, super.key, this.index = 0, this.from = 18});

  final Widget child;
  final int index;

  /// How far below its place the child starts, in logical pixels.
  final double from;

  @override
  Widget build(BuildContext context) {
    if (!MotionScope.of(context)) return child;
    // Long lists: only the first screenful staggers, the rest arrive together.
    final delay = AppMotion.stagger * (index < 10 ? index : 10);
    return child
        .animate(delay: delay)
        .fadeIn(duration: AppMotion.medium, curve: AppMotion.enter)
        .moveY(begin: from, end: 0, duration: AppMotion.medium, curve: AppMotion.enter);
  }
}
