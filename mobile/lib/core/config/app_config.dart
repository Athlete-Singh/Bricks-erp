import 'package:flutter/foundation.dart';

/// Build-time configuration, passed with `--dart-define-from-file=env/<env>.json`.
/// The deployed development API (Vercel, development database).
const devApiBaseUrl = 'https://bhatta-erp-backend.vercel.app/api/v1';

class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  /// Debug builds fall back to the deployed dev API. A release build has no
  /// fallback: one built without `API_BASE_URL` must say so, not quietly talk
  /// to the wrong server (scripts/build_release.sh refuses it).
  factory AppConfig.fromEnvironment() {
    const url = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: kReleaseMode ? '' : devApiBaseUrl,
    );
    return const AppConfig(apiBaseUrl: url);
  }

  final String apiBaseUrl;

  bool get hasServer => apiBaseUrl.isNotEmpty;
}
