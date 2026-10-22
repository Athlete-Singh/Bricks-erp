import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/network/api_exception.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _form,
                child: AutofillGroup(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Icon(Icons.factory_outlined, size: 56, color: colors.primary),
                      const SizedBox(height: AppSpacing.md),
                      Text(l10n.appTitle, textAlign: TextAlign.center, style: text.displaySmall),
                      Text(l10n.appSubtitle, textAlign: TextAlign.center, style: text.titleMedium),
                      const SizedBox(height: AppSpacing.xl),
                      if (expired) ...[
                        _Notice(
                          color: colors.warning,
                          icon: Icons.lock_clock,
                          message: l10n.loginSessionExpired,
                        ),
                        const SizedBox(height: AppSpacing.lg),
                      ],
                      AppTextField(
                        label: l10n.loginIdLabel,
                        controller: _id,
                        autofillHints: const [AutofillHints.username],
                        textInputAction: TextInputAction.next,
                        validator: validators.required,
                      ),
                      AppTextField(
                        label: l10n.loginPasswordLabel,
                        controller: _password,
                        kind: AppFieldKind.password,
                        autofillHints: const [AutofillHints.password],
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _submit(),
                        validator: validators.required,
                      ),
                      if (_error != null) ...[
                        _Notice(
                          color: colors.danger,
                          icon: _suspended ? Icons.pause_circle : Icons.error_outline,
                          title: _suspended ? l10n.loginSuspendedTitle : null,
                          message: _error!,
                        ),
                        const SizedBox(height: AppSpacing.md),
                      ],
                      AppButton(label: l10n.loginButton, onPressed: _submit, busy: _busy),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        l10n.loginNeedsNetwork,
                        textAlign: TextAlign.center,
                        style: text.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.color, required this.icon, required this.message, this.title});

  final Color color;
  final IconData icon;
  final String message;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        border: Border.all(color: color, width: 1.5),
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null) Text(title!, style: text.titleMedium),
                Text(message, style: text.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
