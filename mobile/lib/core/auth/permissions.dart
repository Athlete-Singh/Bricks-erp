/// Permission codes the app checks — a mirror of `PERMISSIONS` in
/// `packages/shared/src/constants/permissions.ts`. The server enforces them;
/// the app only uses them to decide what to show.
abstract final class Permissions {
  static const partiesView = 'parties.view';
  static const inventoryView = 'inventory.view';
  static const transportView = 'transport.view';
  static const labourView = 'labour.view';
  static const labourManage = 'labour.manage';
  static const purchasesManage = 'purchases.manage';
  static const productionView = 'production.view';
  static const productionManage = 'production.manage';
  static const dispatchView = 'dispatch.view';
  static const dispatchManage = 'dispatch.manage';
  static const dispatchAcknowledge = 'dispatch.acknowledge';
}

/// PLT-06 — the exact sentence the API refuses a suspended company's sign-in
/// with (`SUSPENDED_TENANT_SIGN_IN_MESSAGE` in `@brics/shared`).
const suspendedTenantMessage =
    "This company's access is on hold. Please contact TVAM support to restore it.";
