import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/sync/presentation/entry_list.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_badge_action.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// PUR-02 — receipts entered on this phone; each shows its GRN number once sent.
class GrnScreen extends ConsumerWidget {
  const GrnScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return AppScaffold(
      subtitle: ref.watch(selectedSiteProvider)?.name,
      title: l10n.grnTitle,
      actions: const [SyncBadgeAction()],
      scrollable: false,
      floatingAction: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.grnNew),
        icon: const Icon(Icons.add_rounded),
        label: Text(l10n.grnNew),
      ),
      body: EntryList(
        group: QueueGroup.goodsReceipt,
        emptyMessage: l10n.grnNoEntries,
        emptyIcon: Icons.inventory_2_outlined,
      ),
    );
  }
}
