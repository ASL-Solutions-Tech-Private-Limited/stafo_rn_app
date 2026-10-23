import type {Holiday, MissedPunchRequest, MonthAttendanceRecord, ShiftWithDays} from '../../api/types';
import {atClock, formatClock, toDateKey} from '../../lib/date';
import {isWorkday} from '../people/dayStatus';

/** How many working days back (from yesterday) a punch-out can still be asked for. */
export const FIX_WINDOW_WORKING_DAYS = 3;

function isHoliday(dateKey: string, holidays: Pick<Holiday, 'start_date' | 'end_date'>[]) {
  return holidays.some(
    h => h.start_date.slice(0, 10) <= dateKey && dateKey <= (h.end_date || h.start_date).slice(0, 10),
  );
}

/**
 * The days a punch-out can be asked for: yesterday and the working days before
 * it, three working days in all. Week-offs and holidays don't count, and today
 * never does (punch out from home instead).
 */
export function fixableDates(
  shift: ShiftWithDays | null | undefined,
  holidays: Pick<Holiday, 'start_date' | 'end_date'>[] = [],
  now = new Date(),
): string[] {
  const out: string[] = [];
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let back = 1; back <= 21 && out.length < FIX_WINDOW_WORKING_DAYS; back++) {
    day.setDate(day.getDate() - 1);
    const key = toDateKey(day);
    if (isWorkday(shift ? [shift] : [], day) && !isHoliday(key, holidays)) {
      out.push(key);
    }
  }
  return out;
}

export type FixEligibility =
  | {ok: true}
  | {ok: false; reason: 'complete' | 'no-punch' | 'today' | 'too-old' | 'requested'; message: string};

/** Whether this day's missing punch-out can be asked for, or why not. */
export function punchFixEligibility(
  dateKey: string,
  record: Pick<MonthAttendanceRecord, 'in_time' | 'out_time'> | null | undefined,
  allowed: string[],
  requests: Pick<MissedPunchRequest, 'date' | 'status'>[],
  now = new Date(),
): FixEligibility {
  if (!record?.in_time) {
    return {ok: false, reason: 'no-punch', message: 'There’s no punch-in on this day to add a punch-out to.'};
  }
  if (record.out_time) {
    return {ok: false, reason: 'complete', message: ''};
  }
  if (dateKey >= toDateKey(now)) {
    return {ok: false, reason: 'today', message: 'Today isn’t editable. Punch out from the home screen.'};
  }
  const existing = requests.find(
    r => r.date.slice(0, 10) === dateKey && r.status.toLowerCase() !== 'rejected',
  );
  if (existing) {
    return {
      ok: false,
      reason: 'requested',
      message:
        existing.status.toLowerCase() === 'pending'
          ? 'You’ve asked for this already. Waiting for your manager.'
          : 'Your manager has already fixed this day.',
    };
  }
  if (!allowed.includes(dateKey)) {
    return {
      ok: false,
      reason: 'too-old',
      message:
        'Too long ago to ask from the app: punch-outs can be asked for up to 3 working days back. Talk to your manager.',
    };
  }
  return {ok: true};
}

/** A problem with the asked-for punch-out time, or null when it's fine. */
export function punchOutTimeError(dateKey: string, inTime: string | null | undefined, outHHmm: string) {
  const inAt = atClock(dateKey, inTime);
  const outAt = atClock(dateKey, outHHmm);
  if (!outAt) {
    return 'Pick the time you left.';
  }
  if (inAt && outAt <= inAt) {
    return `That’s before you punched in (${formatClock(inTime)}).`;
  }
  return null;
}

/** A sensible starting time: the shift's end if that's after the punch-in, else an hour after it (but on the same day). */
export function suggestedPunchOut(
  dateKey: string,
  inTime: string | null | undefined,
  shift?: ShiftWithDays | null,
) {
  const inAt = atClock(dateKey, inTime);
  const end = atClock(dateKey, shift?.end_time);
  const pick = end && (!inAt || end > inAt) ? end : inAt ? new Date(inAt.getTime() + 60 * 60_000) : null;
  if (!pick) {
    return '18:00';
  }
  if (toDateKey(pick) !== dateKey) {
    return '23:59';
  }
  return `${String(pick.getHours()).padStart(2, '0')}:${String(pick.getMinutes()).padStart(2, '0')}`;
}
