import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/sync/presentation/entry_editors.dart';
import 'package:brics_mobile/features/sync/presentation/queue_entry_tile.dart';
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
      title: l10n.grnTitle,
      actions: const [SyncBadgeAction()],
      scrollable: false,
      floatingAction: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.grnNew),
        icon: const Icon(Icons.add),
        label: Text(l10n.grnNew),
      ),
      body: switch (ref.watch(queueRowsProvider(QueueGroup.goodsReceipt))) {
        AsyncData(:final value) when value.isEmpty => EmptyView(
          message: l10n.grnNoEntries,
          icon: Icons.inventory_2_outlined,
        ),
        AsyncData(:final value) => ListView.separated(
          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 96),
          itemCount: value.length,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
          itemBuilder: (context, i) =>
              QueueEntryTile(row: value[i], onEdit: editorFor(context, value[i])),
        ),
        AsyncError() => const ErrorView(),
        _ => const AppLoader(),
      },
    );
  }
}
