import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class KilnPickerScreen extends ConsumerWidget {
  const KilnPickerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final sites = ref.watch(availableSitesProvider).value ?? const [];
    final selected = ref.watch(currentSessionProvider)?.siteId;

    return AppScaffold(
      title: l10n.kilnPickerTitle,
      scrollable: false,
      leading: context.canPop() ? null : const SizedBox.shrink(),
      body: sites.isEmpty
          ? EmptyView(message: l10n.kilnPickerNone, icon: Icons.factory_outlined)
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                Text(l10n.kilnPickerHint),
                const SizedBox(height: AppSpacing.lg),
                for (final site in sites) ...[
                  AppCard(
                    onTap: () async {
                      await ref.read(sessionControllerProvider.notifier).selectSite(site.id);
                      if (context.mounted) context.go(AppRoutes.home);
                    },
                    child: Row(
                      children: [
                        Icon(Icons.factory, color: context.colors.primary),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(site.name, style: Theme.of(context).textTheme.titleMedium),
                              Text(site.code, style: Theme.of(context).textTheme.bodySmall),
                            ],
                          ),
                        ),
                        if (site.id == selected)
                          Icon(Icons.check_circle, color: context.colors.success),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
              ],
            ),
    );
  }
}
