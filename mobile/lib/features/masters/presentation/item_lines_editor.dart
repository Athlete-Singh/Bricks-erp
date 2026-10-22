import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/masters/data/master_providers.dart';
import 'package:brics_mobile/features/masters/domain/masters.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One editable line: an item, the store it moves in or out of, how much.
class ItemLineDraft {
  ItemLineDraft({this.itemId, this.warehouseId, String quantity = ''})
    : quantity = TextEditingController(text: quantity);

  String? itemId;
  String? warehouseId;
  final TextEditingController quantity;

  /// `{itemId, warehouseId, quantity}` — the shape every stock line takes on the API.
  Map<String, dynamic> toJson() => {
    'itemId': itemId,
    'warehouseId': warehouseId,
    'quantity': quantity.text.trim(),
  };

  void dispose() => quantity.dispose();
}

/// Item lines against this kiln's stores — material used at a stage, goods
/// received, bricks loaded on a truck.
class ItemLinesEditor extends ConsumerWidget {
  const ItemLinesEditor({
    required this.lines,
    required this.onChanged,
    required this.title,
    required this.hint,
    required this.addLabel,
    required this.storeLabel,
    super.key,
    this.categories,
    this.itemFilter,
  });

  final List<ItemLineDraft> lines;
  final VoidCallback onChanged;
  final String title;
  final String hint;
  final String addLabel;
  final String storeLabel;

  /// Only items of these categories (null: every item).
  final Set<String>? categories;

  /// A further narrowing, e.g. only items that are brick grades.
  final bool Function(Item item)? itemFilter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final validators = Validators(l10n);
    final text = Theme.of(context).textTheme;
    final items = (ref.watch(itemsProvider).value ?? const <Item>[])
        .where((i) => categories == null || categories!.contains(i.category))
        .where((i) => itemFilter == null || itemFilter!(i))
        .toList();
    final units = ref.watch(unitsProvider).value ?? const {};
    final stores = ref.watch(warehousesProvider).value ?? const <Warehouse>[];
    // One store at the kiln: nothing to choose, so do not make anyone choose it.
    if (stores.length == 1) {
      for (final line in lines.where((l) => l.warehouseId == null)) {
        line.warehouseId = stores.single.id;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: text.titleMedium),
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
                  label: storeLabel,
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
          label: addLabel,
          icon: Icons.add,
          variant: AppButtonVariant.secondary,
          onPressed: () {
            lines.add(ItemLineDraft(warehouseId: stores.length == 1 ? stores.single.id : null));
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
