import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

class RecordedRequest {
  RecordedRequest(this.options);

  final RequestOptions options;

  String get method => options.method;
  String get path => options.path;
  Map<String, dynamic> get query => options.queryParameters;
  Object? get body => options.data;
  Map<String, dynamic> get json => (options.data! as Map).cast<String, dynamic>();
  String? header(String name) => options.headers[name]?.toString();
}

class FakeResponse {
  const FakeResponse(this.status, this.body);

  factory FakeResponse.ok(Object? data, {Map<String, dynamic>? meta, int status = 200}) =>
      FakeResponse(status, {'data': data, 'meta': ?meta});

  factory FakeResponse.error(int status, String code, [String message = 'Refused']) =>
      FakeResponse(status, {
        'error': {'code': code, 'message': message},
      });

  final int status;
  final Object? body;
}

typedef FakeHandler = FutureOr<FakeResponse> Function(RecordedRequest request);

/// An in-memory backend for dio. Routes are `METHOD path` with `*` matching one
/// path segment. Simulates the two field failures that matter: no network at
/// all, and a response lost after the server already committed.
class FakeApi implements HttpClientAdapter {
  final List<RecordedRequest> requests = [];
  final List<(String, RegExp, FakeHandler)> _routes = [];

  /// Every request fails as if there were no signal.
  bool offline = false;

  /// The next N matching requests run the handler, then time out — the server
  /// did the work but the phone never heard back.
  int dropResponses = 0;

  void on(String method, String path, FakeHandler handler) {
    final pattern = RegExp('^${RegExp.escape(path).replaceAll(r'\*', '[^/]+')}\$');
    _routes.insert(0, (method, pattern, handler));
  }

  List<RecordedRequest> sent(String method, String pathPrefix) =>
      requests.where((r) => r.method == method && r.path.startsWith(pathPrefix)).toList();

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (offline) {
      throw DioException.connectionError(requestOptions: options, reason: 'offline');
    }
    final request = RecordedRequest(options);
    requests.add(request);
    final route = _routes
        .where((r) => r.$1 == options.method && r.$2.hasMatch(options.path))
        .firstOrNull;
    final response = route == null
        ? FakeResponse.error(
            404,
            'NOT_FOUND',
            'No fake route for ${options.method} ${options.path}',
          )
        : await route.$3(request);
    if (dropResponses > 0) {
      dropResponses--;
      throw DioException(requestOptions: options, type: DioExceptionType.receiveTimeout);
    }
    return ResponseBody.fromString(
      jsonEncode(response.body),
      response.status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
