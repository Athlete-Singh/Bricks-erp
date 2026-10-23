import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_providers.dart';
import 'package:brics_mobile/features/dispatch/presentation/journey_tracker.dart';
import 'package:brics_mobile/features/masters/data/master_providers.dart';
import 'package:brics_mobile/features/sync/presentation/entry_list.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_badge_action.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

String dispatchStatusLabel(AppLocalizations l10n, String status) => switch (status) {
  DispatchStatus.confirmed => l10n.dispatchStatusConfirmed,
  DispatchStatus.delivered => l10n.dispatchStatusDelivered,
  DispatchStatus.cancelled => l10n.dispatchStatusCancelled,
  _ => l10n.dispatchStatusDraft,
};

/// The customer's name when this role can read parties; the supervisor (who
/// cannot) sees the challan number instead.
String customerName(WidgetRef ref, AppLocalizations l10n, String partyId) {
  final customers = ref.watch(partiesOfTypeProvider(PartyTypes.customer)).value ?? const [];
  return customers.where((c) => c.id == partyId).firstOrNull?.name ?? l10n.dispatchCustomerUnknown;
}

/// DSP-04 — open challans at this kiln, and what this phone has entered.
class DispatchScreen extends ConsumerWidget {
  const DispatchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final user = ref.watch(currentSessionProvider)?.session.user;
    // Raising a challan needs the customer list, which only some roles may read.
    final canRaise =
        (user?.can(Permissions.dispatchManage) ?? false) &&
        (user?.can(Permissions.partiesView) ?? false);

    return DefaultTabController(
      length: 2,
      child: AppScaffold(
        title: l10n.dispatchTitle,
        subtitle: ref.watch(selectedSiteProvider)?.name,
        actions: const [SyncBadgeAction()],
        scrollable: false,
        floatingAction: canRaise
            ? FloatingActionButton.extended(
                onPressed: () => context.push(AppRoutes.dispatchNew),
                icon: const Icon(Icons.add_rounded),
                label: Text(l10n.dispatchNew),
              )
            : null,
        header: HeaderTabs(labels: [l10n.dispatchTabChallans, l10n.dispatchTabEntries]),
        body: TabBarView(
          children: [
            const _ChallanList(),
            EntryList(group: QueueGroup.dispatch, emptyMessage: l10n.dispatchNoEntries),
          ],
        ),
      ),
    );
  }
}

class _ChallanList extends ConsumerWidget {
  const _ChallanList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(challansProvider)) {
      AsyncData(:final value) when value.isEmpty => EmptyView(
        message: l10n.dispatchNoChallans,
        icon: Icons.local_shipping_outlined,
      ),
      AsyncData(:final value) => ListView.separated(
        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 112),
        itemCount: value.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (context, i) => Entrance(
          index: i,
          child: _ChallanCard(challan: value[i]),
        ),
      ),
      AsyncError() => const ErrorView(),
      _ => const AppLoader(),
    };
  }
}

class _ChallanCard extends ConsumerWidget {
  const _ChallanCard({required this.challan});

  final ChallanView challan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final actions = ref.watch(challanActionsProvider(challanIds(challan)));
    final status = effectiveStatus(
      challan,
      confirm: actions.confirm,
      acknowledge: actions.acknowledge,
    );
    final colors = context.colors;
    return AppCard(
      accent: switch (status) {
        DispatchStatus.delivered => colors.success,
        DispatchStatus.confirmed => colors.info,
        _ => challan.serverStatus == null ? colors.warning : colors.primary,
      },
      onTap: () => context.push(AppRoutes.dispatchChallan(challan.ref.encode())),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const IconBadge(icon: Icons.local_shipping_rounded, size: 32),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(challan.challanNo ?? l10n.dispatchChallanUnsent, style: text.titleMedium),
                    Text(
                      customerName(ref, l10n, challan.customerPartyId),
                      style: text.bodySmall?.copyWith(color: colors.foreground),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Text(Formatters.displayIsoDate(challan.dispatchDate), style: text.bodySmall),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(child: JourneyTracker(status: status, compact: true)),
              const SizedBox(width: AppSpacing.md),
              StatusPill(label: dispatchStatusLabel(l10n, status), tone: _tone(status)),
            ],
          ),
        ],
      ),
    );
  }

  static Tone _tone(String status) => switch (status) {
    DispatchStatus.delivered => Tone.success,
    DispatchStatus.confirmed => Tone.info,
    DispatchStatus.cancelled => Tone.danger,
    _ => Tone.neutral,
  };
}
