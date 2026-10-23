import 'dart:math' as math;

import 'package:brics_mobile/core/brand/brand_config.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:flutter/material.dart';

enum AppLogoVariant { icon, horizontal, stacked }

/// Where the chimney top sits in the icon (fraction of its edge). Measured from
/// assets/brand/generated/logo-icon-transparent.png; re-measure if the artwork changes.
const _chimney = Offset(0.515, 0.195);

/// The BRICS logo: the icon (an image with no text) and the wordmark (live
/// text from brand.json). Changing brand.json changes every logo in the app.
///
/// [size] is the icon's edge; the wordmark scales from it. [productName] swaps
/// the two-line wordmark for the short name ("BRICS"). [onDark] for green bars.
/// Smoke and the leaf animate only when [animated] and motion is allowed.
class AppLogo extends StatefulWidget {
  const AppLogo({
    super.key,
    this.variant = AppLogoVariant.horizontal,
    this.size = 48,
    this.animated = true,
    this.productName = false,
    this.onDark = false,
  });

  final AppLogoVariant variant;
  final double size;
  final bool animated;
  final bool productName;
  final bool onDark;

  @override
  State<AppLogo> createState() => _AppLogoState();
}

class _AppLogoState extends State<AppLogo> with TickerProviderStateMixin {
  late final AnimationController _smoke = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 4600),
  );
  late final AnimationController _leaf = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 6),
  );

  bool get _moving => widget.animated && MotionScope.of(context);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(AppLogo oldWidget) {
    super.didUpdateWidget(oldWidget);
    _sync();
  }

  void _sync() {
    for (final c in [_smoke, _leaf]) {
      if (_moving) {
        if (!c.isAnimating) c.repeat();
      } else {
        c
          ..stop()
          ..value = 0;
      }
    }
  }

  @override
  void dispose() {
    _smoke.dispose();
    _leaf.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brand = BrandConfig.instance;
    final icon = _Icon(size: widget.size, smoke: _moving ? _smoke : null);
    final logo = switch (widget.variant) {
      AppLogoVariant.icon => icon,
      AppLogoVariant.horizontal => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          icon,
          SizedBox(width: widget.size * 0.26),
          _Wordmark(widget: widget, leaf: _moving ? _leaf : null, stacked: false),
        ],
      ),
      AppLogoVariant.stacked => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          icon,
          SizedBox(height: widget.size * 0.14),
          _Wordmark(widget: widget, leaf: _moving ? _leaf : null, stacked: true),
        ],
      ),
    };
    return Semantics(
      label: brand.productName,
      image: widget.variant == AppLogoVariant.icon,
      child: ExcludeSemantics(child: logo),
    );
  }
}

class _Icon extends StatelessWidget {
  const _Icon({required this.size, required this.smoke});

