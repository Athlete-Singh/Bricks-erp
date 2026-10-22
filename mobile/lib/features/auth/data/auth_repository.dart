import 'dart:convert';

import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/storage/key_value_store.dart';
import 'package:brics_mobile/core/storage/token_store.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/features/auth/domain/session.dart';

class AuthRepository {
  AuthRepository({
    required this.api,
    required this.tokens,
    required this.store,
    required this.db,
    required this.cache,
  });

  final ApiClient api;
  final TokenStore tokens;
  final KeyValueStore store;
  final AppDatabase db;
  final CacheRepository cache;

  static const _sessionKey = 'auth.session';
  static const _lastLoginKey = 'auth.lastLogin';
  static const _ownerKey = 'session.userId';
  static const _siteKey = 'site.selected';

  /// Signing in needs the network once; after that the app opens offline.
  Future<Session> login(String emailOrMobile, String password) async {
    final data = (await api.post(
      ApiEndpoints.login,
      body: {'emailOrMobile': emailOrMobile.trim(), 'password': password},
    )).map;
    final session = Session.fromJson(data);
    await tokens.write(
      AuthTokens(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      ),
    );
    await store.write(_sessionKey, jsonEncode(session.toJson()));
    await store.write(_lastLoginKey, emailOrMobile.trim());

    // Someone else signing in on this phone gets none of the last person's
    // cached company data. Their unsent entries stay, and only ever go out
    // with their own token (the queue is filtered by author).
    final previous = await db.readState(_ownerKey);
    if (previous != session.user.id) {
      await cache.clear();
      await db.delete(db.appState).go();
      await db.writeState(_ownerKey, session.user.id);
    }
    return session;
  }

  /// The last session on this phone, if its tokens are still here. No network needed.
  Future<Session?> restore() async {
    if (await tokens.read() == null) return null;
    final raw = await store.read(_sessionKey);
    if (raw == null) return null;
    try {
      return Session.fromJson((jsonDecode(raw) as Map).cast<String, dynamic>());
    } on FormatException {
      return null;
    }
  }

  Future<String?> lastLogin() => store.read(_lastLoginKey);

  Future<String?> selectedSiteId() => db.readState(_siteKey);

  Future<void> selectSite(String siteId) => db.writeState(_siteKey, siteId);

  /// Signs out on the server if it can, and always on the phone. Everything
  /// local goes — the caller has already warned about unsent entries.
  Future<void> logout() async {
    try {
      await api.post(ApiEndpoints.logout);
    } on ApiException {
      // Offline or already expired: the refresh token dies with the phone's copy.
    }
    await tokens.clear();
    await store.delete(_sessionKey);
    await db.wipe();
  }
}
