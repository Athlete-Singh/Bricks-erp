import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

abstract final class AppRoutes {
  static const home = '/';
}

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    routes: [GoRoute(path: AppRoutes.home, builder: (context, state) => const _Placeholder())],
  );
  ref.onDispose(router.dispose);
  return router;
});

class _Placeholder extends StatelessWidget {
  const _Placeholder();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AppScaffold(
      title: l10n.appTitle,
      body: EmptyView(message: l10n.appSubtitle),
    );
  }
}
