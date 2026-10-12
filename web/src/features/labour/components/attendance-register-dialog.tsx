'use client';

import { useEffect, useState } from 'react';
import { AttendanceStatus, todayISO, type CreateAttendanceInput } from '@brics/shared';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { fieldErrorsOf, messageOf, useSession } from '@/features/auth/use-auth';
import { useLabourGroups, useRecordAttendance, useWorkers } from '@/features/labour/hooks';

export interface AttendanceRegisterDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSiteId?: string;
  defaultGroupId?: string;
}

interface WorkerAttendanceRow {
  workerId: string;
  name: string;
  status: AttendanceStatus;
  overtimeHours: string;
  remarks: string;
}

export function AttendanceRegisterDialog({
  open,
  onClose,
  defaultSiteId,
  defaultGroupId,
}: AttendanceRegisterDialogProps) {
  const { sites, activeSiteId } = useSession();
  const [siteId, setSiteId] = useState(defaultSiteId || activeSiteId || sites[0]?.id || '');
  const [labourGroupId, setLabourGroupId] = useState(defaultGroupId || '');
  const [date, setDate] = useState(todayISO());

  const { data: groups, isLoading: loadingGroups } = useLabourGroups({
    siteId: siteId || undefined,
  });

  const { data: roster, isLoading: loadingRoster } = useWorkers({
    labourGroupId: labourGroupId || undefined,
  });

  const [entries, setEntries] = useState<WorkerAttendanceRow[]>([]);
  // Fallback state if group has no registered workers
  const [groupFallbackStatus, setGroupFallbackStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [groupFallbackOvertime, setGroupFallbackOvertime] = useState('');
  const [groupFallbackRemarks, setGroupFallbackRemarks] = useState('');

  const mutation = useRecordAttendance();
  const serverFieldErrors = fieldErrorsOf(mutation.error);
  const generalError = mutation.isError && Object.keys(serverFieldErrors).length === 0;

  useEffect(() => {
    if (defaultSiteId) {
      setSiteId(defaultSiteId);
    } else if (activeSiteId && !siteId) {
      setSiteId(activeSiteId);
    } else if (sites[0]?.id && !siteId) {
      setSiteId(sites[0].id);
    }
  }, [defaultSiteId, activeSiteId, sites, siteId]);

  useEffect(() => {
    if (defaultGroupId) {
      setLabourGroupId(defaultGroupId);
    }
  }, [defaultGroupId]);

  // Sync entries when roster loads for selected group
  useEffect(() => {
    if (roster && roster.length > 0) {
      setEntries(
        roster.map((w) => ({
          workerId: w.id,
          name: w.name,
          status: AttendanceStatus.PRESENT,
          overtimeHours: '',
          remarks: '',
        })),
      );
    } else {
      setEntries([]);
    }
  }, [roster]);

  const close = () => {
    mutation.reset();
    setLabourGroupId(defaultGroupId || '');
    setDate(todayISO());
    setEntries([]);
    setGroupFallbackStatus(AttendanceStatus.PRESENT);
    setGroupFallbackOvertime('');
    setGroupFallbackRemarks('');
    onClose();
  };

  const updateEntry = (index: number, patch: Partial<Omit<WorkerAttendanceRow, 'workerId' | 'name'>>) => {
    setEntries((prev) => {
      const next = [...prev];
      const current = next[index];
      if (current) {
        next[index] = { ...current, ...patch };
      }
      return next;
    });
  };

  const markAllPresent = () => {
    setEntries((prev) => prev.map((e) => ({ ...e, status: AttendanceStatus.PRESENT })));
    setGroupFallbackStatus(AttendanceStatus.PRESENT);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !labourGroupId || !date) return;

    let payloadEntries: CreateAttendanceInput['entries'];

    if (entries.length > 0) {
      payloadEntries = entries.map((e) => ({
        workerId: e.workerId,
        status: e.status,
        overtimeHours: e.overtimeHours.trim() ? e.overtimeHours.trim() : null,
        remarks: e.remarks.trim() ? e.remarks.trim() : null,
      }));
    } else {
      // Group-level attendance entry
      payloadEntries = [
        {
          workerId: null,
          status: groupFallbackStatus,
          overtimeHours: groupFallbackOvertime.trim() ? groupFallbackOvertime.trim() : null,
          remarks: groupFallbackRemarks.trim() ? groupFallbackRemarks.trim() : null,
        },
      ];
    }

    mutation.mutate(
      {
        siteId,
        labourGroupId,
        date,
        entries: payloadEntries,
      },
      {
        onSuccess: close,
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Attendance Register (LAB-02)"
      description="Record daily muster roll and overtime hours for labour groups at the kiln."
      className="max-w-3xl"
    >
      <form id="attendance-register-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {generalError && (
          <Alert variant="error">{messageOf(mutation.error, 'Could not record attendance register')}</Alert>
        )}

        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4 border-0 p-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              id="att-site"
              label="Kiln / Site *"
              value={siteId}
              required
              error={serverFieldErrors.siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setLabourGroupId('');
              }}
            >
              <option value="">Select kiln…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select
              id="att-group"
              label="Labour Group *"
              value={labourGroupId}
              required
              disabled={loadingGroups}
              error={serverFieldErrors.labourGroupId}
              onChange={(e) => setLabourGroupId(e.target.value)}
            >
              <option value="">{loadingGroups ? 'Loading groups…' : 'Select labour group…'}</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.sardarParty?.name ?? 'Sardar'})
                </option>
              ))}
            </Select>

            <Input
              id="att-date"
              label="Attendance Date *"
              type="date"
              required
              value={date}
              error={serverFieldErrors.date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {labourGroupId && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Workers Muster Roll ({entries.length > 0 ? `${entries.length} workers` : 'Group Entry'})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={markAllPresent}
                  className="min-h-[44px] h-9 text-xs font-medium"
                >
                  ✓ Mark All Present
                </Button>
              </div>

              {loadingRoster ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Loading worker roster…</p>
              ) : entries.length > 0 ? (
                <div className="max-h-72 flex flex-col gap-3 overflow-y-auto pr-1">
                  {entries.map((entry, idx) => (
                    <div
                      key={entry.workerId}
                      className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="min-w-0 sm:w-44">
                        <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                      </div>

                      {/* Touch-friendly status buttons with min-h-[44px] */}
                      <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                        <button
                          type="button"
                          onClick={() => updateEntry(idx, { status: AttendanceStatus.PRESENT })}
                          aria-label={`Mark ${entry.name} Present`}
                          className={cn(
                            'min-h-[44px] rounded-md px-2 py-1 text-xs font-medium transition-colors touch-manipulation',
                            entry.status === AttendanceStatus.PRESENT
                              ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-700'
                              : 'border border-border bg-surface text-muted-foreground hover:bg-surface-muted',
                          )}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEntry(idx, { status: AttendanceStatus.HALF_DAY })}
                          aria-label={`Mark ${entry.name} Half Day`}
                          className={cn(
                            'min-h-[44px] rounded-md px-2 py-1 text-xs font-medium transition-colors touch-manipulation',
                            entry.status === AttendanceStatus.HALF_DAY
                              ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-700'
                              : 'border border-border bg-surface text-muted-foreground hover:bg-surface-muted',
                          )}
                        >
                          Half Day
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEntry(idx, { status: AttendanceStatus.ABSENT })}
                          aria-label={`Mark ${entry.name} Absent`}
                          className={cn(
                            'min-h-[44px] rounded-md px-2 py-1 text-xs font-medium transition-colors touch-manipulation',
                            entry.status === AttendanceStatus.ABSENT
                              ? 'bg-danger text-white shadow-sm ring-1 ring-red-700'
                              : 'border border-border bg-surface text-muted-foreground hover:bg-surface-muted',
                          )}
                        >
                          Absent
                        </button>
                      </div>

                      {/* Overtime and Remarks */}
                      <div className="grid grid-cols-2 gap-2 sm:flex-1">
                        <Input
                          aria-label={`Overtime hours for ${entry.name}`}
                          inputMode="decimal"
                          placeholder="OT hrs (0.0)"
                          className="min-h-[44px] h-9 text-xs"
                          value={entry.overtimeHours}
                          onChange={(e) => updateEntry(idx, { overtimeHours: e.target.value })}
                        />
                        <Input
                          aria-label={`Remarks for ${entry.name}`}
                          placeholder="Remarks…"
                          className="min-h-[44px] h-9 text-xs"
                          value={entry.remarks}
                          onChange={(e) => updateEntry(idx, { remarks: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-2">
                  <p className="text-xs text-muted-foreground">
                    No individual workers registered in this group. Recording group-level attendance:
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Group Status</label>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => setGroupFallbackStatus(AttendanceStatus.PRESENT)}
                          className={cn(
                            'min-h-[44px] rounded-md px-1 text-xs font-medium transition-colors',
                            groupFallbackStatus === AttendanceStatus.PRESENT
                              ? 'bg-brand-600 text-white'
                              : 'border border-border bg-surface text-muted-foreground hover:bg-surface-muted',
                          )}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupFallbackStatus(AttendanceStatus.HALF_DAY)}
                          className={cn(
                            'min-h-[44px] rounded-md px-1 text-xs font-medium transition-colors',
                            groupFallbackStatus === AttendanceStatus.HALF_DAY
                              ? 'bg-amber-600 text-white'
                              : 'border border-border bg-surface text-muted-foreground hover:bg-surface-muted',
                          )}
                        >
                          Half Day
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupFallbackStatus(AttendanceStatus.ABSENT)}
                          className={cn(
                            'min-h-[44px] rounded-md px-1 text-xs font-medium transition-colors',
                            groupFallbackStatus === AttendanceStatus.ABSENT
                              ? 'bg-danger text-white'
                              : 'border border-border bg-surface text-muted-foreground hover:bg-surface-muted',
                          )}
                        >
                          Absent
                        </button>
                      </div>
                    </div>

                    <Input
                      id="att-fallback-ot"
                      label="Overtime (hrs)"
                      inputMode="decimal"
                      placeholder="0.0"
                      className="min-h-[44px]"
                      value={groupFallbackOvertime}
                      onChange={(e) => setGroupFallbackOvertime(e.target.value)}
                    />
                    <Input
                      id="att-fallback-remarks"
                      label="Remarks"
                      placeholder="Group attendance notes…"
                      className="min-h-[44px]"
                      value={groupFallbackRemarks}
                      onChange={(e) => setGroupFallbackRemarks(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            type="submit"
            form="attendance-register-form"
            disabled={mutation.isPending || !labourGroupId}
            className="min-h-[44px]"
          >
            {mutation.isPending ? 'Saving register…' : 'Record Attendance'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
