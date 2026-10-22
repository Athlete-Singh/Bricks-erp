import 'dart:math' as math;

import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:flutter/material.dart';

/// The BRICS mark: a kiln wall in stretcher bond with its chimney, on a gold
/// tile. Drawn in code so it is crisp at any size and needs no asset.
///
/// [progress] runs 0 → 1: the courses drop in from the bottom, then the chimney
/// rises. At 1 (the default) it is the static mark.
class BricsLogo extends StatelessWidget {
  const BricsLogo({super.key, this.size = 64, this.progress = 1, this.tile = true, this.color});

  final double size;
  final double progress;

  /// False draws the wall alone, for use on a coloured background.
  final bool tile;

  /// The wall's colour without a tile (white by default).
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _LogoPainter(progress: progress, tile: tile, color: color),
      ),
    );
  }
}

class _LogoPainter extends CustomPainter {
  _LogoPainter({required this.progress, required this.tile, this.color});

  final double progress;
  final bool tile;
  final Color? color;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width;
    if (tile) {
      final rect = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(s * 0.26));
      canvas
        ..drawRRect(
          rect.shift(Offset(0, s * 0.04)),
          Paint()
            ..color = const Color(0x33000000)
            ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.06),
        )
        ..drawRRect(
          rect,
          Paint()
            ..shader = const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppPalette.accent300, AppPalette.accent600],
            ).createShader(Offset.zero & size),
        )
        // A soft highlight across the top, like a glazed tile.
        ..drawRRect(
          RRect.fromRectAndRadius(Rect.fromLTWH(0, 0, s, s * 0.5), Radius.circular(s * 0.26)),
          Paint()..color = const Color(0x22FFFFFF),
        );
    }

    final ink = tile ? AppPalette.primary900 : (color ?? Colors.white);
    final pad = s * 0.18;
    final wallW = s - pad * 2;
    final brickH = s * 0.115;
    final gap = s * 0.028;
    final wallBottom = s - pad;

    // Three courses in stretcher bond; the middle course is offset by half a brick.
    const courses = [
      [0.0, 0.5, 1.0],
      [-0.25, 0.25, 0.75, 1.25],
      [0.0, 0.5, 1.0],
    ];
    var index = 0;
    const total = 10;
    for (var row = 0; row < courses.length; row++) {
      final y = wallBottom - (row + 1) * brickH - row * gap;
      for (final start in courses[row]) {
        // Each brick drops in on its own slice of the build.
        final t = ((progress * (total + 2)) - index).clamp(0.0, 1.0);
        index++;
        if (t <= 0) continue;
        final eased = Curves.easeOutBack.transform(t);
        final left = (start * wallW / 1.5).clamp(0.0, wallW) + pad;
        final right = ((start + 0.5) * wallW / 1.5).clamp(0.0, wallW) + pad;
        if (right - left < gap) continue;
        final r = RRect.fromRectAndRadius(
          Rect.fromLTRB(
            left + gap / 2,
            y - (1 - eased) * s * 0.25,
            right - gap / 2,
            y + brickH - (1 - eased) * s * 0.25,
          ),
          Radius.circular(brickH * 0.22),
        );
        canvas.drawRRect(r, Paint()..color = ink.withValues(alpha: t));
      }
    }

    // The chimney rises out of the wall's right side.
    final chimneyT = ((progress - 0.75) / 0.25).clamp(0.0, 1.0);
    if (chimneyT > 0) {
      final top = wallBottom - courses.length * (brickH + gap);
      final height = s * 0.3 * Curves.easeOutCubic.transform(chimneyT);
      final cx = pad + wallW * 0.74;
      canvas.drawRRect(
        RRect.fromRectAndCorners(
          Rect.fromLTRB(cx, top - height, cx + s * 0.12, top + gap),
          topLeft: Radius.circular(s * 0.025),
          topRight: Radius.circular(s * 0.025),
        ),
        Paint()..color = ink,
      );
    }
  }

  @override
  bool shouldRepaint(_LogoPainter old) =>
      old.progress != progress || old.tile != tile || old.color != color;
}

/// The logo building itself, with smoke rising from the chimney when done.
/// Used on the splash and the sign-in screen.
class AnimatedBricsLogo extends StatefulWidget {
  const AnimatedBricsLogo({super.key, this.size = 96});

  final double size;

  @override
  State<AnimatedBricsLogo> createState() => _AnimatedBricsLogoState();
}

class _AnimatedBricsLogoState extends State<AnimatedBricsLogo> with SingleTickerProviderStateMixin {
  late final AnimationController _build = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MotionScope.of(context)) {
      if (!_build.isAnimating && _build.value == 0) _build.forward();
    } else {
      _build.value = 1;
    }
  }

  @override
  void dispose() {
    _build.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = widget.size;
    return SizedBox(
      width: size,
      height: size * 1.45,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomCenter,
        children: [
          // Smoke leaves the chimney top, which sits ~0.27 of the tile from its right edge.
          Positioned(
            left: size * 0.58,
            bottom: size * 0.82,
            width: size * 0.36,
            height: size * 0.6,
            child: AnimatedBuilder(
              animation: _build,
              builder: (_, _) =>
                  Opacity(opacity: _build.value == 1 ? 1 : 0, child: const SmokePlume()),
            ),
          ),
          AnimatedBuilder(
            animation: _build,
            builder: (_, _) => BricsLogo(size: size, progress: _build.value),
          ),
        ],
      ),
    );
  }
}

