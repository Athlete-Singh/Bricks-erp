/// `AttendanceStatus` in `@brics/shared/schemas/labour.ts`.
enum AttendanceMark {
  present('present'),
  halfDay('half_day'),
  absent('absent');

  const AttendanceMark(this.wire);

  final String wire;

  static AttendanceMark parse(String wire) =>
      values.firstWhere((m) => m.wire == wire, orElse: () => AttendanceMark.present);
}

class AttendanceLine {
  const AttendanceLine({required this.mark, this.workerId, this.overtimeHours});

  /// Null for a gang marked as a whole (no workers on the roll).
  final String? workerId;
  final AttendanceMark mark;
  final String? overtimeHours;

  Map<String, dynamic> toJson() => {
    'workerId': workerId,
    'status': mark.wire,
    'overtimeHours': ?overtimeHours,
  };
}

final _overtime = RegExp(r'^\d{1,2}(\.\d{1,2})?$');

/// Same rule as the backend: up to two digits, two decimals.
bool isValidOvertime(String value) => value.isEmpty || _overtime.hasMatch(value);

abstract final class AttendancePayloads {
  static Map<String, dynamic> roll({
    required String siteId,
    required String labourGroupId,
    required String date,
    required List<AttendanceLine> lines,
  }) => {
    'siteId': siteId,
    'labourGroupId': labourGroupId,
    'date': date,
    'entries': [for (final l in lines) l.toJson()],
  };

  /// Half days count as half, the way the muster roll reads.
  static String presentCount(List<AttendanceLine> lines) {
    final halves = lines.fold<int>(
      0,
      (sum, l) =>
          sum +
          switch (l.mark) {
            AttendanceMark.present => 2,
            AttendanceMark.halfDay => 1,
            AttendanceMark.absent => 0,
          },
    );
    return halves.isEven ? '${halves ~/ 2}' : '${halves ~/ 2}.5';
  }
}
