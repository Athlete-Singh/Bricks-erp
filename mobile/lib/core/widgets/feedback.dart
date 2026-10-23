import 'dart:async';

import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A confirmation that slides up from the bottom with a green tick: the entry
/// is safe on the phone.
void showAppSnack(BuildContext context, String message, {IconData icon = Icons.check_circle}) {
  final colors = context.colors;
  unawaited(HapticFeedback.lightImpact());
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        backgroundColor: colors.foreground,
        elevation: 2,
        margin: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.md),
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
