import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/theme/app_text_styles.dart';
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
    required this.tint,
  });

  final String route;
  final IconData icon;
  final QueueGroup group;
  final bool Function(AuthUser user) visible;
  final String Function(AppLocalizations l10n) title;
  final String Function(AppLocalizations l10n) hint;

  /// Each task keeps its own colour, so the eye finds it without reading.
  final Color tint;
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
    tint: AppPalette.brick,
  ),
  HomeTask(
    route: AppRoutes.attendance,
    icon: Icons.groups_rounded,
    group: QueueGroup.attendance,
    visible: (u) => u.can(Permissions.labourManage),
    title: (l) => l.tileAttendance,
    hint: (l) => l.tileAttendanceHint,
    tint: AppPalette.info600,
  ),
  HomeTask(
    route: AppRoutes.grn,
    icon: Icons.inventory_2_rounded,
    group: QueueGroup.goodsReceipt,
    visible: (u) => u.can(Permissions.purchasesManage),
    title: (l) => l.tileGrn,
    hint: (l) => l.tileGrnHint,
    tint: AppPalette.accent600,
  ),
  HomeTask(
    route: AppRoutes.dispatch,
    icon: Icons.local_shipping_rounded,
    group: QueueGroup.dispatch,
    visible: (u) => u.can(Permissions.dispatchManage) || u.can(Permissions.dispatchAcknowledge),
    title: (l) => l.tileDispatch,
    hint: (l) => l.tileDispatchHint,
    tint: AppPalette.primary600,
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
      backgroundColor: colors.background,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(user: user, onSignOut: () => _signOut(context, ref)),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.xl,
              ),
              children: [
                const Entrance(child: _StatsStrip()),
                SectionLabel(l10n.homeYourWork),
                if (tasks.isEmpty)
                  EmptyView(message: l10n.homeNoTasks, icon: Icons.lock_outline_rounded)
                else
                  Entrance(
                    index: 1,
                    child: AppCard(
                      padding: EdgeInsets.zero,
                      child: Column(
                        children: [
                          for (final (i, task) in tasks.indexed) ...[
                            if (i > 0) const Divider(height: 1, indent: 60),
                            _TaskRow(task: task),
                          ],
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
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

class _Header extends ConsumerWidget {
  const _Header({required this.user, required this.onSignOut});

  final AuthUser user;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final colors = context.colors;
    final site = ref.watch(selectedSiteProvider);
    final hour = ref.watch(clockProvider)().hour;
    final greeting = hour < 12
        ? l10n.homeGoodMorning
        : hour < 17
        ? l10n.homeGoodAfternoon
        : l10n.homeGoodEvening;
    final onHeader = Colors.white.withValues(alpha: 0.75);

    return ColoredBox(
      color: colors.primary,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.xs, 0, AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const BricsLogo(size: 26),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    l10n.appTitle,
                    style: text.titleMedium?.copyWith(color: Colors.white, letterSpacing: 1),
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
              const SizedBox(height: AppSpacing.sm),
              Text(
                '$greeting, ${user.name}',
                style: text.titleLarge?.copyWith(color: Colors.white),
              ),
              const SizedBox(height: AppSpacing.xs),
              Semantics(
                button: true,
                label: '${l10n.homeKiln}: ${site?.name ?? '—'}',
                child: InkWell(
                  onTap: () => context.push(AppRoutes.kiln),
                  borderRadius: BorderRadius.circular(AppRadius.button),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.factory_outlined, size: 16, color: onHeader),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            site?.name ?? '—',
                            overflow: TextOverflow.ellipsis,
                            style: text.labelLarge?.copyWith(color: onHeader),
                          ),
                        ),
                        Icon(Icons.expand_more_rounded, size: 18, color: onHeader),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// What is on this phone — waiting, sent, refused — on one line, with the last sync.
class _StatsStrip extends ConsumerWidget {
  const _StatsStrip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final colors = context.colors;
    final rows = ref.watch(queueRowsProvider(QueueGroup.all)).value ?? const [];
    final summary = ref.watch(syncControllerProvider);
    final sent = rows.where((r) => r.status == QueueStatus.synced).length;
    final failed = rows.where((r) => r.status == QueueStatus.failed).length;
    final waiting = rows.length - sent - failed;

    Widget divider() => Container(width: 1, height: 28, color: colors.border);

    return AppCard(
      onTap: () => context.push(AppRoutes.sync),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                l10n.homeOnThisPhone.toUpperCase(),
                style: AppTextStyles.overline(text.labelSmall!),
              ),
              const Spacer(),
              Flexible(
                child: Text(
                  summary.lastSyncedAt == null
                      ? l10n.homeNotSyncedYet
                      : l10n.homeLastSynced(Formatters.displayTime(summary.lastSyncedAt!)),
                  style: text.labelSmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(Icons.chevron_right_rounded, size: 18, color: colors.mutedForeground),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Row(
            children: [
              Expanded(
                child: _Stat(value: waiting, label: l10n.homeStatWaiting, tone: Tone.warning),
              ),
              divider(),
              Expanded(
                child: _Stat(value: sent, label: l10n.homeStatSent, tone: Tone.success),
              ),
              divider(),
              Expanded(
                child: _Stat(value: failed, label: l10n.homeStatAttention, tone: Tone.danger),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, required this.tone});

  final int value;
  final String label;
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final (fg, _) = tone.of(context.colors);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AnimatedCount(
            value: value,
            style: text.headlineSmall?.copyWith(color: value > 0 ? fg : null),
          ),
          Text(label, style: text.labelSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

/// One task as a list row: tinted icon, name and hint, waiting count, chevron.
class _TaskRow extends ConsumerWidget {
  const _TaskRow({required this.task});

  final HomeTask task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final rows = ref.watch(queueRowsProvider(task.group)).value ?? const [];
    final waiting = rows.where((r) => r.status != QueueStatus.synced).length;

    return InkWell(
      onTap: () => context.push(task.route),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 60),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: task.tint.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(task.icon, color: task.tint, size: 20),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(task.title(l10n), style: text.titleMedium),
                    Text(
                      task.hint(l10n),
                      style: text.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (waiting > 0) ...[
                const SizedBox(width: AppSpacing.sm),
                StatusPill(label: l10n.tileWaiting(waiting), tone: Tone.warning),
              ],
              Icon(Icons.chevron_right_rounded, color: colors.mutedForeground),
            ],
          ),
        ),
      ),
    );
  }
}
