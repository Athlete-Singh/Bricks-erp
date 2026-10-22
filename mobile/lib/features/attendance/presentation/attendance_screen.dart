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

/// LAB-02 — muster rolls taken on this phone, at this kiln.
class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return AppScaffold(
      subtitle: ref.watch(selectedSiteProvider)?.name,
      title: l10n.attendanceTitle,
      actions: const [SyncBadgeAction()],
      scrollable: false,
      floatingAction: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.attendanceNew),
        icon: const Icon(Icons.how_to_reg_rounded),
        label: Text(l10n.attendanceTake),
      ),
      body: EntryList(
        group: QueueGroup.attendance,
        emptyMessage: l10n.attendanceNoEntries,
        emptyIcon: Icons.groups_outlined,
      ),
    );
  }
}
