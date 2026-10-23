import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';

/// Tabs on the green header: a translucent track with a white thumb that slides.
class HeaderTabs extends StatelessWidget {
  const HeaderTabs({required this.labels, super.key});

  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadius.button),
      ),
      child: TabBar(
        unselectedLabelColor: Colors.white.withValues(alpha: 0.8),
        splashBorderRadius: BorderRadius.circular(AppRadius.button - 2),
        tabs: [for (final l in labels) Tab(height: 34, text: l)],
      ),
    );
  }
}
