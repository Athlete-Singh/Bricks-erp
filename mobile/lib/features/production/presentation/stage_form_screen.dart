import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/masters/data/master_providers.dart';
import 'package:brics_mobile/features/masters/domain/masters.dart';
import 'package:brics_mobile/features/masters/presentation/item_lines_editor.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:brics_mobile/features/production/presentation/batch_screen.dart';
import 'package:brics_mobile/features/production/presentation/production_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// PRD-03 / PRD-04 / PRD-05 — one stage of one batch, entered on the phone.
/// The fields mirror `@brics/shared/schemas/production.ts`, so what the phone
/// accepts the server accepts.
class StageFormScreen extends ConsumerStatefulWidget {
  const StageFormScreen({required this.batchRef, required this.stage, super.key, this.editId});

  final BatchRef batchRef;
  final ProductionStage stage;

  /// A refused entry being corrected.
  final String? editId;

  @override
  ConsumerState<StageFormScreen> createState() => _StageFormScreenState();
}

class _StageFormScreenState extends ConsumerState<StageFormScreen> {
  final _form = GlobalKey<FormState>();
  final _notes = TextEditingController();
  late DateTime _date = ref.read(clockProvider)();
  int _bricks = 0;
  String? _sardarId;
  String? _warehouseId;
  final _consumption = <ItemLineDraft>[];
  final _gradeCounts = <String, TextEditingController>{};
  final _broken = TextEditingController(text: '0');
  final _rejects = TextEditingController(text: '0');
  String? _gradeError;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final editId = widget.editId;
    if (editId != null) {
      ref.read(queueRepositoryProvider).byId(editId).then((row) {
        if (row != null && mounted) setState(() => _prefill(row.payloadMap));
      }).ignore();
    }
  }

  void _prefill(Map<String, dynamic> p) {
    _date = Formatters.parseIsoDate(p['entryDate'] as String);
    _notes.text = (p['notes'] as String?) ?? '';
    _bricks = int.tryParse((p['greenBricks'] ?? p['firedBricks'] ?? '0') as String) ?? 0;
    _sardarId = p['sardarPartyId'] as String?;
    _warehouseId = p['warehouseId'] as String?;
    for (final c in (p['consumption'] as List?) ?? const []) {
      final line = ConsumptionLine.fromJson((c as Map).cast<String, dynamic>());
      _consumption.add(
        ItemLineDraft(itemId: line.itemId, warehouseId: line.warehouseId, quantity: line.quantity),
      );
    }
    for (final o in (p['outputs'] as List?) ?? const []) {
      final output = (o as Map).cast<String, dynamic>();
      _grade(output['brickTypeId'] as String).text = output['quantity'] as String;
    }
    _broken.text = (p['brokenBricks'] as String?) ?? '0';
    _rejects.text = (p['rejectBricks'] as String?) ?? '0';
  }

  TextEditingController _grade(String id) =>
      _gradeCounts.putIfAbsent(id, TextEditingController.new);

  @override
  void dispose() {
    _notes.dispose();
    _broken.dispose();
    _rejects.dispose();
    for (final c in _consumption) {
      c.dispose();
    }
    for (final c in _gradeCounts.values) {
      c.dispose();
    }
    super.dispose();
  }

  Map<String, dynamic> _payload() {
    final date = Formatters.isoDate(_date);
    final notes = blankToNull(_notes.text);
    final lines = [for (final c in _consumption) ConsumptionLine.fromJson(c.toJson())];
    return switch (widget.stage) {
      ProductionStage.making => ProductionPayloads.making(
        entryDate: date,
        greenBricks: '$_bricks',
        sardarPartyId: _sardarId,
        consumption: lines,
        notes: notes,
      ),
      ProductionStage.drying => ProductionPayloads.drying(entryDate: date, notes: notes),
      ProductionStage.firing => ProductionPayloads.firing(
        entryDate: date,
        firedBricks: '$_bricks',
        consumption: lines,
        notes: notes,
      ),
      ProductionStage.sorting => ProductionPayloads.sorting(
        entryDate: date,
        warehouseId: _warehouseId!,
        gradeCounts: {for (final e in _gradeCounts.entries) e.key: e.value.text.trim()},
        brokenBricks: _broken.text.trim(),
        rejectBricks: _rejects.text.trim(),
        notes: notes,
      ),
    };
  }

  String _title(AppLocalizations l10n, String chamber, Map<String, dynamic> payload) {
    return switch (widget.stage) {
      ProductionStage.making => l10n.productionMakingTitle(
        chamber,
        Formatters.quantity('$_bricks'),
      ),
      ProductionStage.drying => l10n.productionDryingTitle(chamber),
      ProductionStage.firing => l10n.productionFiringTitle(
        chamber,
        Formatters.quantity('$_bricks'),
      ),
      ProductionStage.sorting => l10n.productionSortingTitle(
        chamber,
        Formatters.quantity(
          '${(payload['outputs'] as List).fold<BigInt>(BigInt.zero, (sum, o) => sum + BigInt.parse((o as Map)['quantity'] as String))}',
        ),
      ),
    };
  }

  Future<void> _save(BatchView batch) async {
    final l10n = context.l10n;
    final valid = _form.currentState!.validate();
    if (widget.stage == ProductionStage.sorting) {
      if (_warehouseId == null) {
        showAppSnack(context, l10n.productionNoStores);
        return;
      }
      final anyGrade = _gradeCounts.values.any((c) => (int.tryParse(c.text.trim()) ?? 0) > 0);
      setState(() => _gradeError = anyGrade ? null : l10n.productionAtLeastOneGrade);
      if (!anyGrade) return;
    }
    if (!valid) {
      showAppSnack(context, l10n.formFixErrors);
      return;
    }
    final owner = ref.read(queueOwnerProvider);
    final siteId = ref.read(currentSessionProvider)?.siteId;
    if (owner == null || siteId == null) return;
    setState(() => _busy = true);

    try {
      final payload = _payload();
      final title = _title(l10n, batch.chamber, payload);
      if (widget.editId != null) {
        await ref
            .read(queueRepositoryProvider)
            .updateFailed(widget.editId!, payload: payload, title: title);
      } else {
        await ref
            .read(productionRepositoryProvider)
            .recordStage(
              owner: owner,
              siteId: siteId,
              batch: batch.ref,
              stage: widget.stage,
              payload: payload,
              title: title,
            );
      }
      ref.read(syncControllerProvider.notifier).kick();
      if (!mounted) return;
      showAppSnack(context, widget.editId != null ? l10n.savedCorrected : l10n.savedOffline);
      context.pop();
    } on Object catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      showAppSnack(context, e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final validators = Validators(l10n);
    final batch = ref.watch(batchViewProvider(widget.batchRef));
    if (batch == null) return AppScaffold(title: l10n.productionTitle, body: const EmptyView());

    return AppScaffold(
      title: stageLabel(l10n, widget.stage),
      subtitle: '${batch.chamber} · ${Formatters.displayIsoDate(batch.batchDate)}',
      bottomAction: AppButton(
        label: l10n.commonSave,
        icon: Icons.check_rounded,
        onPressed: () => _save(batch),
        busy: _busy,
      ),
      body: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Entrance(
              child: FormSection(
                title: l10n.formWhen,
                icon: Icons.event_rounded,
                children: [
                  AppDateField(
                    label: l10n.productionEntryDate,
                    value: _date,
                    today: ref.read(clockProvider)(),
                    onChanged: (d) => setState(() => _date = d),
                  ),
                ],
              ),
            ),
            ...[
              for (final (i, w) in switch (widget.stage) {
                ProductionStage.making => _making(l10n, validators),
                ProductionStage.drying => const <Widget>[],
                ProductionStage.firing => _firing(l10n, validators),
                ProductionStage.sorting => _sorting(l10n, validators),
              }.indexed)
                Entrance(index: i + 1, child: w),
            ],
            Entrance(
              index: 5,
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

  Widget _count(String label, Validators validators) {
    return FormSection(
      title: context.l10n.formCount,
      icon: stageIcon(widget.stage),
      children: [
        NumberStepper(
          label: label,
          value: _bricks,
          step: 1000,
          quickAdds: const [500, 1000, 5000],
          onChanged: (v) => setState(() => _bricks = v),
          validator: validators.brickCount,
        ),
      ],
    );
  }

  List<Widget> _making(AppLocalizations l10n, Validators validators) {
    final sardars = ref.watch(partiesOfTypeProvider(PartyTypes.sardar)).value ?? const <Party>[];
    return [
      _count(l10n.productionGreenBricks, validators),
      if (sardars.isNotEmpty)
        FormSection(
          title: l10n.productionSardar,
          icon: Icons.engineering_rounded,
          children: [
            AppDropdown<String?>(
              label: '${l10n.productionSardar} (${l10n.commonOptional})',
              value: _sardarId,
              items: [
                AppDropdownItem(value: null, label: l10n.productionNoSardar),
                for (final s in sardars) AppDropdownItem(value: s.id, label: s.name),
              ],
              onChanged: (v) => setState(() => _sardarId = v),
            ),
          ],
        ),
      _materials(l10n, l10n.productionConsumptionMaking),
    ];
  }

  List<Widget> _firing(AppLocalizations l10n, Validators validators) {
    return [
      _count(l10n.productionFiredBricks, validators),
      _materials(l10n, l10n.productionConsumptionFiring),
    ];
  }

  /// PRD-04 — material taken from stock for a stage. Raw materials and
  /// consumables only: those are what a kiln burns or moulds.
  Widget _materials(AppLocalizations l10n, String hint) {
    return ItemLinesEditor(
      lines: _consumption,
      title: l10n.productionConsumption,
      hint: hint,
      addLabel: l10n.productionAddMaterial,
      storeLabel: l10n.productionFromStore,
      icon: Icons.landscape_rounded,
      categories: const {'raw_material', 'consumable'},
      onChanged: () => setState(() {}),
    );
  }

  List<Widget> _sorting(AppLocalizations l10n, Validators validators) {
    final text = Theme.of(context).textTheme;
    final colors = context.colors;
    final stores = ref.watch(warehousesProvider).value ?? const <Warehouse>[];
    final grades = ref.watch(brickTypesProvider).value ?? const <BrickType>[];
    if (_warehouseId == null && stores.length == 1) _warehouseId = stores.single.id;
    return [
      FormSection(
        title: l10n.productionWhere,
        icon: Icons.warehouse_rounded,
        children: [
          if (stores.isEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: Text(l10n.productionNoStores),
            )
          else
            AppDropdown<String>(
              label: l10n.productionSortingWarehouse,
              value: _warehouseId,
              items: [for (final w in stores) AppDropdownItem(value: w.id, label: w.name)],
              validator: validators.required,
              onChanged: (v) => setState(() => _warehouseId = v),
            ),
        ],
      ),
      FormSection(
        title: l10n.productionGrades,
        icon: Icons.grid_view_rounded,
        children: [
          if (grades.isEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: Text(l10n.productionNoGrades),
            ),
          for (final g in grades)
            AppTextField(
              label: g.grade,
              controller: _grade(g.id),
              kind: AppFieldKind.wholeNumber,
              prefixIcon: Icons.view_agenda_rounded,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? null : validators.brickCountOrZero(v),
            ),
          if (_gradeError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: Text(_gradeError!, style: text.bodyMedium?.copyWith(color: colors.danger)),
            ),
        ],
      ),
      FormSection(
        title: l10n.productionLosses,
        hint: l10n.productionLossesHint,
        icon: Icons.broken_image_rounded,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AppTextField(
                  label: l10n.productionBroken,
                  controller: _broken,
                  kind: AppFieldKind.wholeNumber,
                  validator: validators.brickCountOrZero,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: AppTextField(
                  label: l10n.productionRejects,
                  controller: _rejects,
                  kind: AppFieldKind.wholeNumber,
                  validator: validators.brickCountOrZero,
                ),
              ),
            ],
          ),
        ],
      ),
    ];
  }
}
