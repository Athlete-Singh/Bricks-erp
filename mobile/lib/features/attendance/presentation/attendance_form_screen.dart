import 'package:brics_mobile/core/l10n/l10n.dart';
import 'package:brics_mobile/core/providers.dart';
import 'package:brics_mobile/core/sync/queue_repository.dart';
import 'package:brics_mobile/core/theme/app_colors.dart';
import 'package:brics_mobile/core/theme/app_motion.dart';
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
    final groups = ref.watch(labourGroupsProvider).value ?? const <LabourGroup>[];
    final group = groups.where((g) => g.id == _groupId).firstOrNull;
    final workers = _groupId == null
        ? const <Worker>[]
        : ref.watch(workersInGroupProvider(_groupId!)).value ?? const <Worker>[];
    final lines = group == null ? const <AttendanceLine>[] : _lines(workers);
    int count(AttendanceMark m) => lines.where((l) => l.mark == m).length;

    return AppScaffold(
      title: l10n.attendanceTake,
      subtitle: Formatters.displayDate(_date),
      header: group == null
          ? null
          : Row(
              children: [
                _Tally(
                  label: l10n.attendancePresent,
                  value: count(AttendanceMark.present),
                  color: AppPalette.primary300,
                ),
                _Tally(
                  label: l10n.attendanceHalfDay,
                  value: count(AttendanceMark.halfDay),
                  color: AppPalette.accent300,
                ),
                _Tally(
                  label: l10n.attendanceAbsent,
                  value: count(AttendanceMark.absent),
                  color: const Color(0xFFFCA5A5),
                ),
              ],
            ),
      bottomAction: group == null
          ? null
          : AppButton(
              label: l10n.commonSave,
              icon: Icons.check_rounded,
              busy: _busy,
              onPressed: () => _save(group, workers),
            ),
      body: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (groups.isEmpty)
              EmptyView(message: l10n.attendanceNoGangs, icon: Icons.groups_outlined)
            else
              Entrance(
                child: FormSection(
                  title: l10n.attendanceGangAndDate,
                  icon: Icons.groups_rounded,
                  children: [
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
                  ],
                ),
              ),
            if (groups.isNotEmpty && group == null)
              Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Text(
                  l10n.attendancePickGang,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            if (group != null && workers.isEmpty)
              Entrance(
                index: 1,
                child: FormSection(
                  title: group.name,
                  hint: l10n.attendanceWholeGang,
                  icon: Icons.groups_2_rounded,
                  children: [
                    _MarkPicker(
                      value: _groupMark,
                      onChanged: (m) => setState(() => _groupMark = m),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                  ],
                ),
              ),
            if (workers.isNotEmpty) ...[
              SectionLabel(
                '${l10n.attendanceWorkers} · ${l10n.attendanceWorkersCount(workers.length)}',
                trailing: TextButton.icon(
                  icon: const Icon(Icons.done_all_rounded, size: 18),
                  label: Text(l10n.attendanceAllPresent),
                  onPressed: () => setState(() {
                    for (final w in workers) {
                      _marks[w.id] = AttendanceMark.present;
                    }
                  }),
                ),
              ),
              for (final (i, w) in workers.indexed) ...[
                Entrance(
                  index: i + 1,
                  child: _WorkerRow(
                    worker: w,
                    mark: _marks[w.id] ?? AttendanceMark.present,
                    overtime: _ot(w.id),
                    onChanged: (m) => setState(() => _marks[w.id] = m),
                  ),
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

/// A count in the header that rolls as marks change.
class _Tally extends StatelessWidget {
  const _Tally({required this.label, required this.value, required this.color});

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: text.labelSmall?.copyWith(color: Colors.white.withValues(alpha: 0.8)),
              ),
            ],
          ),
          AnimatedCount(
            value: value,
            style: text.headlineSmall?.copyWith(color: Colors.white),
          ),
        ],
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

  static const List<Color> _avatarColors = [
    AppPalette.brick,
    AppPalette.info600,
    AppPalette.accent600,
    AppPalette.primary600,
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final initials = worker.name
        .trim()
        .split(RegExp(r'\s+'))
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();
    final tint = _avatarColors[worker.name.hashCode.abs() % _avatarColors.length];

    return AppCard(
      accent: switch (mark) {
        AttendanceMark.present => colors.success,
        AttendanceMark.halfDay => colors.warning,
        AttendanceMark.absent => colors.danger,
      },
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: tint.withValues(alpha: 0.14),
                ),
                child: Text(
                  initials,
                  style: text.labelSmall?.copyWith(color: tint, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(worker.name, style: text.titleSmall, overflow: TextOverflow.ellipsis),
              ),
              // Overtime sits beside the name, out of the way; an absent worker has none.
              if (mark != AttendanceMark.absent)
                SizedBox(
                  width: 92,
                  child: TextFormField(
                    controller: overtime,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    textAlign: TextAlign.end,
                    style: text.bodyMedium,
                    decoration: InputDecoration(
                      hintText: l10n.attendanceOvertimeShort,
                      suffixText: 'h',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.sm,
                      ),
                    ),
                    validator: (v) =>
                        isValidOvertime(v?.trim() ?? '') ? null : l10n.attendanceOvertimeInvalid,
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          _MarkPicker(value: mark, onChanged: onChanged),
        ],
      ),
    );
  }
}

/// Three equal buttons — gloves, sunlight, a gang of forty. The chosen one fills
/// with its colour; the others stay quiet.
class _MarkPicker extends StatelessWidget {
  const _MarkPicker({required this.value, required this.onChanged});

  final AttendanceMark value;
  final ValueChanged<AttendanceMark> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = context.colors;
    final text = Theme.of(context).textTheme;
    final options = [
      (AttendanceMark.present, l10n.attendancePresent, Icons.check_circle_rounded, colors.success),
      (AttendanceMark.halfDay, l10n.attendanceHalfDay, Icons.timelapse_rounded, colors.warning),
      (AttendanceMark.absent, l10n.attendanceAbsent, Icons.cancel_rounded, colors.danger),
    ];
    return Row(
      children: [
        for (final (i, (mark, label, icon, color)) in options.indexed) ...[
          if (i > 0) const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Semantics(
              selected: value == mark,
              button: true,
              child: Pressable(
                onTap: () => onChanged(mark),
                child: AnimatedContainer(
                  duration: AppMotion.medium,
                  curve: AppMotion.enter,
                  height: 40,
                  decoration: BoxDecoration(
                    color: value == mark ? color : colors.surfaceMuted,
                    borderRadius: BorderRadius.circular(AppRadius.button),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        icon,
                        size: 16,
                        color: value == mark ? Colors.white : colors.mutedForeground,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          label,
                          overflow: TextOverflow.ellipsis,
                          style: text.labelMedium?.copyWith(
                            color: value == mark ? Colors.white : colors.foreground,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
