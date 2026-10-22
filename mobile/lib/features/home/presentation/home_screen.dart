import 'dart:ui';

import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
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
    required this.gradient,
  });

  final String route;
  final IconData icon;
  final QueueGroup group;
  final bool Function(AuthUser user) visible;
  final String Function(AppLocalizations l10n) title;
  final String Function(AppLocalizations l10n) hint;

  /// Each task keeps its own colour, so the eye finds it without reading.
  final List<Color> gradient;
}

/// MOB-01 — the tasks follow the role's permissions; no role is widened for
/// the app (ADR-053). The server checks again on every send.
final homeTasks = <HomeTask>[
  HomeTask(
    route: AppRoutes.production,
    icon: Icons.local_fire_department_rounded,
    group: QueueGroup.production,
    visible: (u) => u.can(Permissions.productionManage),
    title: (l) => l.tileProduction,
    hint: (l) => l.tileProductionHint,
    gradient: const [AppPalette.brickLight, AppPalette.brick],
  ),
  HomeTask(
    route: AppRoutes.attendance,
    icon: Icons.groups_rounded,
    group: QueueGroup.attendance,
    visible: (u) => u.can(Permissions.labourManage),
    title: (l) => l.tileAttendance,
    hint: (l) => l.tileAttendanceHint,
    gradient: const [AppPalette.info400, AppPalette.info600],
  ),
  HomeTask(
    route: AppRoutes.grn,
    icon: Icons.inventory_2_rounded,
    group: QueueGroup.goodsReceipt,
    visible: (u) => u.can(Permissions.purchasesManage),
    title: (l) => l.tileGrn,
    hint: (l) => l.tileGrnHint,
    gradient: const [AppPalette.accent300, AppPalette.accent600],
  ),
  HomeTask(
    route: AppRoutes.dispatch,
    icon: Icons.local_shipping_rounded,
    group: QueueGroup.dispatch,
    visible: (u) => u.can(Permissions.dispatchManage) || u.can(Permissions.dispatchAcknowledge),
    title: (l) => l.tileDispatch,
    hint: (l) => l.tileDispatchHint,
    gradient: const [AppPalette.primary300, AppPalette.primary600],
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
    final tasks = homeTasks.where((t) => t.visible(user)).toList();
    final colors = context.colors;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                _Hero(user: user, onSignOut: () => _signOut(context, ref)),
                const Positioned(
                  left: AppSpacing.lg,
                  right: AppSpacing.lg,
                  bottom: -64,
                  child: _StatsCard(),
                ),
              ],
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 64 + AppSpacing.lg)),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            sliver: SliverToBoxAdapter(child: SectionLabel(l10n.homeYourWork)),
          ),
          if (tasks.isEmpty)
            SliverToBoxAdapter(
              child: EmptyView(message: l10n.homeNoTasks, icon: Icons.lock_outline_rounded),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.xxl),
              sliver: SliverGrid.builder(
                // Taller with the phone's large-text setting, so nothing is cut off.
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: AppSpacing.md,
                  crossAxisSpacing: AppSpacing.md,
                  mainAxisExtent: 200 * MediaQuery.textScalerOf(context).scale(1).clamp(1, 1.8),
                ),
                itemCount: tasks.length,
                itemBuilder: (context, i) => Entrance(
                  index: i + 2,
                  child: _TaskTile(task: tasks[i]),
                ),
              ),
            ),
        ],
      ),
      backgroundColor: colors.background,
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
          icon: Icon(Icons.warning_amber_rounded, color: context.colors.warning, size: 36),
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

class _Hero extends ConsumerWidget {
  const _Hero({required this.user, required this.onSignOut});

  final AuthUser user;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final site = ref.watch(selectedSiteProvider);
    final hour = ref.watch(clockProvider)().hour;
    final greeting = hour < 12
        ? l10n.homeGoodMorning
        : hour < 17
        ? l10n.homeGoodAfternoon
        : l10n.homeGoodEvening;

