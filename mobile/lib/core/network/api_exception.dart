import 'package:dio/dio.dart';

/// How the sync queue should treat a failure. The split is the whole of the
/// conflict policy (docs/09-offline-sync.md): retry what the network caused,
/// stop on what the server refused.
enum ApiFailureKind {
  /// No response at all — offline, DNS, connection refused.
  network,

  /// Sent, but no answer in time. The server may have committed it, which is
  /// exactly why every create carries an Idempotency-Key.
  timeout,

  /// 5xx or 429 — the server's problem, worth retrying.
  server,

  /// 401 after a refresh attempt — the person must sign in again.
  unauthenticated,

  /// 403 — this role may not do this.
  forbidden,

  /// Any other 4xx — the server read the entry and refused it.
  rejected,
}

/// The backend's error contract `{ error: { code, message, details } }`, plus
/// the transport failures the backend never gets to describe.
class ApiException implements Exception {
  const ApiException({
    required this.kind,
    required this.code,
    required this.message,
    this.status,
    this.fieldErrors = const {},
  });

  factory ApiException.fromDio(DioException e) {
    const timeouts = {
      DioExceptionType.connectionTimeout,
      DioExceptionType.sendTimeout,
      DioExceptionType.receiveTimeout,
    };
    if (timeouts.contains(e.type)) {
      return const ApiException(
        kind: ApiFailureKind.timeout,
        code: 'TIMEOUT',
        message: 'Timed out',
      );
    }
    final response = e.response;
    if (response == null) {
      return ApiException(
        kind: ApiFailureKind.network,
        code: 'NETWORK',
        message: e.message ?? 'No connection',
      );
    }
    return ApiException.fromResponse(response.statusCode ?? 0, response.data);
  }

  factory ApiException.fromResponse(int status, Object? body) {
    var code = 'HTTP_$status';
    var message = 'Request failed ($status)';
    final fields = <String, String>{};
    if (body is Map && body['error'] is Map) {
      final error = body['error'] as Map;
      if (error['code'] is String) code = error['code'] as String;
      if (error['message'] is String) message = error['message'] as String;
      final details = error['details'];
      if (details is List) {
        for (final d in details.whereType<Map<dynamic, dynamic>>()) {
          final field = d['field'];
          final msg = d['message'];
          if (field is String && msg is String) fields[field] = msg;
        }
      }
    }
    final kind = switch (status) {
      401 => ApiFailureKind.unauthenticated,
      403 => ApiFailureKind.forbidden,
      429 || >= 500 => ApiFailureKind.server,
      _ => ApiFailureKind.rejected,
    };
    return ApiException(
      kind: kind,
      code: code,
      message: message,
      status: status,
      fieldErrors: fields,
    );
  }

  final ApiFailureKind kind;
  final String code;
  final String message;
  final int? status;
  final Map<String, String> fieldErrors;

  /// Worth sending again later without anyone changing the entry.
  bool get isTransient =>
      kind == ApiFailureKind.network ||
      kind == ApiFailureKind.timeout ||
      kind == ApiFailureKind.server;

  @override
  String toString() => 'ApiException($kind, $status, $code: $message)';
}
