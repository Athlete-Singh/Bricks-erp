import 'dart:async';

import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/celebration.dart' as celebration;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A confirmation that slides up from the bottom with a green tick: the entry
/// is safe on the phone.
/// With [celebrate] (a new entry saved), the tick-and-confetti plays too.
void showAppSnack(
  BuildContext context,
  String message, {
  IconData icon = Icons.check_circle,
  bool celebrate = false,
}) {
  final colors = context.colors;
  if (celebrate) celebration.celebrate(context);
  unawaited(HapticFeedback.lightImpact());
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        backgroundColor: colors.foreground,
        elevation: 8,
        margin: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.lg),
        content: Row(
          children: [
            Icon(icon, color: colors.success),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.background),
              ),
            ),
          ],
        ),
      ),
    );
}
