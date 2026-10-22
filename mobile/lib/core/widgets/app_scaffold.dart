import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/brand.dart';
import 'package:flutter/material.dart';

/// Page frame: a deep-green header with brick texture and a slow glow, curving
/// into the page; a padded body that stays above the keyboard; and an optional
/// pinned main action.
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
              AppSpacing.lg,
              AppSpacing.lg,
              AppSpacing.lg,
              AppSpacing.xxl,
            ),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: body,
          )
        : body;

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          HeroBackdrop(
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.modal)),
            glow: 0.7,
            child: SafeArea(
              bottom: false,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppBar(
                    leading: leading,
                    titleSpacing: leading == null && !Navigator.of(context).canPop()
                        ? AppSpacing.lg
                        : 0,
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
                        AppSpacing.lg,
                        0,
                        AppSpacing.lg,
                        AppSpacing.lg,
                      ),
                      child: header,
                    )
                  else
                    const SizedBox(height: AppSpacing.sm),
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
                boxShadow: [
                  BoxShadow(color: colors.shadow, blurRadius: 20, offset: const Offset(0, -4)),
                ],
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.modal)),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.md,
                    AppSpacing.lg,
                    AppSpacing.md,
                  ),
                  child: bottomAction,
                ),
              ),
            ),
    );
  }
}
