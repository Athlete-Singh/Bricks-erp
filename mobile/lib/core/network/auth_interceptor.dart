import 'package:brics_mobile/core/network/api_endpoints.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/storage/token_store.dart';
import 'package:dio/dio.dart';

/// Adds the bearer token and, on a 401, refreshes once and replays.
///
/// Refresh is single-flight: refresh tokens rotate (ADR-015), so two requests
/// refreshing in parallel would present a token the first one already
/// revoked, and the second would sign the supervisor out.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.dio,
    required this.refreshDio,
    required this.tokens,
    required this.onSessionExpired,
  });

  final Dio dio;

  /// A bare client for the refresh call, so it never re-enters this interceptor.
  final Dio refreshDio;
  final TokenStore tokens;
  final void Function() onSessionExpired;

  Future<bool>? _refreshing;

  static const _retriedFlag = 'auth.retried';

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final current = await tokens.read();
    if (current != null && !_isAuthCall(options.path)) {
      options.headers['Authorization'] = 'Bearer ${current.accessToken}';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    final unauthorised = err.response?.statusCode == 401;
    if (!unauthorised || _isAuthCall(options.path) || options.extra[_retriedFlag] == true) {
      handler.next(err);
      return;
    }

    final refreshed = await (_refreshing ??= _refresh().whenComplete(() => _refreshing = null));
    if (!refreshed) {
      handler.next(err);
      return;
    }

    try {
      final token = (await tokens.read())?.accessToken;
      options.extra[_retriedFlag] = true;
      options.headers['Authorization'] = 'Bearer $token';
      handler.resolve(await dio.fetch<Object?>(options));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  Future<bool> _refresh() async {
    final current = await tokens.read();
    if (current == null) return false;
    try {
      final response = await refreshDio.post<Object?>(
        ApiEndpoints.refresh,
        data: {'refreshToken': current.refreshToken},
      );
      final data = (response.data! as Map)['data'] as Map;
      await tokens.write(
        AuthTokens(
          accessToken: data['accessToken'] as String,
          refreshToken: data['refreshToken'] as String,
        ),
      );
      return true;
    } on DioException catch (e) {
      // Only a refused refresh ends the session. No signal at the kiln is not
      // a reason to sign anyone out — their unsent entries are still here.
      if (ApiException.fromDio(e).kind == ApiFailureKind.unauthenticated) {
        await tokens.clear();
        onSessionExpired();
      }
      return false;
    }
  }

  static bool _isAuthCall(String path) =>
      path.endsWith(ApiEndpoints.login) || path.endsWith(ApiEndpoints.refresh);
}
