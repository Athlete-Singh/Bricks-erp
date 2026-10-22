import 'dart:ui';

import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';

/// Tabs on the green header: a frosted track with a white thumb that slides.
class HeaderTabs extends StatelessWidget {
  const HeaderTabs({required this.labels, super.key});

  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.button + 4),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(AppRadius.button + 4),
          ),
          child: TabBar(
            unselectedLabelColor: Colors.white.withValues(alpha: 0.8),
            splashBorderRadius: BorderRadius.circular(AppRadius.button),
            tabs: [for (final l in labels) Tab(height: 40, text: l)],
          ),
        ),
      ),
    );
  }
}
