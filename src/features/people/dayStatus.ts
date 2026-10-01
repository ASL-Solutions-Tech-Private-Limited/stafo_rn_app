import type {CompanyEmployee, ShiftWithDays} from '../../api/types';
import {atClock, parseServerDate, toDateKey} from '../../lib/date';

export type DayStatusKind =
  | 'working'
  | 'present'
  | 'half-day'
  | 'not-in'
  | 'absent'
  | 'leave'
  | 'week-off'
  | 'holiday'
  | 'upcoming';

export type DayStatus = {
  kind: DayStatusKind;
  inAt?: Date | null;
  outAt?: Date | null;
  /** Completed time plus live time for an open session (as of `now`). */
  workedMs: number;
};

/** Filter groups shown as chips on the People tab. */
export type StatusGroup = 'in' | 'not-in' | 'absent' | 'leave' | 'off';

export const GROUP_OF: Record<DayStatusKind, StatusGroup> = {
  working: 'in',
  present: 'in',
  'half-day': 'in',
  'not-in': 'not-in',
  upcoming: 'not-in',
  absent: 'absent',
  leave: 'leave',
  'week-off': 'off',
  holiday: 'off',
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** Whether the employee's shift includes this weekday. Unknown (no day flags) counts as a workday. */
export function isWorkday(shifts: ShiftWithDays[] | null | undefined, day: Date) {
  const shift = shifts?.[0];
  if (!shift) {
    return true;
  }
  const flag = shift[WEEKDAYS[day.getDay()]];
  return flag == null ? true : Number(flag) === 1;
}

const atTime = atClock;

/**
 * One status for an employee on `dateKey`, from (in priority order) live
 * punches, the server's daily attendance record, leave, and the shift calendar.
 */
export function getDayStatus(
  employee: CompanyEmployee,
  dateKey: string,
  opts: {now?: Date; onLeaveIds?: Set<number>} = {},
): DayStatus {
  const now = opts.now ?? new Date();
  const todayKey = toDateKey(now);
  const day = parseServerDate(dateKey) ?? now;

  const punches = (employee.punches ?? []).filter(p => {
    const inAt = parseServerDate(p.punch_in);
    return inAt && toDateKey(inAt) === dateKey;
  });

  if (punches.length) {
    let workedMs = 0;
    let open: Date | null = null;
    let firstInMs = Infinity;
    let lastOutMs = -Infinity;
    for (const p of punches) {
      const inAt = parseServerDate(p.punch_in)!;
      const outAt = parseServerDate(p.punch_out);
      firstInMs = Math.min(firstInMs, inAt.getTime());
      if (outAt) {
        workedMs += Math.max(0, outAt.getTime() - inAt.getTime());
        lastOutMs = Math.max(lastOutMs, outAt.getTime());
      } else {
        open = inAt;
      }
    }
    const firstIn = new Date(firstInMs);
    const lastOut = Number.isFinite(lastOutMs) ? new Date(lastOutMs) : null;
    // An open session only counts as "working" today; older ones were never closed.
    if (open && dateKey === todayKey) {
      return {kind: 'working', inAt: firstIn, workedMs: workedMs + (now.getTime() - open.getTime())};
    }
    return {kind: 'present', inAt: firstIn, outAt: lastOut, workedMs};
  }

  const record = (employee.attendances ?? []).find(a => a.date === dateKey);
  if (record) {
    const text = record.attendance.toLowerCase();
    const inAt = atTime(dateKey, record.in_time);
    const outAt = atTime(dateKey, record.out_time);
    const workedMs = inAt && outAt ? Math.max(0, outAt.getTime() - inAt.getTime()) : 0;
    if (text.includes('leave')) {
      return {kind: 'leave', workedMs: 0};
    }
    if (text.includes('holiday')) {
      return {kind: 'holiday', workedMs: 0};
    }
    if (text.includes('week') || text.includes('off')) {
      return {kind: 'week-off', workedMs: 0};
    }
    if (text.includes('present')) {
      return {kind: record.halfday ? 'half-day' : 'present', inAt, outAt, workedMs};
    }
    if (text.includes('absent') && dateKey !== todayKey) {
      return {kind: 'absent', workedMs: 0};
    }
  }

  if (opts.onLeaveIds?.has(employee.id)) {
    return {kind: 'leave', workedMs: 0};
  }
  if (!isWorkday(employee.shifts, day)) {
    return {kind: 'week-off', workedMs: 0};
  }
  if (dateKey > todayKey) {
    return {kind: 'upcoming', workedMs: 0};
  }
  if (dateKey === todayKey) {
    // Once today's shift is over without a punch, it's a miss, not "not in yet".
    return {kind: shiftHasEnded(employee.shifts, dateKey, now) ? 'absent' : 'not-in', workedMs: 0};
  }
  return {kind: 'absent', workedMs: 0};
}

/** True once the shift's end time has passed. Overnight shifts (end before start) end tomorrow. */
export function shiftHasEnded(shifts: ShiftWithDays[] | null | undefined, dateKey: string, now: Date) {
  const shift = shifts?.[0];
  const start = atTime(dateKey, shift?.start_time);
  const end = atTime(dateKey, shift?.end_time);
  if (!start || !end) {
    return false;
  }
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  return now > end;
}
