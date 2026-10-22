import 'package:brics_mobile/features/attendance/presentation/attendance_form_screen.dart';
import 'package:brics_mobile/features/attendance/presentation/attendance_screen.dart';
import 'package:brics_mobile/features/auth/presentation/kiln_picker_screen.dart';
import 'package:brics_mobile/features/auth/presentation/login_screen.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/auth/presentation/splash_screen.dart';
import 'package:brics_mobile/features/dispatch/presentation/challan_action_screen.dart';
import 'package:brics_mobile/features/dispatch/presentation/challan_form_screen.dart';
import 'package:brics_mobile/features/dispatch/presentation/challan_screen.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_screen.dart';
import 'package:brics_mobile/features/grn/presentation/grn_form_screen.dart';
import 'package:brics_mobile/features/grn/presentation/grn_screen.dart';
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
  static const grnNew = '/grn/new';
  static const dispatch = '/dispatch';
  static const dispatchNew = '/dispatch/new';
  static String dispatchChallan(String ref) => '/dispatch/challan/$ref';
  static String dispatchAction(String ref, String action) => '/dispatch/challan/$ref/$action';
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
      GoRoute(path: AppRoutes.splash, builder: (_, _) => const SplashScreen()),
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
      GoRoute(
        path: AppRoutes.grn,
        builder: (_, _) => const GrnScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (_, state) => GrnFormScreen(editId: state.uri.queryParameters['edit']),
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.dispatch,
        builder: (_, _) => const DispatchScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (_, state) => ChallanFormScreen(editId: state.uri.queryParameters['edit']),
          ),
          GoRoute(
            path: 'challan/:ref',
            builder: (_, state) =>
                ChallanScreen(challanRef: RecordRef.decode(state.pathParameters['ref']!)),
            routes: [
              GoRoute(
                path: ':action',
                builder: (_, state) => ChallanActionScreen(
                  challanRef: RecordRef.decode(state.pathParameters['ref']!),
                  action: ChallanAction.parse(state.pathParameters['action']!)!,
                  editId: state.uri.queryParameters['edit'],
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
