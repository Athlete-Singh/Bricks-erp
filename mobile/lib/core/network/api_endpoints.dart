/// Every API path the app calls, relative to `API_BASE_URL` (…/api/v1).
/// Each one is wired in `.brain/API_INDEX.md` (Mob column).
abstract final class ApiEndpoints {
  static const login = '/auth/login';
  static const refresh = '/auth/refresh';
  static const logout = '/auth/logout';
  static const me = '/auth/me';

  static const sites = '/sites';
  static const parties = '/parties';
  static const units = '/inventory/units';
  static const items = '/inventory/items';
  static const brickTypes = '/inventory/brick-types';
  static const warehouses = '/inventory/warehouses';
  static const labourGroups = '/labour/groups';
  static const labourWorkers = '/labour/workers';
  static const vehicles = '/transport/vehicles';
  static const drivers = '/transport/drivers';

  static const productionBatches = '/production/batches';
  static String productionBatch(String id) => '/production/batches/$id';
  static String productionStage(String batchId, String stage) =>
      '/production/batches/$batchId/$stage';

  static const attendance = '/labour/attendance';
  static const goodsReceipts = '/purchases/goods-receipts';

  static const dispatches = '/dispatches';
  static String dispatch(String id) => '/dispatches/$id';
  static String dispatchConfirm(String id) => '/dispatches/$id/confirm';
  static String dispatchAcknowledge(String id) => '/dispatches/$id/acknowledge';
}
