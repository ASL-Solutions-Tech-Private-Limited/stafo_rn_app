import {create} from 'zustand';
import * as StafoLocation from 'stafo-location';
import type {Position} from 'stafo-location';
import type {EmployeeInfo} from '../../api/types';
import {formatTime} from '../../lib/date';
import {formatDistance} from '../location/mapParts';
import type {AttendanceMode} from '../attendance/attendanceState';
import {checkFence, lateLabel, minutesLate, type FenceCheck, type PunchDirection} from './punchLogic';

export type PunchOutcome =
  | {
      ok: true;
      direction: PunchDirection;
      mode: AttendanceMode;
      at: Date;
      /** "on time" / "12 min late" for a punch-in. */
      detail: string;
    }
  | {
      ok: false;
      title: string;
      message: string;
      /** Show "Open settings" (permission off). */
      settings?: boolean;
      /** Show "Try again". */
      retry?: boolean;
    }
  | {pending: true; title: string};

/** The punch result sheet on the employee home; screens that punch set it before going back. */
export const usePunchResult = create<{
  outcome: PunchOutcome | null;
  show: (outcome: PunchOutcome) => void;
  clear: () => void;
}>(set => ({
  outcome: null,
  show: outcome => set({outcome}),
  clear: () => set({outcome: null}),
}));

export function punchedOutcome(
  direction: PunchDirection,
  mode: AttendanceMode,
  info: Pick<EmployeeInfo, 'shifts'> | null | undefined,
  at = new Date(),
): PunchOutcome {
  return {
    ok: true,
    direction,
    mode,
    at,
    detail: direction === 'in' ? lateLabel(minutesLate(at, info?.shifts?.[0])) : `See you tomorrow`,
  };
}

export const failed = (title: string, message: string, extra?: {settings?: boolean; retry?: boolean}): PunchOutcome => ({
  ok: false,
  title,
  message,
  ...extra,
});

export type Located = {ok: true; position: Position} | {ok: false; outcome: PunchOutcome};

/** A fresh, real fix for punching, or why there isn't one. */
export async function locateForPunch(): Promise<Located> {
  if (!(await StafoLocation.isLocationServicesEnabled())) {
    return {ok: false, outcome: failed('Location is off', 'Turn on location (GPS) on your phone, then try again.', {retry: true})};
  }
  const permission = await StafoLocation.requestPermission(false);
  if (permission === 'denied' || permission === 'undetermined') {
    return {
      ok: false,
      outcome: failed('Location access is off', 'STAFO needs your location to check you’re at your branch.', {
        settings: true,
      }),
    };
  }
  try {
    const position = await StafoLocation.getCurrentPosition(15_000, 5_000);
    if (position.mocked) {
      return {
        ok: false,
        outcome: failed('Fake location detected', 'Turn off any mock-location app, then try again.', {retry: true}),
      };
    }
    return {ok: true, position};
  } catch (e) {
    return {ok: false, outcome: failed('Couldn’t find you', (e as Error).message, {retry: true})};
  }
}

/** The "move closer" result for a punch outside the fence. */
export function outsideOutcome(fence: Extract<FenceCheck, {kind: 'outside'}>, branchName: string): PunchOutcome {
  return failed(
    `You’re ${formatDistance(fence.distanceM)} from ${branchName}`,
    `Punching works within ${formatDistance(fence.radiusM)} of your branch. Move closer and try again.`,
    {retry: true},
  );
}

/**
 * Selfie and QR punches also need them at their branch when it has a geofence
 * (as in the old app). Resolves null when they may go ahead.
 */
export async function checkAtBranch(info: EmployeeInfo): Promise<PunchOutcome | null> {
  const fenceOf = info.branch;
  if (checkFence(fenceOf, {latitude: 0, longitude: 0}).kind === 'no-fence') {
    return null;
  }
  const located = await locateForPunch();
  if (!located.ok) {
    return located.outcome;
  }
  const fence = checkFence(fenceOf, located.position);
  return fence.kind === 'outside' ? outsideOutcome(fence, fenceOf?.branch_name ?? 'your branch') : null;
}

export const punchTitle = (direction: PunchDirection) => (direction === 'in' ? 'Punch in' : 'Punch out');

export const punchedTitle = (o: Extract<PunchOutcome, {ok: true}>) =>
  `${o.direction === 'in' ? 'Punched in' : 'Punched out'} at ${formatTime(o.at)}`;
