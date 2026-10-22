import 'dart:math' as math;

import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:flutter/material.dart';

/// A tick that draws itself in a pulsing circle while brick-coloured confetti
/// bursts outward — the entry is safe. Lives in the root overlay, so it
/// survives the form closing underneath it. Nothing when motion is off.
void celebrate(BuildContext context) {
  if (!MotionScope.of(context)) return;
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return;
  late final OverlayEntry entry;
  entry = OverlayEntry(builder: (_) => _Celebration(onDone: () => entry.remove()));
  overlay.insert(entry);
}

class _Celebration extends StatefulWidget {
  const _Celebration({required this.onDone});

  final VoidCallback onDone;

  @override
  State<_Celebration> createState() => _CelebrationState();
}

class _CelebrationState extends State<_Celebration> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  )..forward().whenComplete(widget.onDone);

  // Seeded so the burst is the same shape every time — it is a signature, not noise.
  late final List<_Piece> _pieces = () {
    final r = math.Random(7);
    const palette = [
      AppPalette.brick,
      AppPalette.brickLight,
      AppPalette.accent400,
      AppPalette.accent300,
      AppPalette.primary400,
      AppPalette.primary300,
    ];
    return [
      for (var i = 0; i < 26; i++)
        _Piece(
          angle: (i / 26) * math.pi * 2 + r.nextDouble() * 0.3,
          speed: 160 + r.nextDouble() * 140,
          spin: (r.nextDouble() - 0.5) * 10,
          color: palette[i % palette.length],
          size: 6 + r.nextDouble() * 6,
        ),
    ];
  }();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = _c.value;
          final fadeOut = t < 0.75 ? 1.0 : 1 - (t - 0.75) / 0.25;
          final pop = Curves.elasticOut.transform((t / 0.55).clamp(0, 1));
          final draw = Curves.easeOut.transform(((t - 0.15) / 0.35).clamp(0, 1));
          return Opacity(
            opacity: fadeOut.clamp(0, 1),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Positioned.fill(
                  child: ColoredBox(color: Colors.black.withValues(alpha: 0.18 * fadeOut)),
                ),
                CustomPaint(size: const Size(320, 320), painter: _ConfettiPainter(_pieces, t)),
                Transform.scale(
                  scale: pop,
                  child: Container(
                    width: 112,
                    height: 112,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: colors.primaryGradient,
                      boxShadow: [
                        BoxShadow(
                          color: colors.primary.withValues(alpha: 0.5),
                          blurRadius: 40,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: CustomPaint(painter: _TickPainter(draw)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Piece {
  const _Piece({
    required this.angle,
    required this.speed,
    required this.spin,
    required this.color,
    required this.size,
  });

  final double angle;
  final double speed;
  final double spin;
  final Color color;
  final double size;
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter(this.pieces, this.t);

  final List<_Piece> pieces;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final p = ((t - 0.08) / 0.8).clamp(0.0, 1.0);
    if (p == 0) return;
    for (final piece in pieces) {
      final d = piece.speed * Curves.easeOutCubic.transform(p);
      final gravity = 140 * p * p;
      final pos = center + Offset(math.cos(piece.angle) * d, math.sin(piece.angle) * d + gravity);
      canvas
        ..save()
        ..translate(pos.dx, pos.dy)
        ..rotate(piece.spin * p)
        ..drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(center: Offset.zero, width: piece.size, height: piece.size * 0.55),
            const Radius.circular(1.5),
          ),
          Paint()..color = piece.color.withValues(alpha: (1 - p).clamp(0, 1)),
        )
        ..restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.t != t;
}

class _TickPainter extends CustomPainter {
  _TickPainter(this.progress);

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;
    final s = size.width;
    final path = Path()
      ..moveTo(s * 0.28, s * 0.52)
      ..lineTo(s * 0.44, s * 0.67)
      ..lineTo(s * 0.73, s * 0.37);
    final metric = path.computeMetrics().first;
    canvas.drawPath(
      metric.extractPath(0, metric.length * progress),
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.09
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(_TickPainter old) => old.progress != progress;
}
