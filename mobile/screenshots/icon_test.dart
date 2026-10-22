// Renders the launcher icon and splash images from the in-code logo.
//   flutter test screenshots/icon_test.dart   →   assets/icon/*.png
import 'dart:io';
import 'dart:ui' as ui;

import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/widgets/brand.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> render(WidgetTester tester, Widget art, String path, {double size = 1024}) async {
  final key = GlobalKey();
  tester.view
    ..physicalSize = Size(size, size)
    ..devicePixelRatio = 1;
  await tester.pumpWidget(
    Directionality(
      textDirection: TextDirection.ltr,
      child: Center(
        child: RepaintBoundary(
          key: key,
          child: SizedBox.square(dimension: size, child: art),
        ),
      ),
    ),
  );
  final boundary = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  await tester.runAsync(() async {
    final image = await boundary.toImage();
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    File(path).writeAsBytesSync(bytes!.buffer.asUint8List());
  });
}

const gold = BoxDecoration(
  gradient: LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppPalette.accent300, AppPalette.accent600],
  ),
);

void main() {
  testWidgets('icons', (tester) async {
    addTearDown(tester.view.reset);
    // iOS and legacy Android: full-bleed square (the OS rounds it).
    await render(
      tester,
      const DecoratedBox(
        decoration: gold,
        child: BricsLogo(size: 1024, tile: false, color: AppPalette.primary900),
      ),
      'assets/icon/icon.png',
    );
    // Android adaptive foreground: the wall alone inside the safe zone.
    await render(
      tester,
      const Padding(
        padding: EdgeInsets.all(160),
        child: BricsLogo(size: 704, tile: false, color: AppPalette.primary900),
      ),
      'assets/icon/icon_foreground.png',
    );
    // Splash: the tile on transparent, centred on the dark green.
    await render(
      tester,
      const Padding(padding: EdgeInsets.all(48), child: BricsLogo(size: 416)),
      'assets/icon/splash.png',
      size: 512,
    );
  });
}
