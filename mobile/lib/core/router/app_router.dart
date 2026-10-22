import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/attendance/presentation/attendance_form_screen.dart';
import 'package:brics_mobile/features/attendance/presentation/attendance_screen.dart';
import 'package:brics_mobile/features/auth/presentation/kiln_picker_screen.dart';
import 'package:brics_mobile/features/auth/presentation/login_screen.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/home/presentation/home_screen.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/production/presentation/batch_screen.dart';
import 'package:brics_mobile/features/production/presentation/new_batch_screen.dart';
import 'package:brics_mobile/features/production/presentation/production_screen.dart';
import 'package:brics_mobile/features/production/presentation/stage_form_screen.dart';
import 'package:brics_mobile/features/sync/presentation/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

abstract final class AppRoutes {
  static const splash = '/splash';
  static const login = '/login';
  static const kiln = '/kiln';
  static const home = '/';
  static const sync = '/sync';
  static const production = '/production';
  static const productionNewBatch = '/production/new';
  static String productionBatch(String ref) => '/production/batch/$ref';
  static String productionStage(String ref, String stage) => '/production/batch/$ref/$stage';
  static const attendance = '/attendance';
  static const attendanceNew = '/attendance/new';
  static const grn = '/grn';
  static const dispatch = '/dispatch';
}

/// Where the session says this person may be. Null means "stay".
String? authRedirect(AsyncValue<AuthState> auth, String location) {
  return switch (auth) {
    AsyncData(value: SignedIn(siteId: null)) => location == AppRoutes.kiln ? null : AppRoutes.kiln,
    AsyncData(value: SignedIn()) =>
      location == AppRoutes.login || location == AppRoutes.splash ? AppRoutes.home : null,
    AsyncData(value: SignedOut()) ||
    AsyncError() => location == AppRoutes.login ? null : AppRoutes.login,
    _ => location == AppRoutes.splash ? null : AppRoutes.splash,
  };
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref
    ..listen(sessionControllerProvider, (_, _) => refresh.value++)
    ..onDispose(refresh.dispose);

  final router = GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: refresh,
    redirect: (context, state) =>
        authRedirect(ref.read(sessionControllerProvider), state.matchedLocation),
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (_, _) => const Scaffold(body: AppLoader()),
      ),
      GoRoute(path: AppRoutes.login, builder: (_, _) => const LoginScreen()),
      GoRoute(path: AppRoutes.kiln, builder: (_, _) => const KilnPickerScreen()),
      GoRoute(path: AppRoutes.home, builder: (_, _) => const HomeScreen()),
      GoRoute(path: AppRoutes.sync, builder: (_, _) => const SyncScreen()),
      GoRoute(
        path: AppRoutes.production,
        builder: (_, _) => const ProductionScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (_, state) => NewBatchScreen(editId: state.uri.queryParameters['edit']),
          ),
          GoRoute(
            path: 'batch/:ref',
            builder: (_, state) =>
                BatchScreen(batchRef: BatchRef.decode(state.pathParameters['ref']!)),
            routes: [
              GoRoute(
                path: ':stage',
                builder: (_, state) => StageFormScreen(
                  batchRef: BatchRef.decode(state.pathParameters['ref']!),
                  stage: ProductionStage.parse(state.pathParameters['stage']!)!,
                  editId: state.uri.queryParameters['edit'],
                ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.attendance,
        builder: (_, _) => const AttendanceScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (_, state) => AttendanceFormScreen(editId: state.uri.queryParameters['edit']),
          ),
        ],
      ),
      for (final path in [AppRoutes.grn, AppRoutes.dispatch])
        GoRoute(path: path, builder: (_, _) => const _ComingSoon()),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

class _ComingSoon extends StatelessWidget {
  const _ComingSoon();

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: context.l10n.appTitle,
      body: EmptyView(message: context.l10n.comingSoon),
    );
  }
}
