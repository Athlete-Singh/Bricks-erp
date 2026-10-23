import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:flutter/material.dart';

/// While the stored session is read: the kiln builds itself and starts firing.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    // The same flat green as the native splash, so the hand-over does not flash.
    return Scaffold(
      backgroundColor: AppPalette.primary900,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const AnimatedBricsLogo(size: 72),
            const SizedBox(height: AppSpacing.lg),
            Entrance(
              index: 6,
              child: Text(
                context.l10n.appTitle,
                style: text.headlineSmall?.copyWith(color: Colors.white, letterSpacing: 3),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