  final double size;
  final Animation<double>? smoke;

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      size > 96 ? BrandConfig.iconAssetLarge : BrandConfig.iconAsset,
      width: size,
      height: size,
      excludeFromSemantics: true,
    );
    final smoke = this.smoke;
    if (smoke == null) return image;
    final puff = size * 0.16;
    return SizedBox.square(
      dimension: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          image,
          for (var i = 0; i < 3; i++)
            Positioned(
              left: size * _chimney.dx - puff / 2,
              top: size * _chimney.dy - puff / 2,
              width: puff,
              height: puff,
              child: AnimatedBuilder(
                animation: smoke,
                // Three puffs 0.8s apart on one 4.6s loop.
                builder: (_, child) => _puff((smoke.value + i * 0.8 / 4.6) % 1, puff, child!),
                child: const DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [Color(0xF2FFFFFF), Color(0x8CD6F0DC), Color(0x00FFFFFF)],
                      stops: [0, 0.55, 1],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Rises, drifts right with a gentle sway, grows and fades — transform and opacity only.
  static Widget _puff(double p, double d, Widget child) {
    final eased = Curves.easeInOut.transform(p);
    final opacity = p < 0.15 ? p / 0.15 * 0.85 : 0.85 * (1 - (p - 0.15) / 0.85);
    final sway = math.sin(p * math.pi * 2) * d * 0.12;
    return Opacity(
      opacity: opacity.clamp(0, 1),
      child: Transform.translate(
        offset: Offset(d * 0.7 * eased + sway, -d * 2.6 * eased),
        child: Transform.scale(scale: 0.55 + 0.75 * eased, child: child),
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark({required this.widget, required this.leaf, required this.stacked});

  final AppLogo widget;
  final Animation<double>? leaf;
  final bool stacked;

  @override
  Widget build(BuildContext context) {
    final b = BrandConfig.instance;
    final size = widget.size;
    final ink = widget.onDark ? Colors.white : b.dark;
    final accent = widget.onDark ? b.light : b.primary;
    final text = widget.productName ? b.productName : b.wordmarkLine1;
    // Proportions taken from the reference artwork (cap height ≈ 30% of the icon when stacked).
    final fs = size * (stacked ? 0.34 : (widget.productName ? 0.5 : 0.42));
    final style = TextStyle(
      fontFamily: 'Montserrat',
      fontWeight: FontWeight.w800,
      fontSize: fs,
      height: 1,
      letterSpacing: -0.01 * fs,
      color: ink,
    );
    final showLine2 = !widget.productName && b.line2Show;

    // Line 2 spans exactly the width of line 1, measured rather than laid out intrinsically.
    final measure = TextPainter(
      text: TextSpan(text: text.toUpperCase(), style: style),
      textDirection: TextDirection.ltr,
      textScaler: MediaQuery.textScalerOf(context),
      maxLines: 1,
    )..layout();
    final width = measure.width;
    measure.dispose();
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: stacked ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        // The leaf belongs to wordmark line 1 only, not the short product name.
        _LeafLine(
          text: text,
          style: style,
          leafAt: widget.productName ? -1 : b.leafIndex(text),
          leaf: leaf,
        ),
        if (showLine2) ...[
          SizedBox(height: fs * 0.45),
          SizedBox(
            width: width,
            child: _Line2(fontSize: math.max(7, fs * 0.32), ink: ink, accent: accent, brand: b),
          ),
        ],
      ],
    );
  }
}

/// Line 1 in caps, with the leaf letter drawn as a dotless "ı" wearing a leaf.
class _LeafLine extends StatelessWidget {
  const _LeafLine({
    required this.text,
    required this.style,
    required this.leafAt,
    required this.leaf,
  });

  final String text;
  final TextStyle style;
  final int leafAt;
  final Animation<double>? leaf;

  @override
  Widget build(BuildContext context) {
    final upper = text.toUpperCase();
    if (leafAt < 0) return Text(upper, style: style, maxLines: 1, softWrap: false);
    return Row(
      mainAxisSize: MainAxisSize.min,
      // Same font and size on every piece, so top alignment keeps one baseline.
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (leafAt > 0) Text(upper.substring(0, leafAt), style: style, softWrap: false),
        _LeafI(style: style, leaf: leaf),
        if (leafAt < upper.length - 1)
          Text(upper.substring(leafAt + 1), style: style, softWrap: false),
      ],
    );
  }
}

class _LeafI extends StatelessWidget {
  const _LeafI({required this.style, required this.leaf});

  final TextStyle style;
  final Animation<double>? leaf;

  @override
  Widget build(BuildContext context) {
    // Measure the glyph so the leaf centres on its stem at any size or font.
    final painter = TextPainter(
      text: TextSpan(text: 'ı', style: style),
      textDirection: TextDirection.ltr,
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    final fs = style.fontSize ?? 14;
    final leafSize = fs * 0.42;
    final baseline = painter.computeDistanceToActualBaseline(TextBaseline.alphabetic);
    final width = painter.width;
    painter.dispose();

    final leafWidget = SizedBox.square(
      dimension: leafSize,
      child: const CustomPaint(painter: _LeafPainter()),
    );
    final leaf = this.leaf;
    return SizedBox(
      width: width,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Text('ı', style: style),
          Positioned(
            left: (width - leafSize) / 2,
            top: baseline - fs * 0.6 - leafSize,
            child: leaf == null
                ? leafWidget
                : AnimatedBuilder(
                    animation: leaf,
                    builder: (_, child) => _floatLeaf(leaf.value, leafSize, child!),
                    child: leafWidget,
                  ),
          ),
        ],
      ),
    );
  }

  /// Drifts up and aside like a wisp while fading, then a fresh leaf fades in at the spot.
  static Widget _floatLeaf(double t, double s, Widget child) {
    double opacity;
    var dx = 0.0;
    var dy = 0.0;
    var turn = 0.0;
    if (t < 0.08) {
      opacity = 1;
    } else if (t < 0.45) {
      final p = Curves.easeOut.transform((t - 0.08) / 0.37);
      opacity = 1 - p;
      dx = s * 0.4 * p;
      dy = -s * 0.7 * p;
      turn = 8 * math.pi / 180 * p;
    } else if (t < 0.6) {
      opacity = 0;
    } else if (t < 0.75) {
      opacity = (t - 0.6) / 0.15;
    } else {
      opacity = 1;
    }
    return Opacity(
      opacity: opacity,
      child: Transform.translate(
        offset: Offset(dx, dy),
        child: Transform.rotate(angle: turn, child: child),
      ),
    );
  }
}

class _LeafPainter extends CustomPainter {
  const _LeafPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 16;
    final leaf = Path()
      ..moveTo(1.5 * s, 14.5 * s)
      ..cubicTo(1.5 * s, 6.5 * s, 7 * s, 1.5 * s, 14.5 * s, 1.5 * s)
      ..cubicTo(14.5 * s, 9 * s, 9.5 * s, 14.5 * s, 1.5 * s, 14.5 * s)
      ..close();
    canvas
      ..drawPath(leaf, Paint()..color = const Color(0xFF3FA35B))
      ..drawLine(
        Offset(2.5 * s, 13.5 * s),
        Offset(11 * s, 5 * s),
        Paint()
          ..color = const Color(0xFFE7F7EA)
          ..strokeWidth = 1.1 * s
          ..strokeCap = StrokeCap.round,
      );
  }

  @override
  bool shouldRepaint(_LeafPainter oldDelegate) => false;
}