    return HeroBackdrop(
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.sm,
            64 + AppSpacing.xl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const BricsLogo(size: 34),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    l10n.appTitle,
                    style: text.titleLarge?.copyWith(color: Colors.white, letterSpacing: 2),
                  ),
                  const Spacer(),
                  const SyncBadgeAction(),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert_rounded, color: Colors.white),
                    onSelected: (value) => switch (value) {
                      'kiln' => context.push(AppRoutes.kiln),
                      _ => onSignOut(),
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'kiln',
                        child: ListTile(
                          leading: const Icon(Icons.swap_horiz_rounded),
                          title: Text(l10n.homeSwitchKiln),
                        ),
                      ),
                      PopupMenuItem(
                        value: 'out',
                        child: ListTile(
                          leading: const Icon(Icons.logout_rounded),
                          title: Text(l10n.homeSignOut),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              Entrance(
                child: Text(
                  greeting,
                  style: text.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: 0.75)),
                ),
              ),
              Entrance(
                index: 1,
                child: Text(user.name, style: text.displaySmall?.copyWith(color: Colors.white)),
              ),
              const SizedBox(height: AppSpacing.lg),
              Entrance(
                index: 2,
                child: _GlassChip(
                  icon: Icons.factory_rounded,
                  label: site?.name ?? '—',
                  caption: l10n.homeKiln,
                  onTap: () => context.push(AppRoutes.kiln),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Frosted pill on the green header.
class _GlassChip extends StatelessWidget {
  const _GlassChip({
    required this.icon,
    required this.label,
    required this.caption,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String caption;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Pressable(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.fromLTRB(6, 6, AppSpacing.lg, 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(AppRadius.pill),
              border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: context.colors.goldGradient,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 18, color: AppPalette.primary900),
                ),
                const SizedBox(width: AppSpacing.sm),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      caption,
                      style: text.labelSmall?.copyWith(color: Colors.white.withValues(alpha: 0.7)),
                    ),
                    Text(label, style: text.titleSmall?.copyWith(color: Colors.white)),
                  ],
                ),
                const SizedBox(width: AppSpacing.sm),
                const Icon(Icons.unfold_more_rounded, color: Colors.white, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// What is on this phone: waiting, sent, refused — numbers that roll.
class _StatsCard extends ConsumerWidget {
  const _StatsCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final rows = ref.watch(queueRowsProvider(QueueGroup.all)).value ?? const [];
    final summary = ref.watch(syncControllerProvider);
    final sent = rows.where((r) => r.status == QueueStatus.synced).length;
    final failed = rows.where((r) => r.status == QueueStatus.failed).length;
    final waiting = rows.length - sent - failed;

    return Entrance(
      index: 3,
      from: 30,
      child: AppCard(
        onTap: () => context.push(AppRoutes.sync),
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.lg,
          AppSpacing.lg,
          AppSpacing.md,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.homeOnThisPhone.toUpperCase(),
              style: text.labelSmall?.copyWith(letterSpacing: 1.2),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: _Stat(
                    value: waiting,
                    label: l10n.homeStatWaiting,
                    tone: Tone.warning,
                    icon: Icons.schedule_rounded,
                  ),
                ),
                Expanded(
                  child: _Stat(
                    value: sent,
                    label: l10n.homeStatSent,
                    tone: Tone.success,
                    icon: Icons.cloud_done_rounded,
                  ),
                ),
                Expanded(
                  child: _Stat(
                    value: failed,
                    label: l10n.homeStatAttention,
                    tone: Tone.danger,
                    icon: Icons.error_rounded,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              summary.lastSyncedAt == null
                  ? l10n.homeNotSyncedYet
                  : l10n.homeLastSynced(Formatters.displayTime(summary.lastSyncedAt!)),
              style: text.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, required this.tone, required this.icon});

  final int value;
  final String label;
  final Tone tone;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final (fg, _) = tone.of(context.colors);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconBadge(icon: icon, tone: tone, size: 30),
            const SizedBox(width: AppSpacing.sm),
            AnimatedCount(
              value: value,
              style: text.headlineSmall?.copyWith(color: value > 0 ? fg : null),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(label, style: text.labelSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
      ],
    );
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
      padding: EdgeInsets.zero,
      child: Stack(
        children: [
          // A wash of the task's colour in the corner.
          Positioned(
            right: -40,
            top: -40,
            child: Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    task.gradient.last.withValues(alpha: 0.16),
                    task.gradient.last.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: task.gradient,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: task.gradient.last.withValues(alpha: 0.4),
                            blurRadius: 14,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Icon(task.icon, color: Colors.white, size: 26),
                    ),
                    const Spacer(),
                    if (waiting > 0)
                      StatusPill(label: l10n.tileWaiting(waiting), tone: Tone.warning),
                  ],
                ),
                const Spacer(),
                Text(
                  task.title(l10n),
                  style: text.titleMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  task.hint(l10n),
                  style: text.bodySmall,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppSpacing.xs),
                Align(
                  alignment: Alignment.centerRight,
                  child: Icon(Icons.arrow_forward_rounded, size: 18, color: colors.mutedForeground),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
