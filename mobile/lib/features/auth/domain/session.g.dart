// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'session.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AuthUser _$AuthUserFromJson(Map<String, dynamic> json) => _AuthUser(
  id: json['id'] as String,
  name: json['name'] as String,
  mobile: json['mobile'] as String,
  roleCode: json['roleCode'] as String,
  permissions:
      (json['permissions'] as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
  isSuperAdmin: json['isSuperAdmin'] as bool? ?? false,
  email: json['email'] as String?,
);

Map<String, dynamic> _$AuthUserToJson(_AuthUser instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'mobile': instance.mobile,
  'roleCode': instance.roleCode,
  'permissions': instance.permissions,
  'isSuperAdmin': instance.isSuperAdmin,
  'email': ?instance.email,
};

_Company _$CompanyFromJson(Map<String, dynamic> json) => _Company(
  id: json['id'] as String,
  name: json['name'] as String,
  gstin: json['gstin'] as String?,
);

Map<String, dynamic> _$CompanyToJson(_Company instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'gstin': ?instance.gstin,
};

_Site _$SiteFromJson(Map<String, dynamic> json) => _Site(
  id: json['id'] as String,
  name: json['name'] as String,
  code: json['code'] as String,
  type: json['type'] as String? ?? 'kiln',
);

Map<String, dynamic> _$SiteToJson(_Site instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'code': instance.code,
  'type': instance.type,
};

_Session _$SessionFromJson(Map<String, dynamic> json) => _Session(
  user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
  company: Company.fromJson(json['company'] as Map<String, dynamic>),
  sites:
      (json['sites'] as List<dynamic>?)
          ?.map((e) => Site.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <Site>[],
);

Map<String, dynamic> _$SessionToJson(_Session instance) => <String, dynamic>{
  'user': instance.user.toJson(),
  'company': instance.company.toJson(),
  'sites': instance.sites.map((e) => e.toJson()).toList(),
};
