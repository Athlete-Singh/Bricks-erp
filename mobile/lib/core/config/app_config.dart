/// Build-time configuration, passed with `--dart-define-from-file=env/<env>.json`.
class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  factory AppConfig.fromEnvironment() {
    const url = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:4000/api/v1');
    return const AppConfig(apiBaseUrl: url);
  }

  final String apiBaseUrl;
}
