import 'package:brics_mobile/core/auth/permissions.dart';
import 'package:brics_mobile/core/sync/cache_repository.dart';
import 'package:brics_mobile/features/grn/domain/grn.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/app_harness.dart';
import '../helpers/pump_app.dart';
import '../helpers/test_env.dart';

void main() {
  test('payload matches createGrnSchema: quantity only, no rate', () {
    final p = GrnPayloads.receipt(
      siteId: kilnA,
      supplierPartyId: 's1',
      receiptDate: '2026-10-22',
      challanNo: 'CH-88',
      lines: [
        {'itemId': 'coal', 'warehouseId': 'store', 'quantity': '12.500'},
      ],
    );
    expect(p, {
      'supplierPartyId': 's1',
      'siteId': kilnA,
      'receiptDate': '2026-10-22',
      'challanNo': 'CH-88',
      'lines': [
        {'itemId': 'coal', 'warehouseId': 'store', 'quantity': '12.500'},
      ],
    });
  });

  test('the same item into the same store twice is caught', () {
    expect(
      hasDuplicateLine([
        {'itemId': 'coal', 'warehouseId': 'a'},
        {'itemId': 'coal', 'warehouseId': 'b'},
      ]),
      isFalse,
    );
    expect(
      hasDuplicateLine([
        {'itemId': 'coal', 'warehouseId': 'a'},
        {'itemId': 'coal', 'warehouseId': 'a'},
      ]),
      isTrue,
    );
  });

  testWidgets('coal received with no signal shows its GRN number once sent', (tester) async {
    final env = TestEnv()..connectivity.online = false;
    addTearDown(env.dispose);
    await seedSession(
      env,
      permissions: [
        Permissions.purchasesManage,
        Permissions.partiesView,
        Permissions.inventoryView,
      ],
    );
    env.api.offline = true;
    final create = IdempotentCreate((_) => {'id': 'g1', 'grnNo': 'GRN-00012'});
    env.api.on('POST', '/purchases/goods-receipts', create.call);
    final cache = CacheRepository(env.db, () => env.now);
    await cache.applyDelta(CacheKind.party, [
      {
        'id': 's1',
        'name': 'Jharia Coal Co',
        'partyTypes': ['supplier'],
      },
      {
        'id': 'c1',
        'name': 'A Customer',
        'partyTypes': ['customer'],
      },
    ]);
    await cache.applyDelta(CacheKind.item, [
      {'id': 'coal', 'name': 'Coal', 'category': 'raw_material', 'unitId': 't'},
    ]);
    await cache.applyDelta(CacheKind.unit, [
      {'id': 't', 'name': 'Tonne', 'abbreviation': 't'},
    ]);
    await cache.applyDelta(CacheKind.warehouse, [
      {'id': 'store', 'siteId': kilnA, 'name': 'Coal yard'},
    ], siteKey: 'siteId');

    await tester.runAsync(() => tester.pumpBrics(env));
    await settle(tester);
    await tester.tap(find.text('Goods receipt'));
    await settle(tester);
    await tester.tap(find.text('New receipt'));
    await settle(tester);

    await tester.tap(find.text('Supplier'));
    await settle(tester);
    expect(find.text('A Customer'), findsNothing, reason: 'only suppliers are offered');
    await tester.tap(find.text('Jharia Coal Co').last);
    await settle(tester);
    await tester.tap(find.text('Material'));
    await settle(tester);
    await tester.tap(find.text('Coal').last);
    await settle(tester);
    await tester.enterText(find.widgetWithText(TextFormField, 'Quantity (t)'), '12.5');
    await tester.tap(find.text('Save'));
    await settle(tester);

    expect(find.text('Jharia Coal Co · 1 items'), findsOneWidget);
    expect(find.text('Waiting'), findsOneWidget);

    env.api.offline = false;
    env.connectivity.set(online: true);
    await settle(tester);

    expect(create.created, 1);
    expect(env.api.sent('POST', '/purchases/goods-receipts').single.json['lines'], [
      {'itemId': 'coal', 'warehouseId': 'store', 'quantity': '12.5'},
    ]);
    expect(find.text('No. GRN-00012'), findsOneWidget);
    expect(find.text('Sent'), findsOneWidget);
    await tester.disposeApp();
  });
}
