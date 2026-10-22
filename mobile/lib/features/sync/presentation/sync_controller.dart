import 'dart:async';

import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/connectivity.dart';
import 'package:brics_mobile/core/sync/master_sync_service.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/sync_service.dart';
import 'package:brics_mobile/core/sync/sync_summary.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_providers.dart';
import 'package:brics_mobile/features/production/presentation/production_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final queueRepositoryProvider = Provider<QueueRepository>(
  (ref) => QueueRepository(ref.watch(databaseProvider), ref.watch(clockProvider)),
);

final syncServiceProvider = Provider<SyncService>(
  (ref) =>
      SyncService(api: ref.watch(apiClientProvider), queue: ref.watch(queueRepositoryProvider)),
);

final masterSyncServiceProvider = Provider<MasterSyncService>(
  (ref) => MasterSyncService(
    api: ref.watch(apiClientProvider),
    cache: ref.watch(cacheRepositoryProvider),
    db: ref.watch(databaseProvider),
  ),
);

/// Who new entries belong to: the signed-in person, at their company.
final queueOwnerProvider = Provider<QueueOwner?>((ref) {
  final session = ref.watch(currentSessionProvider)?.session;
  if (session == null) return null;
  return QueueOwner(userId: session.user.id, companyId: session.company.id);
});

final connectivityWatcherProvider = Provider<ConnectivityWatcher>(
  (ref) => PlatformConnectivityWatcher(),
);

/// Every server list the phone keeps. Features append their own lists here.
final pullSpecsProvider = Provider<List<PullSpec>>(
  (ref) => [...masterPullSpecs, ...productionPullSpecs, ...dispatchPullSpecs],
);

/// How often to look for due retries while the app is open.
const syncTick = Duration(seconds: 30);

final syncControllerProvider = NotifierProvider<SyncController, SyncSummary>(SyncController.new);

/// Runs the queue and the master pull, and keeps the badge's numbers.
///
/// Sync runs: on sign-in, when the network returns, when the app comes back to
/// the foreground, right after an entry is saved, on a timer for due retries,
/// and on "Sync now" (docs/09).
class SyncController extends Notifier<SyncSummary> {
  Future<void>? _running;
  bool _again = false;

  static const _lastSyncedKey = 'sync.lastAt';

  @override
  SyncSummary build() {
    final signedIn = ref.watch(currentSessionProvider);
    if (signedIn == null) return SyncSummary.empty;
    final userId = signedIn.session.user.id;

    final counts = ref.watch(queueRepositoryProvider).watchCounts(userId).listen((c) {
      state = state.copyWith(pending: c.pending, failed: c.failed);
    });
    final watcher = ref.watch(connectivityWatcherProvider);
    final network = watcher.watch().listen((online) {
      state = state.copyWith(online: online);
      // Signal is back: whatever was backing off goes now, not when its timer says.
      if (online) unawaited(syncNow(expedite: true));
    });
    final timer = Timer.periodic(syncTick, (_) => unawaited(_pushIfDue()));
    ref.onDispose(() {
      unawaited(counts.cancel());
      unawaited(network.cancel());
      timer.cancel();
    });

    unawaited(_start(watcher));
    return SyncSummary.empty;
  }

  Future<void> _start(ConnectivityWatcher watcher) async {
    final db = ref.read(databaseProvider);
    await ref.read(queueRepositoryProvider).releaseInterrupted();
    final last = await db.readState(_lastSyncedKey);
    final online = await watcher.check();
    if (!ref.mounted) return;
    state = state.copyWith(
      online: online,
      lastSyncedAt: last == null ? null : DateTime.tryParse(last),
    );
    if (online) await syncNow();
  }

  /// Called after an entry is saved — send it now if there is signal.
  void kick() => unawaited(syncNow());

  /// Push the queue, then refresh the cached lists. Overlapping calls share
  /// one run, and a call made during a run causes one more run after it.
  Future<void> syncNow({bool expedite = false}) async {
    if (expedite) {
      final signedIn = ref.read(currentSessionProvider);
      if (signedIn != null) {
        await ref.read(queueRepositoryProvider).expediteRetries(signedIn.session.user.id);
      }
    }
    if (_running != null) {
      _again = true;
      await _running;
      return;
    }
    _running = _run().whenComplete(() => _running = null);
    await _running;
    if (_again && ref.mounted) {
      _again = false;
      await syncNow();
    }
  }

  Future<void> _pushIfDue() async {
    final signedIn = ref.read(currentSessionProvider);
    if (signedIn == null || _running != null) return;
    final due = await ref.read(queueRepositoryProvider).due(signedIn.session.user.id);
    if (due.isNotEmpty) await syncNow();
  }

  Future<void> _run() async {
    final signedIn = ref.read(currentSessionProvider);
    if (signedIn == null) return;
    final session = signedIn.session;
    state = state.copyWith(syncing: true);
    try {
      final owner = QueueOwner(userId: session.user.id, companyId: session.company.id);
      final push = await ref.read(syncServiceProvider).push(owner);
      if (!ref.mounted) return;
      if (push.offline || push.unauthenticated) {
        state = state.copyWith(online: !push.offline);
        return;
      }
      final pull = await ref
          .read(masterSyncServiceProvider)
          .pull(ref.read(pullSpecsProvider), can: session.user.can, siteId: signedIn.siteId);
      if (!ref.mounted) return;
      if (pull.offline) {
        state = state.copyWith(online: false);
        return;
      }
      final now = ref.read(clockProvider)();
      await ref.read(databaseProvider).writeState(_lastSyncedKey, now.toIso8601String());
      if (!ref.mounted) return;
      state = state.copyWith(online: true, lastSyncedAt: now);
    } finally {
      if (ref.mounted) state = state.copyWith(syncing: false);
    }
  }
}
