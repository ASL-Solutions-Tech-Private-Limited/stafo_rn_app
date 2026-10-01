import type {LeaveRequestRecord, MonthAttendanceRecord, ShiftWithDays} from '../../api/types';
import {atClock, parseServerDate, toDateKey} from '../../lib/date';
import {isWorkday} from './dayStatus';

/** Minutes after shift start before a punch-in counts as late. */
export const LATE_GRACE_MINUTES = 10;

export type CalendarDayKind =
  | 'present'
  | 'late'
  | 'half-day'
  | 'absent'
  | 'leave'
  | 'off'
  | 'future'
  | 'none';

export type CalendarDay = {
  dateKey: string;
  day: number;
  kind: CalendarDayKind;
  isToday: boolean;
  record?: MonthAttendanceRecord;
  leave?: LeaveRequestRecord;
};

function workedMs(r: MonthAttendanceRecord) {
  const inAt = atClock(r.date, r.in_time);
  const outAt = atClock(r.date, r.out_time);
  return inAt && outAt ? Math.max(0, outAt.getTime() - inAt.getTime()) : 0;
}

export function isLate(
  r: MonthAttendanceRecord,
  shift?: ShiftWithDays | null,
  graceMinutes = LATE_GRACE_MINUTES,
) {
  const inAt = atClock(r.date, r.in_time);
  const start = atClock(r.date, shift?.start_time);
  if (!inAt || !start) {
    return false;
  }
  return inAt.getTime() - start.getTime() > graceMinutes * 60_000;
}

function isPresentText(text: string) {
  return text.toLowerCase().includes('present');
}

/** Approved leave covering a given date, if any. */
function leaveOn(dateKey: string, leaves: LeaveRequestRecord[]) {
  return leaves.find(l => l.status === 'approved' && l.from_date <= dateKey && dateKey <= l.to_date);
}

/** One entry per day of `month` ("yyyy-MM") with a display state. */
export function buildMonth(
  month: string,
  records: MonthAttendanceRecord[],
  leaves: LeaveRequestRecord[],
  shift?: ShiftWithDays | null,
  now = new Date(),
): CalendarDay[] {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayKey = toDateKey(now);
  const byDate = new Map(records.map(r => [r.date, r]));
  const days: CalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m - 1, d);
    const dateKey = toDateKey(date);
    const record = byDate.get(dateKey);
    const leave = leaveOn(dateKey, leaves);
    let kind: CalendarDayKind;

    if (record && isPresentText(record.attendance)) {
      kind = record.halfday ? 'half-day' : isLate(record, shift) ? 'late' : 'present';
    } else if (leave || record?.attendance.toLowerCase().includes('leave')) {
      kind = 'leave';
    } else if (dateKey > todayKey) {
      kind = 'future';
    } else if (!isWorkday(shift ? [shift] : [], date)) {
      kind = 'off';
    } else if (record && record.attendance.toLowerCase().includes('absent')) {
      kind = dateKey === todayKey ? 'none' : 'absent';
    } else {
      kind = dateKey === todayKey ? 'none' : record ? 'none' : 'absent';
    }

    days.push({dateKey, day: d, kind, isToday: dateKey === todayKey, record, leave});
  }
  return days;
}

export type MonthSummary = {
  present: number;
  late: number;
  absent: number;
  leave: number;
  avgWorkedMs: number;
};

export function summarizeMonth(days: CalendarDay[]): MonthSummary {
  let present = 0;
  let late = 0;
  let absent = 0;
  let leave = 0;
  let totalMs = 0;
  let timed = 0;
  for (const d of days) {
    if (d.kind === 'present' || d.kind === 'late' || d.kind === 'half-day') {
      present += 1;
      if (d.kind === 'late') {
        late += 1;
      }
      const ms = d.record ? workedMs(d.record) : 0;
      if (ms > 0) {
        totalMs += ms;
        timed += 1;
      }
    } else if (d.kind === 'absent') {
      absent += 1;
    } else if (d.kind === 'leave') {
      leave += 1;
    }
  }
  return {present, late, absent, leave, avgWorkedMs: timed ? totalMs / timed : 0};
}

export function dayWorkedMs(d: CalendarDay) {
  return d.record ? workedMs(d.record) : 0;
}

export type LeaveBalance = {
  key: string;
  name: string;
  /** Yearly allowance, when the leave type defines one. */
  allowance: number | null;
  used: number;
  pending: number;
};

function leaveDays(l: LeaveRequestRecord) {
  if (l.days && l.days > 0) {
    return l.days;
  }
  const from = parseServerDate(l.from_date);
  const to = parseServerDate(l.to_date);
  return from && to ? Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1 : 1;
}

/**
 * Used and pending days per leave type in `year`, with allowance when known.
 * Types with a known allowance are listed even when nothing was taken this
 * year, so admins always see the full balance.
 */
export function leaveBalances(leaves: LeaveRequestRecord[], year = new Date().getFullYear()): LeaveBalance[] {
  const map = new Map<string, LeaveBalance>();
  for (const l of leaves) {
    const inYear = l.from_date.startsWith(String(year));
    const allowance = l.leavetype?.no_of_days ?? null;
    if (!inYear && allowance == null) {
      continue;
    }
    const key = String(l.leavetype?.id ?? l.leave_type ?? 'other');
    const entry = map.get(key) ?? {
      key,
      name: l.leavetype?.name ?? 'Leave',
      allowance,
      used: 0,
      pending: 0,
    };
    if (inYear && l.status === 'approved') {
      entry.used += leaveDays(l);
    } else if (inYear && l.status === 'pending') {
      entry.pending += leaveDays(l);
    }
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export {leaveDays};

/** Other people with approved leave overlapping this request. */
export function othersOffDuring(request: LeaveRequestRecord, companyLeaves: LeaveRequestRecord[]) {
  const names = new Set<string>();
  for (const l of companyLeaves) {
    if (l.employee_id === request.employee_id || l.status !== 'approved') {
      continue;
    }
    if (l.from_date <= request.to_date && request.from_date <= l.to_date) {
      names.add(l.employee_basic_info?.name ?? `#${l.employee_id}`);
    }
  }
  return [...names];
}
