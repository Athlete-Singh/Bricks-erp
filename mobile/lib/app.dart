import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_theme.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class BricsApp extends ConsumerStatefulWidget {
  const BricsApp({super.key});

  @override
  ConsumerState<BricsApp> createState() => _BricsAppState();
}

class _BricsAppState extends ConsumerState<BricsApp> {
  // Coming back to the app is when a supervisor expects things to have gone out.
  late final AppLifecycleListener _lifecycle = AppLifecycleListener(
    onResume: () => ref.read(syncControllerProvider.notifier).kick(),
  );

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Keeps the sync engine alive for the whole app, not just while a badge is on screen.
    ref.watch(syncControllerProvider);
    return MaterialApp.router(
      onGenerateTitle: (context) => context.l10n.appTitle,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: ref.watch(routerProvider),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      debugShowCheckedModeBanner: false,
      builder: (context, child) => MotionScope(
        enabled: !ref.watch(reduceMotionProvider),
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
