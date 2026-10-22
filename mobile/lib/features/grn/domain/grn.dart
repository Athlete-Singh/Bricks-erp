/// PUR-02 — `createGrnSchema` in `@brics/shared/schemas/purchases.ts`. A
/// receipt moves quantity only; value comes with the supplier's bill.
abstract final class GrnPayloads {
  static Map<String, dynamic> receipt({
    required String siteId,
    required String supplierPartyId,
    required String receiptDate,
    required List<Map<String, dynamic>> lines,
    String? challanNo,
    String? notes,
  }) => {
    'supplierPartyId': supplierPartyId,
    'siteId': siteId,
    'receiptDate': receiptDate,
    'challanNo': ?challanNo,
    'lines': lines,
    'notes': ?notes,
  };
}

/// The same item into the same store twice on one document is a double count
/// waiting to happen; the dispatch schema refuses it, and a receipt should too.
bool hasDuplicateLine(List<Map<String, dynamic>> lines) {
  final seen = <String>{};
  for (final l in lines) {
    if (!seen.add('${l['itemId']}:${l['warehouseId']}')) return true;
  }
  return false;
}
