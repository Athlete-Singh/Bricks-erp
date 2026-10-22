/// The same item into (or out of) the same store twice on one document is a
/// double count waiting to happen; the dispatch schema refuses it, and the
/// phone refuses it everywhere before it gets that far.
bool hasDuplicateLine(List<Map<String, dynamic>> lines) {
  final seen = <String>{};
  for (final l in lines) {
    if (!seen.add('${l['itemId']}:${l['warehouseId']}')) return true;
  }
  return false;
}
