import 'package:connectivity_plus/connectivity_plus.dart';

/// Whether the phone has *a* network. Not proof the API is reachable — a
/// failed send still decides that — but enough to know when to try again.
abstract interface class ConnectivityWatcher {
  Future<bool> check();
  Stream<bool> watch();
}

class PlatformConnectivityWatcher implements ConnectivityWatcher {
  PlatformConnectivityWatcher([Connectivity? connectivity])
    : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  static bool _online(List<ConnectivityResult> results) =>
      results.any((r) => r != ConnectivityResult.none);

  @override
  Future<bool> check() async => _online(await _connectivity.checkConnectivity());

  @override
  Stream<bool> watch() => _connectivity.onConnectivityChanged.map(_online).distinct();
}
