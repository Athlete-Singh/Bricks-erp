import 'package:flutter/foundation.dart';

/// Build-time configuration, passed with `--dart-define-from-file=env/<env>.json`.
class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  /// Debug builds fall back to the local API as the Android emulator sees it.
  /// A release build has no fallback: one built without `API_BASE_URL` must
  /// say so, not quietly talk to nobody (scripts/build_release.sh refuses it).
  factory AppConfig.fromEnvironment() {
    const url = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: kReleaseMode ? '' : 'http://10.0.2.2:4000/api/v1',
    );
    return const AppConfig(apiBaseUrl: url);
  }

  final String apiBaseUrl;

  bool get hasServer => apiBaseUrl.isNotEmpty;
}
