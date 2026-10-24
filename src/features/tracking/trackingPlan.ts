import type {EmployeeInfo} from '../../api/types';

export type TrackingPlan = {track: true; stopAt: Date} | {track: false; reason: 'no-consent'};

/**
 * Once the employee has agreed (geo_status "2"), their location is shared all
 * the time, punched in or not, until they or the company turn sharing off.
 *
 * The tracker is given a stop time a week ahead, at midnight, so it stays the
 * same all day (no restarts) and is pushed on every time the app syncs. If the
 * app isn't opened for a week, sharing pauses until it is.
 */
export const ALWAYS_HORIZON_DAYS = 7;

export function planTracking(
  info: Pick<EmployeeInfo, 'geo_status' | 'punches' | 'shifts'> | null | undefined,
  now = new Date(),
): TrackingPlan {
  if (String(info?.geo_status ?? '') !== '2') {
    return {track: false, reason: 'no-consent'};
  }
  const stopAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ALWAYS_HORIZON_DAYS);
  return {track: true, stopAt};
}
