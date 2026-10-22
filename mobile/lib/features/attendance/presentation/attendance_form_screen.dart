import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_spacing.dart';
import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:brics_mobile/core/widgets/widgets.dart';
import 'package:brics_mobile/features/attendance/data/attendance_repository.dart';
import 'package:brics_mobile/features/attendance/domain/attendance.dart';
import 'package:brics_mobile/features/auth/presentation/session_controller.dart';
import 'package:brics_mobile/features/masters/data/master_providers.dart';
import 'package:brics_mobile/features/masters/domain/masters.dart';
import 'package:brics_mobile/features/sync/presentation/queue_providers.dart';
import 'package:brics_mobile/features/sync/presentation/sync_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// LAB-02 — one gang, one day: a mark per worker, with two taps at most.
class AttendanceFormScreen extends ConsumerStatefulWidget {
  const AttendanceFormScreen({super.key, this.editId});

  final String? editId;

  @override
  ConsumerState<AttendanceFormScreen> createState() => _AttendanceFormScreenState();
}

class _AttendanceFormScreenState extends ConsumerState<AttendanceFormScreen> {
  final _form = GlobalKey<FormState>();
  late DateTime _date = ref.read(clockProvider)();
  String? _groupId;
  final _marks = <String, AttendanceMark>{};
  final _overtime = <String, TextEditingController>{};

