import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The badge every screen's app bar carries; tapping it opens the sync screen.
class SyncBadgeAction extends ConsumerWidget {
  const SyncBadgeAction({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SyncStatusBadge(
      summary: ref.watch(syncControllerProvider),
      onTap: () => context.push(AppRoutes.sync),
    );
  }
}
