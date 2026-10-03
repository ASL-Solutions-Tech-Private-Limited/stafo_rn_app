import type {EmployeeInfo} from '../../api/types';
import {atClock, parseServerDate, toDateKey} from '../../lib/date';

/** How long after the shift ends tracking keeps going, for someone who forgets to punch out. */
export const AFTER_SHIFT_MS = 15 * 60_000;
/** With no shift on record, the most a punch-in can be tracked for. */
const NO_SHIFT_MAX_MS = 12 * 60 * 60_000;

export type TrackingPlan =
  | {track: true; stopAt: Date}
  | {track: false; reason: 'no-consent' | 'not-punched-in' | 'shift-over'};

/**
 * When the employee's location may be shared: they've agreed (geo_status "2"),
 * they're punched in, and it's no later than 15 minutes after their shift.
 * A night shift that ends past midnight ends the next morning.
 */
export function planTracking(
  info: Pick<EmployeeInfo, 'geo_status' | 'punches' | 'shifts'> | null | undefined,
  now = new Date(),
): TrackingPlan {
  if (String(info?.geo_status ?? '') !== '2') {
    return {track: false, reason: 'no-consent'};
  }
  const since = openPunchSince(info?.punches, now);
  if (!since) {
    return {track: false, reason: 'not-punched-in'};
  }
  const stopAt = shiftStop(info?.shifts?.[0], since);
  return stopAt.getTime() > now.getTime() ? {track: true, stopAt} : {track: false, reason: 'shift-over'};
}

/** The latest punch-in with no punch-out from the last day (a night shift crosses midnight). */
function openPunchSince(punches: EmployeeInfo['punches'], now: Date) {
  let latest: Date | null = null;
  for (const p of punches ?? []) {
    const inAt = parseServerDate(p.punch_in);
    if (!inAt || parseServerDate(p.punch_out) || now.getTime() - inAt.getTime() > 24 * 60 * 60_000) {
      continue;
    }
    if (!latest || inAt > latest) {
      latest = inAt;
    }
  }
  return latest;
}

function shiftStop(shift: {start_time?: string | null; end_time?: string | null} | undefined, since: Date) {
  const day = toDateKey(since);
  const start = atClock(day, shift?.start_time);
  const end = atClock(day, shift?.end_time);
  if (!end) {
    return new Date(since.getTime() + NO_SHIFT_MAX_MS);
  }
  if (start && end <= start) {
    end.setDate(end.getDate() + 1);
  }
  return new Date(end.getTime() + AFTER_SHIFT_MS);
}
