import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/domain/session.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_badge_action.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// One field task on the home screen, shown only when the role may do it.
class HomeTask {
  const HomeTask({
    required this.route,
    required this.icon,
    required this.group,
    required this.visible,
    required this.title,
    required this.hint,
  });

  final String route;
  final IconData icon;
  final QueueGroup group;
  final bool Function(AuthUser user) visible;
  final String Function(AppLocalizations l10n) title;
  final String Function(AppLocalizations l10n) hint;
}

/// MOB-01 — the tasks follow the role's permissions; no role is widened for
/// the app (ADR-053). The server checks again on every send.
final homeTasks = <HomeTask>[
  HomeTask(
    route: AppRoutes.production,
    icon: Icons.local_fire_department_outlined,
    group: QueueGroup.production,
    visible: (u) => u.can(Permissions.productionManage),
    title: (l) => l.tileProduction,
    hint: (l) => l.tileProductionHint,
  ),
  HomeTask(
    route: AppRoutes.attendance,
    icon: Icons.groups_outlined,
    group: QueueGroup.attendance,
    visible: (u) => u.can(Permissions.labourManage),
    title: (l) => l.tileAttendance,
    hint: (l) => l.tileAttendanceHint,
  ),
  HomeTask(
    route: AppRoutes.grn,
    icon: Icons.inventory_2_outlined,
    group: QueueGroup.goodsReceipt,
    visible: (u) => u.can(Permissions.purchasesManage),
    title: (l) => l.tileGrn,
    hint: (l) => l.tileGrnHint,
  ),
  HomeTask(
    route: AppRoutes.dispatch,
    icon: Icons.local_shipping_outlined,
    group: QueueGroup.dispatch,
    visible: (u) => u.can(Permissions.dispatchManage) || u.can(Permissions.dispatchAcknowledge),
    title: (l) => l.tileDispatch,
    hint: (l) => l.tileDispatchHint,
  ),
];

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(currentSessionProvider);
    if (signedIn == null) return const SizedBox.shrink();
    final user = signedIn.session.user;
    final site = ref.watch(selectedSiteProvider);
    final tasks = homeTasks.where((t) => t.visible(user)).toList();
    final text = Theme.of(context).textTheme;

    return AppScaffold(
      title: l10n.appTitle,
      actions: [
        const SyncBadgeAction(),
        PopupMenuButton<String>(
          onSelected: (value) => switch (value) {
            'kiln' => context.push(AppRoutes.kiln),
            _ => _signOut(context, ref),
          },
          itemBuilder: (context) => [
            PopupMenuItem(value: 'kiln', child: Text(l10n.homeSwitchKiln)),
            PopupMenuItem(value: 'out', child: Text(l10n.homeSignOut)),
          ],
        ),
      ],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.homeGreeting(user.name), style: text.headlineSmall),
          const SizedBox(height: AppSpacing.md),
          AppCard(
            onTap: () => context.push(AppRoutes.kiln),
            child: Row(
              children: [
                Icon(Icons.factory, color: context.colors.primary),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.homeKiln, style: text.labelMedium),
                      Text(site?.name ?? '—', style: text.titleMedium),
                    ],
                  ),
                ),
                const Icon(Icons.swap_horiz),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (tasks.isEmpty) EmptyView(message: l10n.homeNoTasks, icon: Icons.lock_outline),
          for (final task in tasks) ...[
            _TaskTile(task: task),
            const SizedBox(height: AppSpacing.sm),
          ],
        ],
      ),
    );
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final userId = ref.read(currentSessionProvider)?.session.user.id;
    if (userId == null) return;
    final unsent = await ref.read(queueRepositoryProvider).unsentCount(userId);
    if (unsent > 0 && context.mounted) {
      final proceed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(l10n.homeSignOutUnsentTitle),
          content: Text(l10n.homeSignOutUnsentBody(unsent)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(l10n.homeSyncAndWait),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(l10n.homeSignOutAnyway),
            ),
          ],
        ),
      );
      if (proceed != true) return;
    }
    await ref.read(sessionControllerProvider.notifier).signOut();
  }
}

class _TaskTile extends ConsumerWidget {
  const _TaskTile({required this.task});

  final HomeTask task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final rows = ref.watch(queueRowsProvider(task.group)).value ?? const [];
    final waiting = rows.where((r) => r.status != QueueStatus.synced).length;

    return AppCard(
      onTap: () => context.push(task.route),
      child: Row(
        children: [
          Container(
            width: AppSpacing.touchTarget,
            height: AppSpacing.touchTarget,
            decoration: BoxDecoration(
              color: colors.surfaceMuted,
              borderRadius: BorderRadius.circular(AppRadius.card),
            ),
            child: Icon(task.icon, color: colors.primary),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(task.title(l10n), style: text.titleMedium),
                Text(task.hint(l10n), style: text.bodySmall),
                if (waiting > 0)
                  Text(
                    l10n.tileWaiting(waiting),
                    style: text.labelSmall?.copyWith(color: colors.warning),
                  ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}
