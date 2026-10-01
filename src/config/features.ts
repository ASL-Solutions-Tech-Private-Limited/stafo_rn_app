/**
 * Features that are built but switched off.
 *
 * editAttendance: the company correcting a day directly (status + punch times).
 * Off for now: records change on the backend when the company approves or
 * rejects a punch-fix request. Turn on once the company may edit directly.
 */
export const FEATURES = {
  editAttendance: false,
} as const;
