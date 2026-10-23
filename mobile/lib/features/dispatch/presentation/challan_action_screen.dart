import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/sync/record_ref.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

enum ChallanAction {
  /// DSP-02 — the truck leaves; stock comes off on the server.
  gateOut('gate-out', QueueEntity.dispatchConfirm),

  /// DSP-03 — who received the load, and when.
  deliver('deliver', QueueEntity.dispatchAcknowledge);

  const ChallanAction(this.slug, this.entity);

  final String slug;
  final String entity;

  static ChallanAction? parse(String slug) => values.where((a) => a.slug == slug).firstOrNull;
}

class ChallanActionScreen extends ConsumerStatefulWidget {
  const ChallanActionScreen({
    required this.challanRef,
    required this.action,
    super.key,
    this.editId,
  });

  final RecordRef challanRef;
  final ChallanAction action;
  final String? editId;

  @override
  ConsumerState<ChallanActionScreen> createState() => _ChallanActionScreenState();
}

class _ChallanActionScreenState extends ConsumerState<ChallanActionScreen> {
  final _form = GlobalKey<FormState>();
  final _receivedBy = TextEditingController();
  final _remarks = TextEditingController();
  late DateTime _date = ref.read(clockProvider)();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final editId = widget.editId;
    if (editId == null) return;
    ref.read(queueRepositoryProvider).byId(editId).then((row) {
      if (row == null || !mounted) return;
      final p = row.payloadMap;
      setState(() {
        final date = (p['confirmedOn'] ?? p['deliveredOn']) as String?;
        if (date != null) _date = Formatters.parseIsoDate(date);
        _receivedBy.text = (p['receivedBy'] as String?) ?? '';
        _remarks.text = (p['deliveryRemarks'] as String?) ?? '';
      });
    }).ignore();
  }

  @override
  void dispose() {
    _receivedBy.dispose();
    _remarks.dispose();
    super.dispose();
  }

  Future<void> _save(ChallanView challan) async {
    final l10n = context.l10n;
    if (!_form.currentState!.validate()) return;
    final owner = ref.read(queueOwnerProvider);
    final siteId = ref.read(currentSessionProvider)?.siteId;
    if (owner == null || siteId == null) return;
    setState(() => _busy = true);

    final date = Formatters.isoDate(_date);
    final label = challan.challanNo ?? l10n.dispatchChallanUnsent;
    final (payload, title) = switch (widget.action) {
      ChallanAction.gateOut => (
        DispatchPayloads.confirm(confirmedOn: date),
        l10n.dispatchConfirmTitle(label),
      ),
      ChallanAction.deliver => (
        DispatchPayloads.acknowledge(
          receivedBy: _receivedBy.text.trim(),
          deliveredOn: date,
          deliveryRemarks: blankToNull(_remarks.text),
        ),
        l10n.dispatchDeliverTitle(label, _receivedBy.text.trim()),
      ),
    };
    if (widget.editId != null) {
      await ref
          .read(queueRepositoryProvider)
          .updateFailed(widget.editId!, payload: payload, title: title);
    } else {
      await ref
          .read(dispatchRepositoryProvider)
          .act(
            owner: owner,
            siteId: siteId,
            challan: challan.ref,
            entity: widget.action.entity,
            payload: payload,
            title: title,
            after: widget.action == ChallanAction.deliver
                ? ref.read(challanActionsProvider(challanIds(challan))).confirm
                : null,
          );
    }
    ref.read(syncControllerProvider.notifier).kick();
    if (!mounted) return;
    showAppSnack(context, widget.editId != null ? l10n.savedCorrected : l10n.savedOffline);
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final validators = Validators(l10n);
    final challan = ref.watch(challanViewProvider(widget.challanRef));
    if (challan == null) return AppScaffold(title: l10n.dispatchTitle, body: const EmptyView());
    final gateOut = widget.action == ChallanAction.gateOut;

    return AppScaffold(
      title: gateOut ? l10n.dispatchGateOut : l10n.dispatchDeliver,
      subtitle: challan.challanNo ?? l10n.dispatchChallanUnsent,
      bottomAction: AppButton(
        label: l10n.commonSave,
        icon: gateOut ? Icons.logout_rounded : Icons.check_rounded,
        busy: _busy,
        onPressed: () => _save(challan),
      ),
      body: Form(
        key: _form,
        child: Entrance(
          child: FormSection(
            title: gateOut ? l10n.dispatchGateOut : l10n.dispatchDeliver,
            hint: gateOut ? l10n.dispatchGateOutHint : null,
            icon: gateOut ? Icons.local_shipping_rounded : Icons.handshake_rounded,
            children: [
              AppDateField(
                label: gateOut ? l10n.dispatchGateOutOn : l10n.dispatchDeliveredOn,
                value: _date,
                today: ref.read(clockProvider)(),
                firstDate: Formatters.parseIsoDate(challan.dispatchDate),
                onChanged: (d) => setState(() => _date = d),
              ),
              if (!gateOut) ...[
                AppTextField(
                  label: l10n.dispatchReceivedBy,
                  controller: _receivedBy,
                  prefixIcon: Icons.badge_rounded,
                  maxLength: 100,
                  validator: validators.maxLength(100, optional: false),
                ),
                AppTextField(
                  label: '${l10n.dispatchRemarks} (${l10n.commonOptional})',
                  controller: _remarks,
                  maxLines: 3,
                  maxLength: 1000,
                  validator: validators.maxLength(1000),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
