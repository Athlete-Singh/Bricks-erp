import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/storage/token_store.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_api.dart';
import '../helpers/test_env.dart';

void main() {
  late TestEnv env;

  setUp(() => env = TestEnv());
  tearDown(() => env.dispose());

  test('signing in keeps the session; with one kiln it is chosen for you', () async {
    env.api.on('POST', '/auth/login', (r) {
      expect(r.json, {'emailOrMobile': '9800000001', 'password': 'secret1'});
      return FakeResponse.ok(loginResponse(permissions: ['production.manage']));
    });
    final c = env.container();
    addTearDown(c.dispose);
    await c.read(sessionControllerProvider.future);

    await c.read(sessionControllerProvider.notifier).login(' 9800000001 ', 'secret1');

    final state = c.read(sessionControllerProvider).value! as SignedIn;
    expect(state.siteId, kilnA);
    expect(state.session.user.can('production.manage'), isTrue);
    expect(env.store.values['auth.accessToken'], startsWith('access-'));
  });

  test('the app opens offline from the stored session', () async {
    env.api.on('POST', '/auth/login', (_) => FakeResponse.ok(loginResponse(sites: [kilnA, kilnB])));
    final first = env.container();
    await first.read(sessionControllerProvider.future);
    await first.read(sessionControllerProvider.notifier).login('9800000001', 'secret1');
    expect(
      (first.read(sessionControllerProvider).value! as SignedIn).siteId,
      isNull,
      reason: 'two kilns: ask',
    );
    await first.read(sessionControllerProvider.notifier).selectSite(kilnB);
    first.dispose();

    env.api.offline = true;
    final second = env.container();
    addTearDown(second.dispose);
    final restored = await second.read(sessionControllerProvider.future);

    expect(restored, isA<SignedIn>().having((s) => s.siteId, 'kiln', kilnB));
  });

  test("a different person signing in gets none of the last company's cache", () async {
    final c = env.container();
    addTearDown(c.dispose);
    await c.read(sessionControllerProvider.future);
    env.api.on('POST', '/auth/login', (_) => FakeResponse.ok(loginResponse()));
    await c.read(sessionControllerProvider.notifier).login('a', 'secret1');
    await c.read(cacheRepositoryProvider).put(CacheKind.party, {'id': 'p1', 'name': 'X'});

    env.api.on(
      'POST',
      '/auth/login',
      (_) => FakeResponse.ok(loginResponse(userId: '00000000-0000-4000-8000-000000000002')),
    );
    await c.read(sessionControllerProvider.notifier).login('b', 'secret1');

    expect(await c.read(cacheRepositoryProvider).all(CacheKind.party), isEmpty);
  });

  test('a refused refresh signs out but keeps unsent entries', () async {
    env.api
      ..on('POST', '/auth/login', (_) => FakeResponse.ok(loginResponse()))
      ..on('GET', '/sites', (_) => FakeResponse.error(401, 'UNAUTHORIZED'))
      ..on('POST', '/auth/refresh', (_) => FakeResponse.error(401, 'UNAUTHORIZED'));
    env.connectivity.online = false;
    final c = env.container();
    addTearDown(c.dispose);
    await c.read(sessionControllerProvider.future);
    await c.read(sessionControllerProvider.notifier).login('a', 'secret1');
    final session = (c.read(sessionControllerProvider).value! as SignedIn).session;
    await c
        .read(queueRepositoryProvider)
        .enqueue(
          QueueDraft(
            entity: QueueEntity.dispatch,
            method: 'POST',
            path: '/dispatches',
            payload: {},
            title: 't',
          ),
          QueueOwner(userId: session.user.id, companyId: companyId),
        );

    await c.read(masterSyncServiceProvider).pull(c.read(pullSpecsProvider), can: (_) => true);
    await Future<void>.delayed(Duration.zero);

    expect(
      c.read(sessionControllerProvider).value,
      isA<SignedOut>().having((s) => s.expired, 'expired', isTrue),
    );
    expect(await c.read(queueRepositoryProvider).unsentCount(session.user.id), 1);
    expect(await TokenStore(env.store).read(), isNull);
  });

  test('signing out wipes the phone', () async {
    env.api
      ..on('POST', '/auth/login', (_) => FakeResponse.ok(loginResponse()))
      ..on('POST', '/auth/logout', (_) => FakeResponse.ok(null));
    final c = env.container();
    addTearDown(c.dispose);
    await c.read(sessionControllerProvider.future);
    await c.read(sessionControllerProvider.notifier).login('a', 'secret1');

    await c.read(sessionControllerProvider.notifier).signOut();

    expect(c.read(sessionControllerProvider).value, isA<SignedOut>());
    expect(await env.db.readState('site.selected'), isNull);
    expect(env.store.values.containsKey('auth.session'), isFalse);
  });

  group('authRedirect', () {
    const signedOut = AsyncData<AuthState>(SignedOut());
    test('sends a signed-out person to sign in', () {
      expect(authRedirect(signedOut, AppRoutes.home), AppRoutes.login);
      expect(authRedirect(signedOut, AppRoutes.login), isNull);
    });

    test('asks for a kiln before anything else', () {
      expect(authRedirect(const AsyncLoading(), AppRoutes.home), AppRoutes.splash);
    });
  });
}
