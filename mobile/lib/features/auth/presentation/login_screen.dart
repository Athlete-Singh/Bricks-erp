import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _id = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  bool _suspended = false;

  @override
  void initState() {
    super.initState();
    ref.read(authRepositoryProvider).lastLogin().then((last) {
      if (mounted && last != null && _id.text.isEmpty) _id.text = last;
    }).ignore();
  }

  @override
  void dispose() {
    _id.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    final l10n = context.l10n;
    if (!ref.read(appConfigProvider).hasServer) {
      setState(() => _error = l10n.loginNoServer);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _suspended = false;
    });
    try {
      await ref.read(sessionControllerProvider.notifier).login(_id.text, _password.text);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        // PLT-06: a suspended company is not a wrong password — say who to call.
        _suspended = e.message == suspendedTenantMessage;
        _error = switch (e.kind) {
          ApiFailureKind.network || ApiFailureKind.timeout => l10n.loginNoConnection,
          ApiFailureKind.server => l10n.errorServer,
          _ => e.message,
        };
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final validators = Validators(l10n);
    final state = ref.watch(sessionControllerProvider).value;
    final expired = state is SignedOut && state.expired;

    return Scaffold(
      backgroundColor: colors.background,
      body: Stack(
        children: [
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.xl,
                  AppSpacing.lg,
                  AppSpacing.xl,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(child: AnimatedBricsLogo(size: 56)),
                      const SizedBox(height: AppSpacing.md),
                      Entrance(
                        index: 2,
                        child: Column(
                          children: [
                            Text(
                              l10n.appTitle,
                              textAlign: TextAlign.center,
                              style: text.headlineSmall?.copyWith(letterSpacing: 2),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              l10n.loginTagline,
                              textAlign: TextAlign.center,
                              style: text.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      Entrance(
                        index: 4,
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          decoration: BoxDecoration(
                            color: colors.surface,
                            borderRadius: BorderRadius.circular(AppRadius.card),
                            border: Border.all(color: colors.border),
                          ),
                          child: Form(
                            key: _form,
                            child: AutofillGroup(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(l10n.loginWelcome, style: text.titleLarge),
                                  const SizedBox(height: 2),
                                  Text(l10n.loginWelcomeHint, style: text.bodySmall),
                                  const SizedBox(height: AppSpacing.lg),
                                  if (expired) ...[
                                    _Notice(
                                      tone: Tone.warning,
                                      icon: Icons.lock_clock,
                                      message: l10n.loginSessionExpired,
                                    ),
                                    const SizedBox(height: AppSpacing.md),
                                  ],
                                  AppTextField(
                                    label: l10n.loginIdLabel,
                                    controller: _id,
                                    prefixIcon: Icons.person_outline_rounded,
                                    autofillHints: const [AutofillHints.username],
                                    textInputAction: TextInputAction.next,
                                    validator: validators.required,
                                  ),
                                  AppTextField(
                                    label: l10n.loginPasswordLabel,
                                    controller: _password,
                                    kind: AppFieldKind.password,
                                    prefixIcon: Icons.lock_outline_rounded,
                                    autofillHints: const [AutofillHints.password],
                                    textInputAction: TextInputAction.done,
                                    onSubmitted: (_) => _submit(),
                                    validator: validators.required,
                                  ),
                                  AnimatedSize(
                                    duration: AppMotion.medium,
                                    curve: AppMotion.enter,
                                    child: _error == null
                                        ? const SizedBox(width: double.infinity)
                                        : Padding(
                                            padding: const EdgeInsets.only(bottom: AppSpacing.md),
                                            child: _Notice(
                                              tone: Tone.danger,
                                              icon: _suspended
                                                  ? Icons.pause_circle_rounded
                                                  : Icons.error_outline_rounded,
                                              title: _suspended ? l10n.loginSuspendedTitle : null,
                                              message: _error!,
                                            ),
                                          ),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  AppButton(
                                    label: l10n.loginButton,
                                    icon: Icons.arrow_forward_rounded,
                                    onPressed: _submit,
                                    busy: _busy,
                                  ),
                                  const SizedBox(height: AppSpacing.md),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.wifi_off_rounded,
                                        size: 16,
                                        color: colors.mutedForeground,
                                      ),
                                      const SizedBox(width: AppSpacing.sm),
                                      Expanded(
                                        child: Text(l10n.loginNeedsNetwork, style: text.bodySmall),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.tone, required this.icon, required this.message, this.title});

  final Tone tone;
  final IconData icon;
  final String message;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final (fg, bg) = tone.of(context.colors);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: fg.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: fg),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null) Text(title!, style: text.titleSmall?.copyWith(color: fg)),
                Text(message, style: text.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
