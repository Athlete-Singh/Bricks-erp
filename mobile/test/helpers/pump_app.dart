import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';
import 'package:flutter_test/flutter_test.dart';

extension PumpApp on WidgetTester {
  /// Pumps [child] inside the app's theme and localisations.
  Future<void> pumpApp(Widget child, {List<Override> overrides = const []}) {
    return pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: child),
        ),
      ),
    );
  }
}

/// Localised strings outside a widget tree, for assertions.
Future<AppLocalizations> loadL10n() => AppLocalizations.delegate.load(const Locale('en'));

extension DisposeApp on WidgetTester {
  /// Unmounts the tree so Riverpod disposes timers and Drift closes its streams
  /// before the test ends.
  Future<void> disposeApp() async {
    await pumpWidget(const SizedBox.shrink());
    await pump(const Duration(milliseconds: 10));
  }
}
