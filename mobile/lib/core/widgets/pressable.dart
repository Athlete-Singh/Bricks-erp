import 'dart:async';

import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Squeezes slightly under the thumb and gives a light tap of haptics — the
/// feel of a physical button, so the supervisor knows the tap landed.
class Pressable extends StatefulWidget {
  const Pressable({required this.child, required this.onTap, super.key, this.scale = 0.97});

  final Widget child;
  final VoidCallback? onTap;
  final double scale;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  void _set(bool down) {
    if (widget.onTap == null || _down == down) return;
    setState(() => _down = down);
  }

  @override
  Widget build(BuildContext context) {
    final motion = MotionScope.of(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => _set(true),
      onTapUp: (_) => _set(false),
      onTapCancel: () => _set(false),
      onTap: widget.onTap == null
          ? null
          : () {
              unawaited(HapticFeedback.selectionClick());
              widget.onTap!();
            },
      child: AnimatedScale(
        scale: _down && motion ? widget.scale : 1,
        duration: AppMotion.fast,
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}
