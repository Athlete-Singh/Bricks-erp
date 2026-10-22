import 'dart:async';

import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/features/auth/data/auth_repository.dart';
import 'package:brics_mobile/features/auth/domain/session.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

sealed class AuthState {
  const AuthState();
}

class SignedOut extends AuthState {
  const SignedOut({this.expired = false});

  /// The server ended the session; unsent entries are still on the phone.
  final bool expired;
}

class SignedIn extends AuthState {
  const SignedIn(this.session, {this.siteId});

  final Session session;

  /// The kiln entries are made against. Null until one is chosen.
  final String? siteId;

  SignedIn withSite(String id) => SignedIn(session, siteId: id);
}

final cacheRepositoryProvider = Provider<CacheRepository>(
  (ref) => CacheRepository(ref.watch(databaseProvider), ref.watch(clockProvider)),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    api: ref.watch(apiClientProvider),
    tokens: ref.watch(tokenStoreProvider),
    store: ref.watch(keyValueStoreProvider),
    db: ref.watch(databaseProvider),
    cache: ref.watch(cacheRepositoryProvider),
  ),
);

final sessionControllerProvider = AsyncNotifierProvider<SessionController, AuthState>(
  SessionController.new,
);

class SessionController extends AsyncNotifier<AuthState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<AuthState> build() async {
    final sub = ref.watch(sessionExpiredProvider).stream.listen((_) {
      state = const AsyncData(SignedOut(expired: true));
    });
    ref.onDispose(sub.cancel);

    final session = await _repo.restore();
    if (session == null) return const SignedOut();
    return SignedIn(session, siteId: await _resolveSite(session));
  }

  /// Throws `ApiException` for the screen to explain.
  Future<void> login(String emailOrMobile, String password) async {
    final session = await _repo.login(emailOrMobile, password);
    state = AsyncData(SignedIn(session, siteId: await _resolveSite(session)));
  }

  Future<void> selectSite(String siteId) async {
    final current = state.value;
    if (current is! SignedIn) return;
    await _repo.selectSite(siteId);
    state = AsyncData(current.withSite(siteId));
  }

  Future<void> signOut() async {
    await _repo.logout();
    state = const AsyncData(SignedOut());
  }

  /// The remembered kiln if it is still allowed; the only kiln if there is one.
  Future<String?> _resolveSite(Session session) async {
    final saved = await _repo.selectedSiteId();
    if (saved != null && session.sites.any((s) => s.id == saved)) return saved;
    if (session.sites.length == 1) {
      await _repo.selectSite(session.sites.single.id);
      return session.sites.single.id;
    }
    return null;
  }
}

/// The signed-in session, or null. For screens that only render when signed in.
final currentSessionProvider = Provider<SignedIn?>((ref) {
  final state = ref.watch(sessionControllerProvider).value;
  return state is SignedIn ? state : null;
});

/// Kilns the user may pick: the server's latest list once pulled, else the
/// list from sign-in.
final availableSitesProvider = StreamProvider<List<Site>>((ref) {
  final session = ref.watch(currentSessionProvider)?.session;
  if (session == null) return Stream.value(const []);
  return ref.watch(cacheRepositoryProvider).watch(CacheKind.site).map((rows) {
    if (rows.isEmpty) return session.sites;
    return [
      for (final row in rows)
        if (row['isActive'] != false) Site.fromJson(row),
    ];
  });
});

/// The kiln entries are being made against.
final selectedSiteProvider = Provider<Site?>((ref) {
  final state = ref.watch(currentSessionProvider);
  final siteId = state?.siteId;
  if (siteId == null) return null;
  final sites = ref.watch(availableSitesProvider).value ?? state!.session.sites;
  return sites.where((s) => s.id == siteId).firstOrNull ??
      state!.session.sites.where((s) => s.id == siteId).firstOrNull;
});
