import 'package:freezed_annotation/freezed_annotation.dart';

part 'session.freezed.dart';
part 'session.g.dart';

@freezed
abstract class AuthUser with _$AuthUser {
  const factory AuthUser({
    required String id,
    required String name,
    required String mobile,
    required String roleCode,
    @Default(<String>[]) List<String> permissions,
    @Default(false) bool isSuperAdmin,
    String? email,
  }) = _AuthUser;

  const AuthUser._();

  factory AuthUser.fromJson(Map<String, dynamic> json) => _$AuthUserFromJson(json);

  bool can(String permission) => isSuperAdmin || permissions.contains(permission);
}

@freezed
abstract class Company with _$Company {
  const factory Company({required String id, required String name, String? gstin}) = _Company;

  factory Company.fromJson(Map<String, dynamic> json) => _$CompanyFromJson(json);
}

/// A kiln (or other site) the user may work at.
@freezed
abstract class Site with _$Site {
  const factory Site({
    required String id,
    required String name,
    required String code,
    @Default('kiln') String type,
  }) = _Site;

  factory Site.fromJson(Map<String, dynamic> json) => _$SiteFromJson(json);
}

/// What `/auth/login` returns, minus the tokens (those live in `TokenStore`).
@freezed
abstract class Session with _$Session {
  const factory Session({
    required AuthUser user,
    required Company company,
    @Default(<Site>[]) List<Site> sites,
  }) = _Session;

  factory Session.fromJson(Map<String, dynamic> json) => _$SessionFromJson(json);
}
