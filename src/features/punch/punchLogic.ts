import type {Branch, Shift} from '../../api/types';
import {atClock, toDateKey} from '../../lib/date';
import {metersBetween} from '../location/track';
import {LATE_GRACE_MINUTES} from '../people/employeeInsights';

export type PunchDirection = 'in' | 'out';

/** Minutes after the shift start (beyond the grace period) they punched in; 0 when on time. */
export function minutesLate(at: Date, shift?: Pick<Shift, 'start_time'> | null) {
  const start = atClock(toDateKey(at), shift?.start_time);
  if (!start) {
    return 0;
  }
  const late = Math.round((at.getTime() - start.getTime()) / 60_000);
  return late > LATE_GRACE_MINUTES ? late : 0;
}

/** "on time", "12 min late", "1 h 5 min late" */
export function lateLabel(minutes: number) {
  if (minutes <= 0) {
    return 'on time';
  }
  if (minutes < 60) {
    return `${minutes} min late`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h${m ? ` ${m} min` : ''} late`;
}

export type FenceCheck =
  | {kind: 'no-fence'}
  | {kind: 'inside'; distanceM: number; radiusM: number}
  | {kind: 'outside'; distanceM: number; radiusM: number};

/**
 * Where they stand against their branch's geofence. Accuracy is the phone's
 * error radius: give them the benefit of it, as a GPS fix can wobble.
 */
export function checkFence(
  branch: Pick<Branch, 'latitude' | 'longitude' | 'radar'> | null | undefined,
  here: {latitude: number; longitude: number; accuracy?: number | null},
): FenceCheck {
  const lat = Number(branch?.latitude);
  const lng = Number(branch?.longitude);
  const radius = Number(branch?.radar);
  if (
    !branch?.latitude ||
    !branch?.longitude ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !(radius > 0)
  ) {
    return {kind: 'no-fence'};
  }
  const distanceM = metersBetween({latitude: lat, longitude: lng}, here);
  const slack = Math.min(Math.max(here.accuracy ?? 0, 0), 50);
  return {kind: distanceM - slack <= radius ? 'inside' : 'outside', distanceM, radiusM: radius};
}
