// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'masters.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Party _$PartyFromJson(Map<String, dynamic> json) => _Party(
  id: json['id'] as String,
  name: json['name'] as String,
  partyTypes:
      (json['partyTypes'] as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$PartyToJson(_Party instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'partyTypes': instance.partyTypes,
  'isActive': instance.isActive,
};

_Unit _$UnitFromJson(Map<String, dynamic> json) => _Unit(
  id: json['id'] as String,
  name: json['name'] as String,
  abbreviation: json['abbreviation'] as String,
);

Map<String, dynamic> _$UnitToJson(_Unit instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'abbreviation': instance.abbreviation,
};

_Item _$ItemFromJson(Map<String, dynamic> json) => _Item(
  id: json['id'] as String,
  name: json['name'] as String,
  category: json['category'] as String,
  unitId: json['unitId'] as String,
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$ItemToJson(_Item instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'category': instance.category,
  'unitId': instance.unitId,
  'isActive': instance.isActive,
};

_BrickType _$BrickTypeFromJson(Map<String, dynamic> json) => _BrickType(
  id: json['id'] as String,
  grade: json['grade'] as String,
  itemId: json['itemId'] as String,
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$BrickTypeToJson(_BrickType instance) => <String, dynamic>{
  'id': instance.id,
  'grade': instance.grade,
  'itemId': instance.itemId,
  'isActive': instance.isActive,
};

_Warehouse _$WarehouseFromJson(Map<String, dynamic> json) => _Warehouse(
  id: json['id'] as String,
  siteId: json['siteId'] as String,
  name: json['name'] as String,
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$WarehouseToJson(_Warehouse instance) => <String, dynamic>{
  'id': instance.id,
  'siteId': instance.siteId,
  'name': instance.name,
  'isActive': instance.isActive,
};

_LabourGroup _$LabourGroupFromJson(Map<String, dynamic> json) => _LabourGroup(
  id: json['id'] as String,
  sardarPartyId: json['sardarPartyId'] as String,
  name: json['name'] as String,
  activity: json['activity'] as String,
  siteId: json['siteId'] as String?,
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$LabourGroupToJson(_LabourGroup instance) => <String, dynamic>{
  'id': instance.id,
  'sardarPartyId': instance.sardarPartyId,
  'name': instance.name,
  'activity': instance.activity,
  'siteId': ?instance.siteId,
  'isActive': instance.isActive,
};

_Worker _$WorkerFromJson(Map<String, dynamic> json) => _Worker(
  id: json['id'] as String,
  labourGroupId: json['labourGroupId'] as String,
  name: json['name'] as String,
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$WorkerToJson(_Worker instance) => <String, dynamic>{
  'id': instance.id,
  'labourGroupId': instance.labourGroupId,
  'name': instance.name,
  'isActive': instance.isActive,
};

_Vehicle _$VehicleFromJson(Map<String, dynamic> json) => _Vehicle(
  id: json['id'] as String,
  registrationNo: json['registrationNo'] as String,
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$VehicleToJson(_Vehicle instance) => <String, dynamic>{
  'id': instance.id,
  'registrationNo': instance.registrationNo,
  'isActive': instance.isActive,
};

_Driver _$DriverFromJson(Map<String, dynamic> json) => _Driver(
  id: json['id'] as String,
  name: json['name'] as String,
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$DriverToJson(_Driver instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'isActive': instance.isActive,
};
