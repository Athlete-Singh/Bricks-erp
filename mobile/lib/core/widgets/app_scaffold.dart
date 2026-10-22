import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';

/// Page frame: app bar with an optional status slot, a padded scrollable body
/// that stays above the keyboard, and an optional bottom action.
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    required this.title,
    required this.body,
    super.key,
    this.actions = const [],
    this.bottomAction,
    this.floatingAction,
    this.scrollable = true,
    this.leading,
  });

  final String title;
  final Widget body;
  final List<Widget> actions;

  /// Pinned under the content — the main "Save" of a form.
  final Widget? bottomAction;
  final Widget? floatingAction;

  /// False for screens that bring their own list view.
  final bool scrollable;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final content = scrollable
        ? SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: body,
          )
        : body;
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: leading,
        actions: [
          ...actions,
          const SizedBox(width: AppSpacing.sm),
        ],
      ),
      body: SafeArea(child: content),
      floatingActionButton: floatingAction,
      bottomNavigationBar: bottomAction == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.sm,
                  AppSpacing.lg,
                  AppSpacing.lg,
                ),
                child: bottomAction,
              ),
            ),
    );
  }
}
