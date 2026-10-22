import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:flutter/material.dart';

/// While the stored session is read: the kiln builds itself and starts firing.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: HeroBackdrop(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const AnimatedBricsLogo(size: 110),
              const SizedBox(height: AppSpacing.lg),
              Entrance(
                index: 6,
                child: Text(
                  context.l10n.appTitle,
                  style: text.displaySmall?.copyWith(color: Colors.white, letterSpacing: 6),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