/// "— ESTD (brick) 1999 —": small, wide-tracked, thin lines either side.
class _Line2 extends StatelessWidget {
  const _Line2({
    required this.fontSize,
    required this.ink,
    required this.accent,
    required this.brand,
  });

  final double fontSize;
  final Color ink;
  final Color accent;
  final BrandConfig brand;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontFamily: 'Montserrat',
      fontWeight: FontWeight.w600,
      fontSize: fontSize,
      height: 1,
      letterSpacing: fontSize * 0.32,
      color: ink,
    );
    final gap = SizedBox(width: fontSize * 0.6);
    final rule = Expanded(
      child: Container(
        height: 1,
        constraints: BoxConstraints(minWidth: fontSize * 1.2),
        color: accent,
      ),
    );
    return Row(
      children: [
        rule,
        gap,
        Text(brand.line2Text, style: style),
        if (brand.line2BrickIcon) ...[
          gap,
          SizedBox(
            width: fontSize * 2,
            height: fontSize * 1.15,
            child: CustomPaint(painter: _BrickPainter(accent)),
          ),
          gap,
        ],
        Text(brand.line2Year, style: style),
        gap,
        rule,
      ],
    );
  }
}

class _BrickPainter extends CustomPainter {
  const _BrickPainter(this.colour);

  final Color colour;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width / 24;
    final h = size.height / 14;
    Path poly(List<Offset> pts) =>
        Path()..addPolygon(pts.map((p) => Offset(p.dx * w, p.dy * h)).toList(), true);
    canvas
      ..drawPath(
        poly(const [Offset(2, 4.5), Offset(12, 1), Offset(22, 4.5), Offset(12, 8)]),
        Paint()..color = colour.withValues(alpha: 0.55),
      )
      ..drawPath(
        poly(const [Offset(2, 4.5), Offset(2, 9.5), Offset(12, 13), Offset(12, 8)]),
        Paint()..color = colour,
      )
      ..drawPath(
        poly(const [Offset(22, 4.5), Offset(22, 9.5), Offset(12, 13), Offset(12, 8)]),
        Paint()..color = colour.withValues(alpha: 0.8),
      );
  }

  @override
  bool shouldRepaint(_BrickPainter old) => old.colour != colour;
}
