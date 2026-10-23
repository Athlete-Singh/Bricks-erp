import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
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
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final sites = ref.watch(availableSitesProvider).value ?? const [];
    final selected = ref.watch(currentSessionProvider)?.siteId;

    return AppScaffold(
      title: l10n.kilnPickerTitle,
      subtitle: l10n.kilnPickerHint,
      scrollable: false,
      body: sites.isEmpty
          ? EmptyView(message: l10n.kilnPickerNone, icon: Icons.factory_outlined)
          : ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: sites.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, i) {
                final site = sites[i];
                final chosen = site.id == selected;
                return Entrance(
                  index: i,
                  child: AppCard(
                    accent: chosen ? colors.primary : null,
                    onTap: () async {
                      await ref.read(sessionControllerProvider.notifier).selectSite(site.id);
                      if (context.mounted) context.go(AppRoutes.home);
                    },
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: chosen ? colors.primary : colors.successSoft,
                            borderRadius: BorderRadius.circular(AppRadius.button),
                          ),
                          child: Text(
                            site.code.length > 3 ? site.code.substring(0, 3) : site.code,
                            style: text.labelMedium?.copyWith(
                              color: chosen ? Colors.white : colors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(site.name, style: text.titleMedium),
                              Text(site.code, style: text.bodySmall),
                            ],
                          ),
                        ),
                        AnimatedSwitcher(
                          duration: AppMotion.medium,
                          transitionBuilder: (c, a) => ScaleTransition(scale: a, child: c),
                          child: chosen
                              ? StatusPill(
                                  key: const ValueKey('on'),
                                  label: l10n.kilnPickerSelected,
                                  tone: Tone.success,
                                  icon: Icons.check_rounded,
                                )
                              : Icon(
                                  Icons.chevron_right_rounded,
                                  key: const ValueKey('off'),
                                  color: colors.mutedForeground,
                                ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
