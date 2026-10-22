import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/masters/data/master_providers.dart';
import 'package:brics_mobile/features/masters/domain/masters.dart';
import 'package:brics_mobile/features/production/domain/production.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One editable material line.
class ConsumptionDraft {
  ConsumptionDraft({this.itemId, this.warehouseId, String quantity = ''})
    : quantity = TextEditingController(text: quantity);

  String? itemId;
  String? warehouseId;
  final TextEditingController quantity;

  ConsumptionLine toLine() =>
      ConsumptionLine(itemId: itemId!, warehouseId: warehouseId!, quantity: quantity.text.trim());

  void dispose() => quantity.dispose();
}

/// PRD-04 — material taken from stock for a stage. Raw materials and
/// consumables only: those are what a kiln burns or moulds.
class ConsumptionEditor extends ConsumerWidget {
  const ConsumptionEditor({
    required this.lines,
    required this.onChanged,
    required this.hint,
    super.key,
  });

  final List<ConsumptionDraft> lines;
  final VoidCallback onChanged;
  final String hint;

  static const _categories = {'raw_material', 'consumable'};

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final validators = Validators(l10n);
    final text = Theme.of(context).textTheme;
    final items = (ref.watch(itemsProvider).value ?? const <Item>[])
        .where((i) => _categories.contains(i.category))
        .toList();
    final units = ref.watch(unitsProvider).value ?? const {};
    final stores = ref.watch(warehousesProvider).value ?? const <Warehouse>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.productionConsumption, style: text.titleMedium),
        Text(hint, style: text.bodySmall),
        const SizedBox(height: AppSpacing.sm),
        for (final line in lines)
          AppCard(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, 0),
            child: Column(
              children: [
                AppDropdown<String>(
                  label: l10n.productionItem,
                  value: line.itemId,
                  items: [for (final i in items) AppDropdownItem(value: i.id, label: i.name)],
                  validator: validators.required,
                  onChanged: (v) {
                    line.itemId = v;
                    onChanged();
                  },
                ),
                AppDropdown<String>(
                  label: l10n.productionFromStore,
                  value: line.warehouseId,
                  items: [for (final w in stores) AppDropdownItem(value: w.id, label: w.name)],
                  validator: validators.required,
                  onChanged: (v) {
                    line.warehouseId = v;
                    onChanged();
                  },
                ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: AppTextField(
                        label: _unitLabel(l10n, items, units, line.itemId),
                        controller: line.quantity,
                        kind: AppFieldKind.decimal,
                        validator: validators.quantity,
                      ),
                    ),
                    IconButton(
                      tooltip: l10n.commonRemove,
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () {
                        lines.remove(line);
                        line.dispose();
                        onChanged();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        const SizedBox(height: AppSpacing.sm),
        AppButton(
          label: l10n.productionAddMaterial,
          icon: Icons.add,
          variant: AppButtonVariant.secondary,
          onPressed: () {
            lines.add(ConsumptionDraft(warehouseId: stores.length == 1 ? stores.single.id : null));
            onChanged();
          },
        ),
      ],
    );
  }

  static String _unitLabel(
    AppLocalizations l10n,
    List<Item> items,
    Map<String, Unit> units,
    String? itemId,
  ) {
    final item = items.where((i) => i.id == itemId).firstOrNull;
    final unit = item == null ? null : units[item.unitId];
    return unit == null ? l10n.productionQuantity : l10n.productionQuantityUnit(unit.abbreviation);
  }
}
