import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/sync/presentation/entry_editors.dart';
import 'package:brics_mobile/features/sync/presentation/queue_entry_tile.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// "My entries" for one feature: what this phone entered, newest first, each
/// with where it stands.
class EntryList extends ConsumerWidget {
  const EntryList({
    required this.group,
    required this.emptyMessage,
    super.key,
    this.emptyIcon = Icons.inbox_outlined,
  });

  final QueueGroup group;
  final String emptyMessage;
  final IconData emptyIcon;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return switch (ref.watch(queueRowsProvider(group))) {
      AsyncData(:final value) when value.isEmpty => EmptyView(
        message: emptyMessage,
        icon: emptyIcon,
      ),
      AsyncData(:final value) => ListView.separated(
        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 112),
        itemCount: value.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (context, i) => Entrance(
          index: i,
          child: QueueEntryTile(row: value[i], onEdit: editorFor(context, value[i])),
        ),
      ),
      AsyncError() => const ErrorView(),
      _ => const AppLoader(),
    };
  }
}