/// Puffs of smoke rising, growing and fading — the kiln is firing. Static (no
/// puffs) when motion is off.
class SmokePlume extends StatefulWidget {
  const SmokePlume({super.key, this.color = const Color(0xFFFFFFFF)});

  final Color color;

  @override
  State<SmokePlume> createState() => _SmokePlumeState();
}

class _SmokePlumeState extends State<SmokePlume> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MotionScope.of(context)) {
      if (!_c.isAnimating) _c.repeat();
    } else {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!MotionScope.of(context)) return const SizedBox.shrink();
    return AnimatedBuilder(
      animation: _c,
      builder: (_, _) => CustomPaint(painter: _SmokePainter(_c.value, widget.color)),
    );
  }
}

class _SmokePainter extends CustomPainter {
  _SmokePainter(this.t, this.color);

  final double t;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const puffs = 5;
    for (var i = 0; i < puffs; i++) {
      final p = (t + i / puffs) % 1.0;
      final x = size.width * (0.2 + 0.35 * p + 0.08 * math.sin(p * math.pi * 3 + i));
      final y = size.height * (1 - p);
      final r = size.width * (0.08 + 0.22 * p);
      final alpha = (1 - p) * 0.35 * math.min(1, p * 6);
      canvas.drawCircle(
        Offset(x, y),
        r,
        Paint()
          ..color = color.withValues(alpha: alpha)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, r * 0.6),
      );
    }
  }

  @override
  bool shouldRepaint(_SmokePainter old) => old.t != t;
}

/// Faint brick courses, as texture on the green header.
class BrickPatternPainter extends CustomPainter {
  const BrickPatternPainter({this.color = const Color(0x0DFFFFFF), this.brickWidth = 46});

  final Color color;
  final double brickWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final h = brickWidth * 0.42;
    for (var row = 0; row * h < size.height; row++) {
      final offset = row.isOdd ? -brickWidth / 2 : 0.0;
      for (var x = offset; x < size.width; x += brickWidth) {
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x + 2, row * h + 2, brickWidth - 4, h - 4),
            const Radius.circular(3),
          ),
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(BrickPatternPainter old) => old.color != color || old.brickWidth != brickWidth;
}

/// Soft lights drifting behind the hero — the glow of the kiln. Still when
/// motion is off.
class GlowOrbs extends StatefulWidget {
  const GlowOrbs({super.key, this.intensity = 1});

  final double intensity;

  @override
  State<GlowOrbs> createState() => _GlowOrbsState();
}

class _GlowOrbsState extends State<GlowOrbs> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 14),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MotionScope.of(context)) {
      if (!_c.isAnimating) _c.repeat();
    } else {
      _c
        ..stop()
        ..value = 0.15;
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _c,
        builder: (_, _) =>
            CustomPaint(painter: _OrbPainter(_c.value, widget.intensity), size: Size.infinite),
      ),
    );
  }
}

class _OrbPainter extends CustomPainter {
  _OrbPainter(this.t, this.intensity);

  final double t;
  final double intensity;

  @override
  void paint(Canvas canvas, Size size) {
    final a = t * math.pi * 2;
    void orb(Offset center, double radius, Color color) {
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [
              color.withValues(alpha: color.a * intensity),
              color.withValues(alpha: 0),
            ],
          ).createShader(Rect.fromCircle(center: center, radius: radius)),
      );
    }

    final w = size.width;
    final h = size.height;
    orb(
      Offset(w * (0.85 + 0.06 * math.sin(a)), h * (0.15 + 0.05 * math.cos(a))),
      w * 0.55,
      const Color(0x55F2C55A),
    );
    orb(
      Offset(w * (0.1 + 0.08 * math.cos(a * 0.8)), h * (0.7 + 0.06 * math.sin(a))),
      w * 0.5,
      const Color(0x332E9A62),
    );
    orb(
      Offset(w * (0.5 + 0.1 * math.sin(a * 1.3)), h * (0.45 + 0.04 * math.cos(a * 1.1))),
      w * 0.3,
      const Color(0x22EBB232),
    );
  }

  @override
  bool shouldRepaint(_OrbPainter old) => old.t != t;
}

/// The deep-green gradient with brick texture and drifting glow, behind the
/// sign-in screen and every page header.
class HeroBackdrop extends StatelessWidget {
  const HeroBackdrop({super.key, this.child, this.borderRadius, this.glow = 1});

  final Widget? child;
  final BorderRadius? borderRadius;
  final double glow;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: DecoratedBox(
        decoration: BoxDecoration(gradient: colors.heroGradient),
        child: Stack(
          fit: StackFit.passthrough,
          children: [
            const Positioned.fill(child: CustomPaint(painter: BrickPatternPainter())),
            Positioned.fill(child: GlowOrbs(intensity: glow)),
            ?child,
          ],
        ),
      ),
    );
  }
}
