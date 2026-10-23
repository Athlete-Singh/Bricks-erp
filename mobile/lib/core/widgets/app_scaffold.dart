import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';

/// Page frame: a flat brand-green header, a padded body that stays above the
/// keyboard, and an optional pinned main action.
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
    this.subtitle,
    this.header,
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

  /// A line under the title (the kiln, a date).
  final String? subtitle;

  /// Extra content inside the header, under the title (tabs, a summary).
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final content = scrollable
        ? SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.xl,
            ),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: body,
          )
        : body;

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ColoredBox(
            color: colors.primary,
            child: SafeArea(
              bottom: false,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppBar(
                    toolbarHeight: subtitle == null ? 52 : 56,
                    leading: leading,
                    // No back button (the first screen of a flow): no gap for one either.
                    automaticallyImplyLeading: leading == null,
                    titleSpacing: leading == null && Navigator.of(context).canPop()
                        ? 0
                        : AppSpacing.lg,
                    title: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, overflow: TextOverflow.ellipsis),
                        if (subtitle != null)
                          Text(
                            subtitle!,
                            style: text.labelMedium?.copyWith(
                              color: colors.onPrimary.withValues(alpha: 0.75),
                            ),
                          ),
                      ],
                    ),
                    actions: [
                      ...actions,
                      const SizedBox(width: AppSpacing.sm),
                    ],
                  ),
                  if (header != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.md,
                        0,
                        AppSpacing.md,
                        AppSpacing.sm,
                      ),
                      child: header,
                    ),
                ],
              ),
            ),
          ),
          Expanded(
            child: SafeArea(top: false, bottom: bottomAction == null, child: content),
          ),
        ],
      ),
      floatingActionButton: floatingAction,
      bottomNavigationBar: bottomAction == null
          ? null
          : Container(
              decoration: BoxDecoration(
                color: colors.surface,
                border: Border(top: BorderSide(color: colors.border)),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.sm,
                    AppSpacing.md,
                    AppSpacing.sm,
                  ),
                  child: bottomAction,
                ),
              ),
            ),
    );
  }
}
