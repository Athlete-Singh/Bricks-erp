import 'package:brics_mobile/core/network/api_client.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/network/auth_interceptor.dart';
import 'package:brics_mobile/core/storage/key_value_store.dart';
import 'package:brics_mobile/core/storage/token_store.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_api.dart';

void main() {
  late FakeApi api;
  late TokenStore tokens;
  late ApiClient client;
  var expired = 0;

  setUp(() async {
    api = FakeApi();
    tokens = TokenStore(MemoryKeyValueStore());
    await tokens.write(const AuthTokens(accessToken: 'old', refreshToken: 'r1'));
    expired = 0;
    final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))..httpClientAdapter = api;
    final refreshDio = Dio(BaseOptions(baseUrl: 'http://api.test'))..httpClientAdapter = api;
    dio.interceptors.add(
      AuthInterceptor(
        dio: dio,
        refreshDio: refreshDio,
        tokens: tokens,
        onSessionExpired: () => expired++,
      ),
    );
    client = ApiClient(dio);
  });

  test('unwraps the envelope and keeps meta', () async {
    api.on(
      'GET',
      '/parties',
      (_) => FakeResponse.ok(
        [
          {'id': 'p1'},
        ],
        meta: {'total': 1},
      ),
    );
    final envelope = await client.get('/parties', query: {'since': null, 'page': 1});
    expect(envelope.list.single['id'], 'p1');
    expect(envelope.meta?['total'], 1);
    expect(api.requests.single.query, {'page': 1}, reason: 'null query values are dropped');
  });

  test('sends the bearer token and the Idempotency-Key', () async {
    api.on('POST', '/production/batches', (_) => FakeResponse.ok({'id': 'b1'}, status: 201));
    await client.post('/production/batches', body: {'chamber': '3'}, idempotencyKey: 'uuid-1');
    final request = api.requests.single;
    expect(request.header('Authorization'), 'Bearer old');
    expect(request.header(ApiClient.idempotencyHeader), 'uuid-1');
  });

  test('maps the backend error contract, with field errors', () async {
    api.on('POST', '/dispatches', (_) {
      return const FakeResponse(400, {
        'error': {
          'code': 'VALIDATION_FAILED',
          'message': 'Validation failed',
          'details': [
            {'field': 'lines', 'message': 'A challan needs at least one line'},
          ],
        },
      });
    });
    await expectLater(
      client.post('/dispatches', body: {}),
      throwsA(
        isA<ApiException>()
            .having((e) => e.kind, 'kind', ApiFailureKind.rejected)
            .having((e) => e.code, 'code', 'VALIDATION_FAILED')
            .having((e) => e.fieldErrors['lines'], 'field', isNotNull)
            .having((e) => e.isTransient, 'transient', isFalse),
      ),
    );
  });

  test('no signal and server errors are transient', () async {
    api.offline = true;
    await expectLater(
      client.get('/sites'),
      throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiFailureKind.network)),
    );
    api
      ..offline = false
      ..on('GET', '/sites', (_) => FakeResponse.error(503, 'UNAVAILABLE'));
    await expectLater(
      client.get('/sites'),
      throwsA(isA<ApiException>().having((e) => e.isTransient, 'transient', isTrue)),
    );
  });

  test('a 401 refreshes once for parallel requests, then replays each', () async {
    api
      ..on('GET', '/auth/me', (r) {
        return r.header('Authorization') == 'Bearer new'
            ? FakeResponse.ok({'ok': true})
            : FakeResponse.error(401, 'UNAUTHORIZED');
      })
      ..on('POST', '/auth/refresh', (r) {
        expect(r.json['refreshToken'], 'r1');
        return FakeResponse.ok({'accessToken': 'new', 'refreshToken': 'r2'});
      });

    await Future.wait([client.get('/auth/me'), client.get('/auth/me'), client.get('/auth/me')]);

    expect(api.sent('POST', '/auth/refresh'), hasLength(1));
    expect((await tokens.read())?.refreshToken, 'r2');
    expect(expired, 0);
  });

  test('a refused refresh ends the session; no signal does not', () async {
    api
      ..on('GET', '/auth/me', (_) => FakeResponse.error(401, 'UNAUTHORIZED'))
      ..on('POST', '/auth/refresh', (_) => FakeResponse.error(401, 'UNAUTHORIZED'));
    await expectLater(client.get('/auth/me'), throwsA(isA<ApiException>()));
    expect(expired, 1);
    expect(await tokens.read(), isNull);
  });
}
