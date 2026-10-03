import {useEffect} from 'react';
import {AppState} from 'react-native';
import * as StafoLocation from 'stafo-location';
import type {EmployeeInfo} from '../../api/types';
import {API_BASE_URL} from '../../config/env';
import {formatTime} from '../../lib/date';
import {onSignOut, useSession} from '../../store/session';
import {planTracking} from './trackingPlan';

onSignOut(() => StafoLocation.stopTracking().catch(() => {}));

/**
 * Brings the native tracker in line with the server: on while they've agreed and
 * are punched in during their shift, off otherwise. Runs whenever the dashboard
 * changes and when the app comes back to the foreground, so a punch-out (or a
 * company turning sharing off) stops it on the next refresh.
 */
export async function syncTracking(info: EmployeeInfo | null | undefined, companyName?: string | null) {
  const token = useSession.getState().token;
  const plan = planTracking(info);
  if (!plan.track || !info || !token) {
    await StafoLocation.stopTracking();
    return plan;
  }
  const state = await StafoLocation.getTrackingState();
  if (state.running && state.stopAt === plan.stopAt.getTime()) {
    return plan;
  }
  const permission = await StafoLocation.getPermissionStatus();
  if (permission === 'denied' || permission === 'undetermined') {
    return plan;
  }
  await StafoLocation.startTracking({
    baseUrl: API_BASE_URL,
    token,
    employeeId: info.id,
    stopAt: plan.stopAt.getTime(),
    notificationTitle: 'Sharing your location',
    notificationText: `With ${companyName || 'your company'} until ${formatTime(plan.stopAt)}. Stops when you punch out.`,
  });
  return plan;
}

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
