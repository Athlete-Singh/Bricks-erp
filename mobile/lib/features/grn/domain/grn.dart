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
