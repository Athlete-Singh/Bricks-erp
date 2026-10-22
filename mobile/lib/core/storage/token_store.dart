import 'package:brics_mobile/core/storage/key_value_store.dart';

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;
}

/// The token pair, mirrored in memory so every request does not hit the keychain.
class TokenStore {
  TokenStore(this._store);

  final KeyValueStore _store;
  AuthTokens? _cached;
  bool _loaded = false;

  static const _accessKey = 'auth.accessToken';
  static const _refreshKey = 'auth.refreshToken';

  Future<AuthTokens?> read() async {
    if (_loaded) return _cached;
    final access = await _store.read(_accessKey);
    final refresh = await _store.read(_refreshKey);
    _cached = access != null && refresh != null
        ? AuthTokens(accessToken: access, refreshToken: refresh)
        : null;
    _loaded = true;
    return _cached;
  }

  Future<void> write(AuthTokens tokens) async {
    _cached = tokens;
    _loaded = true;
    await _store.write(_accessKey, tokens.accessToken);
    await _store.write(_refreshKey, tokens.refreshToken);
  }

  Future<void> clear() async {
    _cached = null;
    _loaded = true;
    await _store.delete(_accessKey);
    await _store.delete(_refreshKey);
  }
}
