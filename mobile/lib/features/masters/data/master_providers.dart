import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/masters/domain/masters.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';

// The pickers on every form read these: the phone's copy of the masters,
// active rows only, sorted the way a person scans a list. They work offline.

Stream<List<T>> _watch<T>(
  Ref ref,
  String kind,
  T Function(Map<String, dynamic>) parse, {
  bool perSite = false,
}) {
  final siteId = perSite ? ref.watch(currentSessionProvider)?.siteId : null;
  return ref
      .watch(cacheRepositoryProvider)
      .watch(kind, siteId: siteId)
      .map((rows) => rows.where((r) => r['isActive'] != false).map(parse).toList());
}

final StreamProviderFamily<List<Party>, String> partiesOfTypeProvider =
    StreamProvider.family<List<Party>, String>((ref, type) {
      return _watch(ref, CacheKind.party, Party.fromJson).map(
        (parties) =>
            parties.where((p) => p.partyTypes.contains(type)).toList()
              ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase())),
      );
    });

final itemsProvider = StreamProvider<List<Item>>((ref) {
  return _watch(
    ref,
    CacheKind.item,
    Item.fromJson,
  ).map((items) => items..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase())));
});

final unitsProvider = StreamProvider<Map<String, Unit>>((ref) {
  return _watch(
    ref,
    CacheKind.unit,
    Unit.fromJson,
  ).map((units) => {for (final u in units) u.id: u});
});

final brickTypesProvider = StreamProvider<List<BrickType>>((ref) {
  return _watch(
    ref,
    CacheKind.brickType,
    BrickType.fromJson,
  ).map((types) => types..sort((a, b) => a.grade.compareTo(b.grade)));
});

/// The selected kiln's yards and stores.
final warehousesProvider = StreamProvider<List<Warehouse>>((ref) {
  return _watch(
    ref,
    CacheKind.warehouse,
    Warehouse.fromJson,
    perSite: true,
  ).map((list) => list..sort((a, b) => a.name.compareTo(b.name)));
});

/// Gangs at the selected kiln, plus gangs not tied to any kiln.
final labourGroupsProvider = StreamProvider<List<LabourGroup>>((ref) {
  return _watch(
    ref,
    CacheKind.labourGroup,
    LabourGroup.fromJson,
    perSite: true,
  ).map((list) => list..sort((a, b) => a.name.compareTo(b.name)));
});

final StreamProviderFamily<List<Worker>, String> workersInGroupProvider =
    StreamProvider.family<List<Worker>, String>((ref, groupId) {
      return _watch(ref, CacheKind.worker, Worker.fromJson).map(
        (workers) =>
            workers.where((w) => w.labourGroupId == groupId).toList()
              ..sort((a, b) => a.name.compareTo(b.name)),
      );
    });

final vehiclesProvider = StreamProvider<List<Vehicle>>((ref) {
  return _watch(
    ref,
    CacheKind.vehicle,
    Vehicle.fromJson,
  ).map((list) => list..sort((a, b) => a.registrationNo.compareTo(b.registrationNo)));
});

final driversProvider = StreamProvider<List<Driver>>((ref) {
  return _watch(
    ref,
    CacheKind.driver,
    Driver.fromJson,
  ).map((list) => list..sort((a, b) => a.name.compareTo(b.name)));
});

/// Party types as the backend names them (`PARTY_TYPES` in `@brics/shared`).
abstract final class PartyTypes {
  static const customer = 'customer';
  static const supplier = 'supplier';
  static const sardar = 'sardar';
}
