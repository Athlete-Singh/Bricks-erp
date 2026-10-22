import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/router/app_router.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/production/presentation/production_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// PRD-02 — a batch is one chamber, on one date, at this kiln.
class NewBatchScreen extends ConsumerStatefulWidget {
  const NewBatchScreen({super.key, this.editId});

  /// A refused entry being corrected.
  final String? editId;

  @override
  ConsumerState<NewBatchScreen> createState() => _NewBatchScreenState();
}

class _NewBatchScreenState extends ConsumerState<NewBatchScreen> {
  final _form = GlobalKey<FormState>();
  final _chamber = TextEditingController();
  final _notes = TextEditingController();
  late DateTime _date = ref.read(clockProvider)();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final editId = widget.editId;
    if (editId != null) {
      ref.read(queueRepositoryProvider).byId(editId).then((row) {
        if (row == null || !mounted) return;
        final p = row.payloadMap;
        setState(() {
          _chamber.text = p['chamber'] as String;
          _notes.text = (p['notes'] as String?) ?? '';
          _date = Formatters.parseIsoDate(p['batchDate'] as String);
        });
      }).ignore();
    }
  }

  @override
  void dispose() {
    _chamber.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    if (!_form.currentState!.validate()) return;
    final owner = ref.read(queueOwnerProvider);
    final siteId = ref.read(currentSessionProvider)?.siteId;
    if (owner == null || siteId == null) return;
    setState(() => _busy = true);

    final chamber = _chamber.text.trim();
    final date = Formatters.isoDate(_date);
    final payload = ProductionPayloads.batch(
      siteId: siteId,
      chamber: chamber,
      batchDate: date,
      notes: blankToNull(_notes.text),
    );
    final title = l10n.productionBatchEntryTitle(chamber, Formatters.displayDate(_date));

    String id;
    if (widget.editId != null) {
      id = widget.editId!;
      await ref.read(queueRepositoryProvider).updateFailed(id, payload: payload, title: title);
    } else {
      id = await ref
          .read(productionRepositoryProvider)
          .createBatch(owner: owner, siteId: siteId, payload: payload, title: title);
    }
    ref.read(syncControllerProvider.notifier).kick();
    if (!mounted) return;
    showAppSnack(
      context,
      widget.editId != null ? l10n.savedCorrected : l10n.savedOffline,
      celebrate: widget.editId == null,
    );
    if (widget.editId != null) {
      context.pop();
    } else {
      context.pushReplacement(AppRoutes.productionBatch(BatchRef(localId: id).encode()));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final validators = Validators(l10n);
    return AppScaffold(
      title: l10n.productionNewBatch,
      subtitle: ref.watch(selectedSiteProvider)?.name,
      bottomAction: AppButton(
        label: l10n.commonSave,
        icon: Icons.check_rounded,
        onPressed: _save,
        busy: _busy,
      ),
      body: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Entrance(
              child: FormSection(
                title: l10n.productionChamber,
                icon: Icons.local_fire_department_rounded,
                children: [
                  AppTextField(
                    label: l10n.productionChamber,
                    hint: l10n.productionChamberHint,
                    controller: _chamber,
                    prefixIcon: Icons.door_sliding_rounded,
                    maxLength: 20,
                    validator: validators.maxLength(20, optional: false),
                  ),
                  AppDateField(
                    label: l10n.productionBatchDate,
                    value: _date,
                    today: ref.read(clockProvider)(),
                    onChanged: (d) => setState(() => _date = d),
                  ),
                ],
              ),
            ),
            Entrance(
              index: 1,
              child: FormSection(
                title: l10n.formMore,
                icon: Icons.notes_rounded,
                children: [
                  AppTextField(
                    label: '${l10n.commonNotes} (${l10n.commonOptional})',
                    controller: _notes,
                    maxLines: 3,
                    maxLength: 500,
                    validator: validators.maxLength(500),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
