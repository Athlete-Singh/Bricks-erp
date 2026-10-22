import 'dart:async';

import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/record_ref.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/theme/app_text_styles.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_providers.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_screen.dart';
import 'package:brics_mobile/features/dispatch/presentation/journey_tracker.dart';
import 'package:brics_mobile/features/masters/data/master_providers.dart';
import 'package:brics_mobile/features/masters/domain/masters.dart';
import 'package:brics_mobile/features/sync/presentation/entry_editors.dart';
import 'package:brics_mobile/features/sync/presentation/queue_entry_tile.dart';
import 'package:brics_mobile/features/sync/presentation/sync_badge_action.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// DSP-04 — one challan: what is on it, and the two field steps — the truck
/// leaving the gate, and the customer signing for the load.
class ChallanScreen extends ConsumerStatefulWidget {
  const ChallanScreen({required this.challanRef, super.key});

  final RecordRef challanRef;

  @override
  ConsumerState<ChallanScreen> createState() => _ChallanScreenState();
}

class _ChallanScreenState extends ConsumerState<ChallanScreen> {
  @override
  void initState() {
    super.initState();
    final serverId = widget.challanRef.serverId;
    if (serverId != null) unawaited(ref.read(dispatchRepositoryProvider).refreshDetail(serverId));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final challan = ref.watch(challanViewProvider(widget.challanRef));
    if (challan == null) return AppScaffold(title: l10n.dispatchTitle, body: const EmptyView());

    final ids = challanIds(challan);
    final actions = ref.watch(challanActionsProvider(ids));
    final status = effectiveStatus(
      challan,
      confirm: actions.confirm,
      acknowledge: actions.acknowledge,
    );
    final user = ref.watch(currentSessionProvider)?.session.user;
    final detail = ids.serverId == null
        ? null
        : ref.watch(challanDetailProvider(ids.serverId!)).value;
    final lines =
        ((detail?['lines'] ?? challan.localRow?.payloadMap['lines']) as List?) ?? const [];
    final items = {for (final i in ref.watch(itemsProvider).value ?? const <Item>[]) i.id: i.name};
    final vehicles = ref.watch(vehiclesProvider).value ?? const <Vehicle>[];
    final vehicle = vehicles.where((v) => v.id == challan.vehicleId).firstOrNull;

    final canGateOut =
        (user?.can(Permissions.dispatchManage) ?? false) && status == DispatchStatus.draft;
    final canDeliver =
        (user?.can(Permissions.dispatchAcknowledge) ?? false) && status == DispatchStatus.confirmed;
    final pending = [actions.confirm, actions.acknowledge].whereType<QueueRow>();
    final target = challan.ref.encode();

    final total = lines.fold<double>(
      0,
      (sum, l) => sum + (double.tryParse('${(l as Map)['quantity']}') ?? 0),
    );

    return AppScaffold(
      title: challan.challanNo ?? l10n.dispatchChallanUnsent,
      subtitle: customerName(ref, l10n, challan.customerPartyId),
      actions: const [SyncBadgeAction()],
      header: JourneyTracker(status: status, onHeader: true),
      bottomAction: canGateOut
          ? AppButton(
              label: l10n.dispatchGateOut,
              icon: Icons.logout_rounded,
              onPressed: () => context.push(AppRoutes.dispatchAction(target, 'gate-out')),
            )
          : canDeliver
          ? AppButton(
              label: l10n.dispatchDeliver,
              icon: Icons.assignment_turned_in_rounded,
              onPressed: () => context.push(AppRoutes.dispatchAction(target, 'deliver')),
            )
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Entrance(
            child: AppCard(
              child: Row(
                children: [
                  const IconBadge(icon: Icons.storefront_rounded, tone: Tone.gold),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          customerName(ref, l10n, challan.customerPartyId),
                          style: text.titleMedium,
                        ),
                        Text(
                          Formatters.displayIsoDate(challan.dispatchDate),
                          style: text.bodySmall,
                        ),
                        if (vehicle != null) ...[
                          const SizedBox(height: AppSpacing.sm),
                          StatusPill(
                            label: vehicle.registrationNo,
                            tone: Tone.neutral,
                            icon: Icons.local_shipping_rounded,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (lines.isNotEmpty) ...[
            SectionLabel(l10n.dispatchOnThisChallan),
            Entrance(
              index: 1,
              child: AppCard(
                child: Column(
                  children: [
                    for (final line in lines.cast<Map<dynamic, dynamic>>())
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                        child: Row(
                          children: [
                            const IconBadge(
                              icon: Icons.view_agenda_rounded,
                              tone: Tone.warning,
                              size: 34,
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Text(items[line['itemId']] ?? '—', style: text.bodyLarge),
                            ),
                            Text(
                              Formatters.quantity(line['quantity'] as String),
                              style: AppTextStyles.number(text.titleMedium!),
                            ),
                          ],
                        ),
                      ),
                    if (lines.length > 1) ...[
                      const Divider(height: AppSpacing.xl),
                      Row(
                        children: [
                          Expanded(child: Text(l10n.dispatchTotal, style: text.titleSmall)),
                          Text(
                            Formatters.quantity(
                              total == total.roundToDouble() ? total.toStringAsFixed(0) : '$total',
                            ),
                            style: AppTextStyles.number(text.titleLarge!),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
          if (pending.isNotEmpty) ...[
            SectionLabel(l10n.tileSync),
            for (final (i, row) in pending.indexed) ...[
              Entrance(
                index: i + 2,
                child: QueueEntryTile(row: row, onEdit: editorFor(context, row)),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ],
        ],
      ),
    );
  }
}
