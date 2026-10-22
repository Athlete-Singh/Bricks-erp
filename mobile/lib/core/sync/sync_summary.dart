import 'package:flutter/foundation.dart';

/// What the badge on every screen shows: is the phone online, and how much is
/// still on it.
@immutable
class SyncSummary {
  const SyncSummary({
    required this.online,
    required this.pending,
    required this.failed,
    required this.syncing,
    this.lastSyncedAt,
  });

  static const empty = SyncSummary(online: true, pending: 0, failed: 0, syncing: false);

  final bool online;

  /// Waiting to be sent, including entries waiting on a parent entry.
  final int pending;

  /// Refused by the server; the supervisor has to fix or discard them.
  final int failed;
  final bool syncing;
  final DateTime? lastSyncedAt;

  SyncSummary copyWith({
    bool? online,
    int? pending,
    int? failed,
    bool? syncing,
    DateTime? lastSyncedAt,
  }) {
    return SyncSummary(
      online: online ?? this.online,
      pending: pending ?? this.pending,
      failed: failed ?? this.failed,
      syncing: syncing ?? this.syncing,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is SyncSummary &&
      other.online == online &&
      other.pending == pending &&
      other.failed == failed &&
      other.syncing == syncing &&
      other.lastSyncedAt == lastSyncedAt;

  @override
  int get hashCode => Object.hash(online, pending, failed, syncing, lastSyncedAt);
}
