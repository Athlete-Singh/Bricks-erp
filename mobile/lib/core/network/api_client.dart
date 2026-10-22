import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:dio/dio.dart';

/// `{ data, meta? }` — the backend envelope (ADR-017).
class ApiEnvelope {
  const ApiEnvelope({required this.data, this.meta});

  final Object? data;
  final Map<String, dynamic>? meta;

  Map<String, dynamic> get map => (data! as Map).cast<String, dynamic>();

  List<Map<String, dynamic>> get list => (data! as List)
      .whereType<Map<dynamic, dynamic>>()
      .map((e) => e.cast<String, dynamic>())
      .toList();
}

/// Thin wrapper over dio: unwraps the envelope and turns every failure into an
/// [ApiException]. Repositories call this, never dio.
class ApiClient {
  ApiClient(this.dio);

  final Dio dio;

  static const idempotencyHeader = 'Idempotency-Key';

  Future<ApiEnvelope> get(String path, {Map<String, Object?>? query}) {
    return _send(() => dio.get<Object?>(path, queryParameters: _clean(query)));
  }

  Future<ApiEnvelope> send(String method, String path, {Object? body, String? idempotencyKey}) {
    return _send(
      () => dio.request<Object?>(
        path,
        data: body,
        options: Options(
          method: method,
          headers: idempotencyKey == null ? null : {idempotencyHeader: idempotencyKey},
        ),
      ),
    );
  }

  Future<ApiEnvelope> post(String path, {Object? body, String? idempotencyKey}) =>
      send('POST', path, body: body, idempotencyKey: idempotencyKey);

  Future<ApiEnvelope> _send(Future<Response<Object?>> Function() call) async {
    try {
      final response = await call();
      final body = response.data;
      if (body is Map && body.containsKey('data')) {
        final meta = body['meta'];
        return ApiEnvelope(
          data: body['data'],
          meta: meta is Map ? meta.cast<String, dynamic>() : null,
        );
      }
      return ApiEnvelope(data: body);
    } on DioException catch (e) {
      final inner = e.error;
      if (inner is ApiException) throw inner;
      throw ApiException.fromDio(e);
    }
  }

  static Map<String, Object?>? _clean(Map<String, Object?>? query) {
    if (query == null) return null;
    return {
      for (final entry in query.entries)
        if (entry.value != null) entry.key: entry.value,
    };
  }
}
