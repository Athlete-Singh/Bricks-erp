import 'package:freezed_annotation/freezed_annotation.dart';

part 'masters.freezed.dart';
part 'masters.g.dart';

// Read-only copies of server masters (docs/09: "read-only caches pulled by
// updated_since"). Only the fields the app shows or sends are kept.

@freezed
abstract class Party with _$Party {
  const factory Party({
    required String id,
    required String name,
    @Default(<String>[]) List<String> partyTypes,
    @Default(true) bool isActive,
  }) = _Party;

  factory Party.fromJson(Map<String, dynamic> json) => _$PartyFromJson(json);
}

@freezed
abstract class Unit with _$Unit {
  const factory Unit({required String id, required String name, required String abbreviation}) =
      _Unit;

  factory Unit.fromJson(Map<String, dynamic> json) => _$UnitFromJson(json);
}

@freezed
abstract class Item with _$Item {
  const factory Item({
    required String id,
    required String name,
    required String category,
    required String unitId,
    @Default(true) bool isActive,
  }) = _Item;

  factory Item.fromJson(Map<String, dynamic> json) => _$ItemFromJson(json);
}

/// A brick grade. Each grade is sold as exactly one item (ADR-051).
@freezed
abstract class BrickType with _$BrickType {
  const factory BrickType({
    required String id,
    required String grade,
    required String itemId,
    @Default(true) bool isActive,
  }) = _BrickType;

  factory BrickType.fromJson(Map<String, dynamic> json) => _$BrickTypeFromJson(json);
}

@freezed
abstract class Warehouse with _$Warehouse {
  const factory Warehouse({
    required String id,
    required String siteId,
    required String name,
    @Default(true) bool isActive,
  }) = _Warehouse;

  factory Warehouse.fromJson(Map<String, dynamic> json) => _$WarehouseFromJson(json);
}

/// A Sardar's gang.
@freezed
abstract class LabourGroup with _$LabourGroup {
  const factory LabourGroup({
    required String id,
    required String sardarPartyId,
    required String name,
    required String activity,
    String? siteId,
    @Default(true) bool isActive,
  }) = _LabourGroup;

  factory LabourGroup.fromJson(Map<String, dynamic> json) => _$LabourGroupFromJson(json);
}

@freezed
abstract class Worker with _$Worker {
  const factory Worker({
    required String id,
    required String labourGroupId,
    required String name,
    @Default(true) bool isActive,
  }) = _Worker;

  factory Worker.fromJson(Map<String, dynamic> json) => _$WorkerFromJson(json);
}

@freezed
abstract class Vehicle with _$Vehicle {
  const factory Vehicle({
    required String id,
    required String registrationNo,
    @Default(true) bool isActive,
  }) = _Vehicle;

  factory Vehicle.fromJson(Map<String, dynamic> json) => _$VehicleFromJson(json);
}

@freezed
abstract class Driver with _$Driver {
  const factory Driver({required String id, required String name, @Default(true) bool isActive}) =
      _Driver;

  factory Driver.fromJson(Map<String, dynamic> json) => _$DriverFromJson(json);
}
