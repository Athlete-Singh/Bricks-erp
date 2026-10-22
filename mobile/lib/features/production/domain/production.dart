import 'package:brics_mobile/core/database/app_database.dart';
import 'package:brics_mobile/core/sync/record_ref.dart';

export 'package:brics_mobile/core/sync/record_ref.dart' show RecordRef;

/// The four stages a batch moves through (PRD-03). Drying is optional.
enum ProductionStage {
  making,
  drying,
  firing,
  sorting;

  static ProductionStage? parse(String value) =>
      ProductionStage.values.where((s) => s.name == value).firstOrNull;
}

/// A production batch, on the server or still on the phone.
typedef BatchRef = RecordRef;

class BatchView {
  const BatchView({
    required this.ref,
    required this.chamber,
    required this.batchDate,
    this.serverStatus,
    this.localRow,
  });

  final BatchRef ref;
  final String chamber;
  final String batchDate;

  /// `open` · `firing` · `sorted` · `closed`, once the server has it.
  final String? serverStatus;

  /// The phone's entry for a batch created here.
  final QueueRow? localRow;
}

/// One consumption line (PRD-04): coal at firing, soil at making.
class ConsumptionLine {
  const ConsumptionLine({required this.itemId, required this.warehouseId, required this.quantity});

  factory ConsumptionLine.fromJson(Map<String, dynamic> json) => ConsumptionLine(
    itemId: json['itemId'] as String,
    warehouseId: json['warehouseId'] as String,
    quantity: json['quantity'] as String,
  );

  final String itemId;
  final String warehouseId;
  final String quantity;

  Map<String, dynamic> toJson() => {
    'itemId': itemId,
    'warehouseId': warehouseId,
    'quantity': quantity,
  };
}

/// Request bodies, shaped exactly as `@brics/shared/schemas/production.ts` expects.
abstract final class ProductionPayloads {
  static Map<String, dynamic> batch({
    required String siteId,
    required String chamber,
    required String batchDate,
    String? notes,
  }) => {'siteId': siteId, 'chamber': chamber, 'batchDate': batchDate, 'notes': ?notes};

  static Map<String, dynamic> making({
    required String entryDate,
    required String greenBricks,
    String? sardarPartyId,
    List<ConsumptionLine> consumption = const [],
    String? notes,
  }) => {
    'entryDate': entryDate,
    'greenBricks': greenBricks,
    'sardarPartyId': ?sardarPartyId,
    'consumption': [for (final c in consumption) c.toJson()],
    'notes': ?notes,
  };

  static Map<String, dynamic> drying({required String entryDate, String? notes}) => {
    'entryDate': entryDate,
    'notes': ?notes,
  };

  static Map<String, dynamic> firing({
    required String entryDate,
    required String firedBricks,
    List<ConsumptionLine> consumption = const [],
    String? notes,
  }) => {
    'entryDate': entryDate,
    'firedBricks': firedBricks,
    'consumption': [for (final c in consumption) c.toJson()],
    'notes': ?notes,
  };

  /// Grades with no count are left out; the server wants at least one.
  static Map<String, dynamic> sorting({
    required String entryDate,
    required String warehouseId,
    required Map<String, String> gradeCounts,
    required String brokenBricks,
    required String rejectBricks,
    String? notes,
  }) => {
    'entryDate': entryDate,
    'warehouseId': warehouseId,
    'outputs': [
      for (final e in gradeCounts.entries)
        if (e.value.isNotEmpty && BigInt.parse(e.value) > BigInt.zero)
          {'brickTypeId': e.key, 'quantity': e.value},
    ],
    'brokenBricks': brokenBricks,
    'rejectBricks': rejectBricks,
    'notes': ?notes,
  };
}
