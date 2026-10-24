import {useEffect} from 'react';
import {AppState} from 'react-native';
import * as StafoLocation from 'stafo-location';
import type {EmployeeInfo} from '../../api/types';
import {API_BASE_URL} from '../../config/env';
import {onSignOut, useSession} from '../../store/session';
import {getActiveTrip} from './activeTrip';
import {planTracking} from './trackingPlan';

onSignOut(() => StafoLocation.stopTracking().catch(() => {}));

let last: {info: EmployeeInfo | null | undefined; companyName?: string | null} = {info: null};

/**
 * Brings the native tracker in line with the server: on all the time while
 * they've agreed, off otherwise. Runs whenever the dashboard changes and when
 * the app comes back to the foreground, so turning sharing off stops it on the
 * next refresh.
 *
 * A trip on the road comes first: its route is recorded until it's paused or
 * ended (or 12 hours pass), punched in or not.
 */
export async function syncTracking(info: EmployeeInfo | null | undefined, companyName?: string | null) {
  last = {info, companyName};
  const session = useSession.getState();
  const token = session.token;
  const employeeId = info?.id ?? session.employee?.id;
  const trip = session.role === 'employee' ? getActiveTrip() : null;
  const plan = planTracking(info);
  if (!token || !employeeId || (!trip && (!plan.track || !info))) {
    await StafoLocation.stopTracking();
    return plan;
  }
  const stopAt = trip ? trip.stopAt : (plan as {stopAt: Date}).stopAt.getTime();
  const state = await StafoLocation.getTrackingState();
  if (state.running && state.stopAt === stopAt && (state.tripId || 0) === (trip?.id ?? 0)) {
    return plan;
  }
  const permission = await StafoLocation.getPermissionStatus();
  if (permission === 'denied' || permission === 'undetermined') {
    return plan;
  }
  await StafoLocation.startTracking({
    baseUrl: API_BASE_URL,
    token,
    employeeId,
    stopAt,
    ...(trip
      ? {
          tripId: trip.id,
          notificationTitle: 'Recording your trip',
          notificationText: `${trip.title}: your route is shared with ${
            companyName || 'your company'
          } until you pause or end the trip.`,
        }
      : {
          notificationTitle: 'Sharing your location',
          notificationText: `With ${companyName || 'your company'}. Turn it off in STAFO any time.`,
        }),
  });
  return plan;
}

/** Runs the sync again with the last dashboard it saw, e.g. after a trip starts or ends. */
export const resyncTracking = () => syncTracking(last.info, last.companyName).catch(() => {});

export function useTrackingSync(info: EmployeeInfo | null | undefined, companyName?: string | null) {
  useEffect(() => {
    if (!info) {
      return;
    }
    const run = () => syncTracking(info, companyName).catch(() => {});
    run();
    const sub = AppState.addEventListener('change', s => s === 'active' && run());
    return () => sub.remove();
  }, [info, companyName]);
}
