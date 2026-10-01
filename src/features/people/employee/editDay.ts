import type {DailyAttendance, ShiftWithDays} from '../../../api/types';
import {atClock, parseClock, toDateKey} from '../../../lib/date';
import {LATE_GRACE_MINUTES} from '../employeeInsights';

export type EditStatus = 'present' | 'half' | 'absent' | 'leave';

export type EditDayState = {
  status: EditStatus;
  /** "HH:mm", 24-hour. */
  inTime: string | null;
  outTime: string | null;
};

/** "9:05:00", "09:05" or "09:05 AM" → "09:05". */
export function toHHmm(value?: string | null): string | null {
  const c = parseClock(value);
  return c ? `${String(c.hours).padStart(2, '0')}:${String(c.minutes).padStart(2, '0')}` : null;
}

export function initialEdit(record: DailyAttendance): EditDayState {
  const text = record.attendance.toLowerCase();
  const status: EditStatus = text.includes('absent')
    ? 'absent'
    : text.includes('leave')
    ? 'leave'
    : record.halfday || text.includes('half')
    ? 'half'
    : 'present';
  return {status, inTime: toHHmm(record.in_time), outTime: toHHmm(record.out_time)};
}

const hasTimes = (s: EditStatus) => s === 'present' || s === 'half';

/** A message describing what's wrong, or null when the edit can be saved. */
export function validateEdit(state: EditDayState, dateKey: string, now = new Date()): string | null {
  if (!hasTimes(state.status)) {
    return null;
  }
  if (!state.inTime) {
    return 'Add the in time.';
  }
  const inAt = atClock(dateKey, state.inTime)!;
  const isToday = dateKey === toDateKey(now);
  if (isToday && inAt > now) {
    return "In time can't be later than now.";
  }
  if (!state.outTime) {
    // Someone still at work today can be saved without an out time.
    return isToday ? null : 'Add the out time.';
  }
  const outAt = atClock(dateKey, state.outTime)!;
  if (outAt <= inAt) {
    return 'Out time must be after the in time.';
  }
  if (isToday && outAt > now) {
    return "Out time can't be later than now.";
  }
  return null;
}

export function isChanged(state: EditDayState, original: EditDayState) {
  if (state.status !== original.status) {
    return true;
  }
  return hasTimes(state.status) && (state.inTime !== original.inTime || state.outTime !== original.outTime);
}

/**
 * Body fields for attendance/update. Times the admin didn't touch are sent back exactly
 * as recorded, so their seconds aren't lost.
 */
export function toUpdateFields(state: EditDayState, record?: DailyAttendance | null) {
  const times = hasTimes(state.status);
  const keep = (value: string | null, recorded?: string | null) =>
    recorded && toHHmm(recorded) === value ? recorded : value;
  return {
    attendance: state.status === 'absent' ? 'Absent' : state.status === 'leave' ? 'Leave' : 'Present',
    halfday: state.status === 'half' ? 1 : 0,
    in_time: times ? keep(state.inTime, record?.in_time) : null,
    out_time: times ? keep(state.outTime, record?.out_time) : null,
  };
}

/** Worked time and whether they came in late, for the live check under the times. */
export function editSummary(state: EditDayState, dateKey: string, shift?: ShiftWithDays | null) {
  if (!hasTimes(state.status) || !state.inTime) {
    return null;
  }
  const inAt = atClock(dateKey, state.inTime)!;
  const outAt = state.outTime ? atClock(dateKey, state.outTime) : null;
  const start = atClock(dateKey, shift?.start_time);
  return {
    workedMs: outAt && outAt > inAt ? outAt.getTime() - inAt.getTime() : null,
    /** null when there's no shift to compare against. */
    late: start ? inAt.getTime() - start.getTime() > LATE_GRACE_MINUTES * 60_000 : null,
  };
}
