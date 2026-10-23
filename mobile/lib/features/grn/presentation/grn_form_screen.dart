import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/grn/data/grn_repository.dart';
import 'package:brics_mobile/features/grn/domain/grn.dart';
import 'package:brics_mobile/features/masters/data/master_providers.dart';
import 'package:brics_mobile/features/masters/domain/item_lines.dart';
import 'package:brics_mobile/features/masters/domain/masters.dart';
import 'package:brics_mobile/features/masters/presentation/item_lines_editor.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// PUR-02 — what arrived at the gate, from whom, into which store.
class GrnFormScreen extends ConsumerStatefulWidget {
  const GrnFormScreen({super.key, this.editId});

  final String? editId;

  @override
  ConsumerState<GrnFormScreen> createState() => _GrnFormScreenState();
}

class _GrnFormScreenState extends ConsumerState<GrnFormScreen> {
  final _form = GlobalKey<FormState>();
  final _challan = TextEditingController();
  final _notes = TextEditingController();
  late DateTime _date = ref.read(clockProvider)();
  String? _supplierId;
  final _lines = <ItemLineDraft>[];
  String? _linesError;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final editId = widget.editId;
    if (editId == null) {
      _lines.add(ItemLineDraft());
      return;
    }
    ref.read(queueRepositoryProvider).byId(editId).then((row) {
      if (row == null || !mounted) return;
      final p = row.payloadMap;
      setState(() {
        _supplierId = p['supplierPartyId'] as String;
        _date = Formatters.parseIsoDate(p['receiptDate'] as String);
        _challan.text = (p['challanNo'] as String?) ?? '';
        _notes.text = (p['notes'] as String?) ?? '';
        for (final l in (p['lines'] as List).cast<Map<dynamic, dynamic>>()) {
          _lines.add(
            ItemLineDraft(
              itemId: l['itemId'] as String,
              warehouseId: l['warehouseId'] as String,
              quantity: l['quantity'] as String,
            ),
          );
        }
      });
    }).ignore();
  }

  @override
  void dispose() {
    _challan.dispose();
    _notes.dispose();
    for (final l in _lines) {
      l.dispose();
    }
    super.dispose();
  }

  Future<void> _save(List<Party> suppliers) async {
    final l10n = context.l10n;
    final valid = _form.currentState!.validate();
    final lines = [for (final l in _lines) l.toJson()];
    setState(() {
      _linesError = lines.isEmpty
          ? l10n.grnAtLeastOneLine
          : hasDuplicateLine(lines)
          ? l10n.grnDuplicateLine
          : null;
    });
    if (!valid || _linesError != null) return;
    final owner = ref.read(queueOwnerProvider);
    final siteId = ref.read(currentSessionProvider)?.siteId;
    if (owner == null || siteId == null) return;
    setState(() => _busy = true);

    final payload = GrnPayloads.receipt(
      siteId: siteId,
      supplierPartyId: _supplierId!,
      receiptDate: Formatters.isoDate(_date),
      challanNo: blankToNull(_challan.text),
      lines: lines,
      notes: blankToNull(_notes.text),
    );
    final supplier = suppliers.firstWhere((s) => s.id == _supplierId).name;
    final title = l10n.grnEntryTitle(supplier, lines.length);
    if (widget.editId != null) {
      await ref
          .read(queueRepositoryProvider)
          .updateFailed(widget.editId!, payload: payload, title: title);
    } else {
      await ref
          .read(grnRepositoryProvider)
          .save(owner: owner, siteId: siteId, payload: payload, title: title);
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
    final suppliers =
        ref.watch(partiesOfTypeProvider(PartyTypes.supplier)).value ?? const <Party>[];

    return AppScaffold(
      title: l10n.grnNew,
      subtitle: ref.watch(selectedSiteProvider)?.name,
      bottomAction: AppButton(
        label: l10n.commonSave,
        icon: Icons.check_rounded,
        busy: _busy,
        onPressed: () => _save(suppliers),
      ),
      body: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Entrance(
              child: FormSection(
                title: l10n.grnFrom,
                icon: Icons.local_shipping_rounded,
                children: [
                  if (suppliers.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: Text(l10n.grnNoSuppliers),
                    ),
                  AppDropdown<String>(
                    label: l10n.grnSupplier,
                    value: _supplierId,
                    items: [for (final s in suppliers) AppDropdownItem(value: s.id, label: s.name)],
                    validator: validators.required,
                    onChanged: (v) => setState(() => _supplierId = v),
                  ),
                  AppDateField(
                    label: l10n.grnReceiptDate,
                    value: _date,
                    today: ref.read(clockProvider)(),
                    onChanged: (d) => setState(() => _date = d),
                  ),
                  AppTextField(
                    label: '${l10n.grnChallanNo} (${l10n.commonOptional})',
                    controller: _challan,
                    prefixIcon: Icons.receipt_long_rounded,
                    maxLength: 50,
                    validator: validators.maxLength(50),
                  ),
                ],
              ),
            ),
            Entrance(
              index: 1,
              child: ItemLinesEditor(
                lines: _lines,
                title: l10n.grnLines,
                hint: l10n.grnLinesHint,
                addLabel: l10n.grnAddLine,
                storeLabel: l10n.grnIntoStore,
                onChanged: () => setState(() {}),
              ),
            ),
            if (_linesError != null)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: Text(
                  _linesError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            Entrance(
              index: 2,
              child: FormSection(
                title: l10n.formMore,
                icon: Icons.notes_rounded,
                children: [
                  AppTextField(
                    label: '${l10n.commonNotes} (${l10n.commonOptional})',
                    controller: _notes,
                    maxLines: 2,
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
