import type {Branch, Holiday, ShiftWithDays} from '../../api/types';
import {parseClock, toDateKey} from '../../lib/date';

// ---------- Branch geofence ----------

/** Above this, a "geofence" lets people punch in from across the city. */
export const MAX_SENSIBLE_RADIUS_M = 1000;
export const RADIUS_CHOICES_M = [50, 100, 150, 300, 500];

export type FenceStatus =
  | {kind: 'none'}
  | {kind: 'wide' | 'ok'; radiusM: number; latitude: number; longitude: number};

export function fenceStatus(b: Branch): FenceStatus {
  const lat = Number(b.latitude);
  const lng = Number(b.longitude);
  const radius = Number(b.radar);
  if (!b.latitude || !b.longitude || !Number.isFinite(lat) || !Number.isFinite(lng) || !(radius > 0)) {
    return {kind: 'none'};
  }
  return {
    kind: radius > MAX_SENSIBLE_RADIUS_M ? 'wide' : 'ok',
    radiusM: radius,
    latitude: lat,
    longitude: lng,
  };
}

/** What a typed radius may be, in metres. */
export const MIN_RADIUS_M = 10;
export const MAX_RADIUS_M = 100_000;

/** Why a typed radius (in metres) can't be saved, or null. */
export function radiusError(text: string): string | null {
  const t = text.trim();
  if (!t) {
    return 'Enter the radius in metres.';
  }
  if (!/^\d+$/.test(t)) {
    return 'Whole metres only, like 200.';
  }
  const m = Number(t);
  if (m < MIN_RADIUS_M) {
    return `At least ${MIN_RADIUS_M} m; GPS is rarely more precise than that.`;
  }
  if (m > MAX_RADIUS_M) {
    return `At most ${formatRadius(MAX_RADIUS_M)}.`;
  }
  return null;
}

export function formatRadius(m: number) {
  return m >= 1000 ? `${Number((m / 1000).toFixed(m % 1000 ? 1 : 0))} km` : `${Math.round(m)} m`;
}

/** Branches whose geofence doesn't really check location (none set, or too wide). */
export function branchesNeedingFence(branches: Branch[]) {
  return branches.filter(b => fenceStatus(b).kind !== 'ok');
}

// ---------- Shift week ----------

export const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** Working days, Monday first. */
export function shiftDays(s: ShiftWithDays): boolean[] {
  return KEYS.map(k => !!Number(s[k] ?? 0));
}

/** "Mon–Fri", "Every day", "Mon, Wed, Fri", "No working days". */
export function daysLabel(days: boolean[]) {
  const on = days.map((d, i) => (d ? i : -1)).filter(i => i >= 0);
  if (!on.length) {
    return 'No working days';
  }
  if (on.length === 7) {
    return 'Every day';
  }
  const contiguous = on.every((d, i) => i === 0 || d === on[i - 1] + 1);
  if (contiguous && on.length > 2) {
    return `${WEEK[on[0]]}–${WEEK[on[on.length - 1]]}`;
  }
  return on.map(i => WEEK[i]).join(', ');
}

/** Length of a shift in ms; an end before the start runs past midnight. */
export function shiftLengthMs(start: string, end: string) {
  const a = parseClock(start);
  const b = parseClock(end);
  if (!a || !b) {
    return 0;
  }
  const s = a.hours * 60 + a.minutes;
  let e = b.hours * 60 + b.minutes;
  if (e <= s) {
    e += 24 * 60;
  }
  return (e - s) * 60_000;
}

export const isOvernight = (start: string, end: string) => {
  const a = parseClock(start);
  const b = parseClock(end);
  return !!a && !!b && b.hours * 60 + b.minutes <= a.hours * 60 + a.minutes;
};

// ---------- Holidays ----------

export function holidayDays(h: Holiday) {
  const from = new Date(`${h.start_date}T00:00:00`);
  const to = new Date(`${h.end_date}T00:00:00`);
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
}

/** Upcoming (from today) first in date order, then past ones most recent first. */
export function splitHolidays(holidays: Holiday[], now = new Date()) {
  const today = toDateKey(now);
  const sorted = [...holidays].sort((a, b) => a.start_date.localeCompare(b.start_date));
  return {
    upcoming: sorted.filter(h => h.end_date >= today),
    past: sorted.filter(h => h.end_date < today).reverse(),
  };
}

/** Whole days from today until the holiday starts (0 = today). */
export function daysUntil(h: Pick<Holiday, 'start_date'>, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(`${h.start_date.slice(0, 10)}T00:00:00`);
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

/** "Today", "Tomorrow", "In 18 days". */
export function untilLabel(days: number) {
  return days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

/**
 * The weekday when every day of the holiday is already a week-off in their
 * shift (it gives no extra day off), else null.
 */
export function holidayOnWeekOff(h: Pick<Holiday, 'start_date' | 'end_date'>, shift?: ShiftWithDays | null) {
  if (!shift || KEYS.every(k => shift[k] == null)) {
    return null;
  }
  const days = shiftDays(shift);
  const from = new Date(`${h.start_date.slice(0, 10)}T00:00:00`);
  const to = new Date(`${(h.end_date || h.start_date).slice(0, 10)}T00:00:00`);
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (days[(d.getDay() + 6) % 7]) {
      return null;
    }
  }
  return from.toLocaleDateString('en-GB', {weekday: 'long'});
}

/** Holidays in a given year (by start date). */
export const holidaysInYear = <T extends Pick<Holiday, 'start_date'>>(list: T[], year: number) =>
  list.filter(h => h.start_date.startsWith(String(year)));

/** A policy's file as a full URL, or null. The API gives a bare file name plus a base path. */
export function policyUrl(file: string | null | undefined, base: string | null | undefined) {
  if (!file) {
    return null;
  }
  if (/^https?:/.test(file)) {
    return file;
  }
  return base ? `${base.replace(/\/+$/, '')}/${file}` : null;
}
