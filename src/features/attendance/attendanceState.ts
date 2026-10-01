import type {EmployeeInfo, Punch} from '../../api/types';
import {parseServerDate, toDateKey} from '../../lib/date';

export type AttendanceMode = 'geo' | 'selfie' | 'qr';

export type TodayAttendance =
  | {state: 'not-started'}
  | {state: 'punched-in'; since: Date; workedMs: number; sessions: number}
  | {state: 'punched-out'; at: Date; workedMs: number; sessions: number};

function hasValidPunchOut(punch: Punch) {
  return !!parseServerDate(punch.punch_out);
}

/**
 * Today's punch state from the dashboard's `punches` list.
 * `workedMs` for a punched-in state covers completed sessions only;
 * the UI adds the live time since `since`.
 */
export function getTodayAttendance(punches: Punch[] | null | undefined, now = new Date()): TodayAttendance {
  const today = toDateKey(now);
  const todays = (punches ?? []).filter(p => {
    const inAt = parseServerDate(p.punch_in);
    return inAt && toDateKey(inAt) === today;
  });

  if (!todays.length) {
    return {state: 'not-started'};
  }

  let completedMs = 0;
  for (const p of todays) {
    const inAt = parseServerDate(p.punch_in);
    const outAt = parseServerDate(p.punch_out);
    if (inAt && outAt) {
      completedMs += Math.max(0, outAt.getTime() - inAt.getTime());
    }
  }

  const ongoing = [...todays].reverse().find(p => !hasValidPunchOut(p));
  if (ongoing) {
    return {
      state: 'punched-in',
      since: parseServerDate(ongoing.punch_in)!,
      workedMs: completedMs,
      sessions: todays.length,
    };
  }

  const last = todays.reduce((a, b) => (b.id > a.id ? b : a));
  return {
    state: 'punched-out',
    at: parseServerDate(last.punch_out)!,
    workedMs: completedMs,
    sessions: todays.length,
  };
}

/** The single attendance mode the company allows this employee. */
export function getAllowedMode(info?: Pick<EmployeeInfo, 'attendance_type'> | null): AttendanceMode {
  const type = info?.attendance_type?.toLowerCase().trim();
  if (type === 'geo') {
    return 'geo';
  }
  if (type === 'qr' || type === 'qr code') {
    return 'qr';
  }
  return 'selfie';
}

export const attendanceModeLabel: Record<AttendanceMode, string> = {
  geo: 'Geo attendance',
  selfie: 'Selfie attendance',
  qr: 'QR code attendance',
};
