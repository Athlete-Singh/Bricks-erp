import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/dispatch/domain/dispatch.dart';
import 'package:brics_mobile/features/dispatch/presentation/dispatch_providers.dart';
import 'package:brics_mobile/features/masters/data/master_providers.dart';
import 'package:brics_mobile/features/masters/domain/item_lines.dart';
import 'package:brics_mobile/features/masters/domain/masters.dart';
import 'package:brics_mobile/features/masters/presentation/item_lines_editor.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// DSP-01 from the yard — raised as a draft; the truck leaving is a separate
/// step (gate out), because that is when the bricks actually go.
class ChallanFormScreen extends ConsumerStatefulWidget {
  const ChallanFormScreen({super.key, this.editId});

  final String? editId;

  @override
  ConsumerState<ChallanFormScreen> createState() => _ChallanFormScreenState();
}

class _ChallanFormScreenState extends ConsumerState<ChallanFormScreen> {
  final _form = GlobalKey<FormState>();
  final _location = TextEditingController();
  final _notes = TextEditingController();
  late DateTime _date = ref.read(clockProvider)();
  String? _customerId;
  String? _vehicleId;
  String? _driverId;
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
        _customerId = p['customerPartyId'] as String;
        _date = Formatters.parseIsoDate(p['dispatchDate'] as String);
        _vehicleId = p['vehicleId'] as String?;
        _driverId = p['driverId'] as String?;
        _location.text = (p['deliveryLocation'] as String?) ?? '';
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
    _location.dispose();
    _notes.dispose();
    for (final l in _lines) {
      l.dispose();
    }
    super.dispose();
  }

  Future<void> _save(List<Party> customers) async {
    final l10n = context.l10n;
    final valid = _form.currentState!.validate();
    final lines = [for (final l in _lines) l.toJson()];
    setState(() {
      _linesError = lines.isEmpty
          ? l10n.dispatchAtLeastOneLine
          : hasDuplicateLine(lines)
          ? l10n.dispatchDuplicateLine
          : null;
    });
    if (!valid || _linesError != null) return;
    final owner = ref.read(queueOwnerProvider);
    final siteId = ref.read(currentSessionProvider)?.siteId;
    if (owner == null || siteId == null) return;
    setState(() => _busy = true);

    final payload = DispatchPayloads.challan(
      siteId: siteId,
      customerPartyId: _customerId!,
      dispatchDate: Formatters.isoDate(_date),
      vehicleId: _vehicleId,
      driverId: _driverId,
      deliveryLocation: blankToNull(_location.text),
      notes: blankToNull(_notes.text),
      lines: lines,
    );
    final total = lines.fold<double>(0, (sum, l) => sum + double.parse(l['quantity'] as String));
    final customer = customers.firstWhere((c) => c.id == _customerId).name;
    final title = l10n.dispatchEntryTitle(customer, Formatters.quantity(_trim(total)));
    if (widget.editId != null) {
      await ref
          .read(queueRepositoryProvider)
          .updateFailed(widget.editId!, payload: payload, title: title);
    } else {
      await ref
          .read(dispatchRepositoryProvider)
          .raise(owner: owner, siteId: siteId, payload: payload, title: title);
    }
    ref.read(syncControllerProvider.notifier).kick();
    if (!mounted) return;
    showAppSnack(context, widget.editId != null ? l10n.savedCorrected : l10n.savedOffline);
    context.pop();
  }

  /// The title only — the payload keeps every quantity exactly as typed.
  static String _trim(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(3);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final validators = Validators(l10n);
    final user = ref.watch(currentSessionProvider)?.session.user;
    final customers =
        ref.watch(partiesOfTypeProvider(PartyTypes.customer)).value ?? const <Party>[];
    final canTransport = user?.can(Permissions.transportView) ?? false;
    final vehicles = canTransport
        ? ref.watch(vehiclesProvider).value ?? const <Vehicle>[]
        : const <Vehicle>[];
    final drivers = canTransport
        ? ref.watch(driversProvider).value ?? const <Driver>[]
        : const <Driver>[];
    // Bricks leave as the item their grade is sold as (ADR-051).
    final brickItems = {
      for (final b in ref.watch(brickTypesProvider).value ?? const <BrickType>[]) b.itemId,
    };

    return AppScaffold(
      title: l10n.dispatchNew,
      bottomAction: AppButton(
        label: l10n.commonSave,
        busy: _busy,
        onPressed: () => _save(customers),
      ),
      body: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (customers.isEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: Text(l10n.dispatchNoCustomers),
              ),
            AppDropdown<String>(
              label: l10n.dispatchCustomer,
              value: _customerId,
              items: [for (final c in customers) AppDropdownItem(value: c.id, label: c.name)],
              validator: validators.required,
              onChanged: (v) => setState(() => _customerId = v),
            ),
            AppDateField(
              label: l10n.dispatchDate,
              value: _date,
              today: ref.read(clockProvider)(),
              onChanged: (d) => setState(() => _date = d),
            ),
            if (vehicles.isNotEmpty)
              AppDropdown<String?>(
                label: '${l10n.dispatchVehicle} (${l10n.commonOptional})',
                value: _vehicleId,
                items: [
                  AppDropdownItem(value: null, label: l10n.dispatchNoVehicle),
                  for (final v in vehicles) AppDropdownItem(value: v.id, label: v.registrationNo),
                ],
                onChanged: (v) => setState(() => _vehicleId = v),
              ),
            if (drivers.isNotEmpty)
              AppDropdown<String?>(
                label: '${l10n.dispatchDriver} (${l10n.commonOptional})',
                value: _driverId,
                items: [
                  AppDropdownItem(value: null, label: l10n.dispatchNoDriver),
                  for (final d in drivers) AppDropdownItem(value: d.id, label: d.name),
                ],
                onChanged: (v) => setState(() => _driverId = v),
              ),
            AppTextField(
              label: '${l10n.dispatchDeliveryLocation} (${l10n.commonOptional})',
              controller: _location,
              maxLength: 200,
              validator: validators.maxLength(200),
            ),
            ItemLinesEditor(
              lines: _lines,
              title: l10n.dispatchLines,
              hint: l10n.dispatchLinesHint,
              addLabel: l10n.dispatchAddLine,
              storeLabel: l10n.dispatchFromYard,
              itemFilter: brickItems.isEmpty ? null : (i) => brickItems.contains(i.id),
              onChanged: () => setState(() {}),
            ),
            if (_linesError != null)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.sm),
                child: Text(
                  _linesError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            const SizedBox(height: AppSpacing.lg),
            AppTextField(
              label: '${l10n.commonNotes} (${l10n.commonOptional})',
              controller: _notes,
              maxLines: 2,
              maxLength: 1000,
              validator: validators.maxLength(1000),
            ),
          ],
        ),
      ),
    );
  }
}
