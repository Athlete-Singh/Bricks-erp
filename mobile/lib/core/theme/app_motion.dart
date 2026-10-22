import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Motion tokens. Every animation in the app takes its timing from here.
abstract final class AppMotion {
  static const fast = Duration(milliseconds: 160);
  static const medium = Duration(milliseconds: 320);
  static const slow = Duration(milliseconds: 560);

  /// Gap between items of a list as they arrive.
  static const stagger = Duration(milliseconds: 55);

  static const Curve enter = Curves.easeOutCubic;
  static const Curve emphasized = Curves.easeOutBack;
}

/// True to turn every decorative animation off. Tests set it so frames settle;
/// the phone's own "reduce motion" setting does the same through [MotionScope].
final reduceMotionProvider = Provider<bool>((ref) => false);

/// Whether this part of the tree should animate. Decoration only — nothing the
/// supervisor needs to read is ever hidden behind an animation.
class MotionScope extends InheritedWidget {
  const MotionScope({required this.enabled, required super.child, super.key});

  final bool enabled;

  static bool of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<MotionScope>();
    final platformOff = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    return (scope?.enabled ?? true) && !platformOff;
  }

  @override
  bool updateShouldNotify(MotionScope oldWidget) => enabled != oldWidget.enabled;
}
