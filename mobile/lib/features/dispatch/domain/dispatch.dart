import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/sync/record_ref.dart';

/// `DISPATCH_STATUSES` in `@brics/shared/schemas/dispatch.ts`.
abstract final class DispatchStatus {
  static const draft = 'draft';
  static const confirmed = 'confirmed';
  static const delivered = 'delivered';
  static const cancelled = 'cancelled';
}

class ChallanView {
  const ChallanView({
    required this.ref,
    required this.customerPartyId,
    required this.dispatchDate,
    this.challanNo,
    this.serverStatus,
    this.localRow,
    this.vehicleId,
  });

  final RecordRef ref;
  final String customerPartyId;
  final String dispatchDate;

  /// The server's number; a challan raised on the phone has none until sent.
  final String? challanNo;
  final String? serverStatus;
  final QueueRow? localRow;
  final String? vehicleId;
}

/// Request bodies for DSP-01 / DSP-02 / DSP-03.
abstract final class DispatchPayloads {
  static Map<String, dynamic> challan({
    required String siteId,
    required String customerPartyId,
    required String dispatchDate,
    required List<Map<String, dynamic>> lines,
    String? vehicleId,
    String? driverId,
    String? deliveryLocation,
    String? notes,
  }) => {
    'siteId': siteId,
    'customerPartyId': customerPartyId,
    'dispatchDate': dispatchDate,
    'vehicleId': ?vehicleId,
    'driverId': ?driverId,
    'deliveryLocation': ?deliveryLocation,
    'notes': ?notes,
    'lines': lines,
  };

  static Map<String, dynamic> confirm({required String confirmedOn}) => {
    'confirmedOn': confirmedOn,
  };

  static Map<String, dynamic> acknowledge({
    required String receivedBy,
    required String deliveredOn,
    String? deliveryRemarks,
  }) => {'receivedBy': receivedBy, 'deliveredOn': deliveredOn, 'deliveryRemarks': ?deliveryRemarks};
}

/// Where a challan stands once this phone's own unsent actions are counted:
/// a gate-out queued here means the truck has left, even if the server does
/// not know yet.
String effectiveStatus(ChallanView challan, {QueueRow? confirm, QueueRow? acknowledge}) {
  bool live(QueueRow? r) => r != null && r.status != 'failed';
  if (live(acknowledge)) return DispatchStatus.delivered;
  if (live(confirm) && challan.serverStatus != DispatchStatus.delivered) {
    return DispatchStatus.confirmed;
  }
  return challan.serverStatus ?? DispatchStatus.draft;
}