  /// For a gang with no workers on the roll.
  AttendanceMark _groupMark = AttendanceMark.present;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final editId = widget.editId;
    if (editId == null) return;
    ref.read(queueRepositoryProvider).byId(editId).then((row) {
      if (row == null || !mounted) return;
      final p = row.payloadMap;
      setState(() {
        _groupId = p['labourGroupId'] as String;
        _date = Formatters.parseIsoDate(p['date'] as String);
        for (final e in (p['entries'] as List).cast<Map<dynamic, dynamic>>()) {
          final mark = AttendanceMark.parse(e['status'] as String);
          final workerId = e['workerId'] as String?;
          if (workerId == null) {
            _groupMark = mark;
          } else {
            _marks[workerId] = mark;
            _ot(workerId).text = (e['overtimeHours'] as String?) ?? '';
          }
        }
      });
    }).ignore();
  }

  TextEditingController _ot(String id) => _overtime.putIfAbsent(id, TextEditingController.new);

  @override
  void dispose() {
    for (final c in _overtime.values) {
      c.dispose();
    }
    super.dispose();
  }

  List<AttendanceLine> _lines(List<Worker> workers) {
    if (workers.isEmpty) return [AttendanceLine(mark: _groupMark)];
    return [
      for (final w in workers)
        AttendanceLine(
          workerId: w.id,
          mark: _marks[w.id] ?? AttendanceMark.present,
          overtimeHours: blankToNull(_ot(w.id).text),
        ),
    ];
  }

  Future<void> _save(LabourGroup group, List<Worker> workers) async {
    final l10n = context.l10n;
    if (!_form.currentState!.validate()) return;
    final owner = ref.read(queueOwnerProvider);
    final siteId = ref.read(currentSessionProvider)?.siteId;
    if (owner == null || siteId == null) return;

    final date = Formatters.isoDate(_date);
    if (widget.editId == null && _alreadyTaken(group.id, date)) {
      final proceed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          content: Text(l10n.attendanceAlreadyTaken),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(l10n.commonCancel),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(l10n.attendanceSaveAnyway),
            ),
          ],
        ),
      );
      if (proceed != true) return;
    }

    setState(() => _busy = true);
    final lines = _lines(workers);
    final payload = AttendancePayloads.roll(
      siteId: siteId,
      labourGroupId: group.id,
      date: date,
      lines: lines,
    );
    final title = l10n.attendanceEntryTitle(
      group.name,
      AttendancePayloads.presentCount(lines),
      lines.length,
    );
    if (widget.editId != null) {
      await ref
          .read(queueRepositoryProvider)
          .updateFailed(widget.editId!, payload: payload, title: title);
    } else {
      await ref
          .read(attendanceRepositoryProvider)
          .save(owner: owner, siteId: siteId, payload: payload, title: title);
    }
    ref.read(syncControllerProvider.notifier).kick();
    if (!mounted) return;
    showAppSnack(context, widget.editId != null ? l10n.savedCorrected : l10n.savedOffline);
    context.pop();
  }

  /// A second roll for the same gang and day is refused by the server
  /// (`uq_labour_attendance_*`); say so before it gets that far.
  bool _alreadyTaken(String groupId, String date) {
    final rows = ref.read(queueRowsProvider(QueueGroup.attendance)).value ?? const [];
    return rows.any(
      (r) =>
          r.status != QueueStatus.failed &&
          r.payloadMap['labourGroupId'] == groupId &&
          r.payloadMap['date'] == date,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final groups = ref.watch(labourGroupsProvider).value ?? const <LabourGroup>[];
    final group = groups.where((g) => g.id == _groupId).firstOrNull;
    final workers = _groupId == null
        ? const <Worker>[]
        : ref.watch(workersInGroupProvider(_groupId!)).value ?? const <Worker>[];

    return AppScaffold(
      title: l10n.attendanceTake,
      bottomAction: group == null
          ? null
          : AppButton(label: l10n.commonSave, busy: _busy, onPressed: () => _save(group, workers)),
      body: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (groups.isEmpty)
              EmptyView(message: l10n.attendanceNoGangs, icon: Icons.groups_outlined)
            else
              AppDropdown<String>(
                label: l10n.attendanceGang,
                value: _groupId,
                items: [for (final g in groups) AppDropdownItem(value: g.id, label: g.name)],
                onChanged: (v) => setState(() => _groupId = v),
              ),
            AppDateField(
              label: l10n.commonDate,
              value: _date,
              today: ref.read(clockProvider)(),
              onChanged: (d) => setState(() => _date = d),
            ),
            if (group != null && workers.isEmpty) ...[
              Text(l10n.attendanceWholeGang, style: text.bodyMedium),
              const SizedBox(height: AppSpacing.sm),
              _MarkPicker(value: _groupMark, onChanged: (m) => setState(() => _groupMark = m)),
            ],
            if (workers.isNotEmpty) ...[
              AppButton(
                label: l10n.attendanceAllPresent,
                icon: Icons.done_all,
                variant: AppButtonVariant.secondary,
                onPressed: () => setState(() {
                  for (final w in workers) {
                    _marks[w.id] = AttendanceMark.present;
                  }
                }),
              ),
              const SizedBox(height: AppSpacing.md),
              for (final w in workers) ...[
                _WorkerRow(
                  worker: w,
                  mark: _marks[w.id] ?? AttendanceMark.present,
                  overtime: _ot(w.id),
                  onChanged: (m) => setState(() => _marks[w.id] = m),
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _WorkerRow extends StatelessWidget {
  const _WorkerRow({
    required this.worker,
    required this.mark,
    required this.overtime,
    required this.onChanged,
  });

  final Worker worker;
  final AttendanceMark mark;
  final TextEditingController overtime;
  final ValueChanged<AttendanceMark> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AppCard(
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(worker.name, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          _MarkPicker(value: mark, onChanged: onChanged),
          const SizedBox(height: AppSpacing.sm),
          if (mark != AttendanceMark.absent)
            AppTextField(
              label: '${l10n.attendanceOvertime} (${l10n.commonOptional})',
              controller: overtime,
              kind: AppFieldKind.decimal,
              validator: (v) =>
                  isValidOvertime(v?.trim() ?? '') ? null : l10n.attendanceOvertimeInvalid,
            )
          else
            const SizedBox(height: AppSpacing.md),
        ],
      ),
    );
  }
}

/// Three big buttons — gloves, sunlight, a gang of forty.
class _MarkPicker extends StatelessWidget {
  const _MarkPicker({required this.value, required this.onChanged});

  final AttendanceMark value;
  final ValueChanged<AttendanceMark> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return SegmentedButton<AttendanceMark>(
      style: SegmentedButton.styleFrom(minimumSize: const Size(0, AppSpacing.touchTarget)),
      showSelectedIcon: false,
      segments: [
        ButtonSegment(value: AttendanceMark.present, label: Text(l10n.attendancePresent)),
        ButtonSegment(value: AttendanceMark.halfDay, label: Text(l10n.attendanceHalfDay)),
        ButtonSegment(value: AttendanceMark.absent, label: Text(l10n.attendanceAbsent)),
      ],
      selected: {value},
      onSelectionChanged: (s) => onChanged(s.single),
    );
  }
}
