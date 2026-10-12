import type {Trip, TripAction, TripLog} from '../../api/endpoints/trips';
import {parseServerDate} from '../../lib/date';

export type Phase = 'upcoming' | 'live' | 'paused' | 'done' | 'cancelled';

export const PHASE_LABEL: Record<Phase, string> = {
  upcoming: 'Upcoming',
  live: 'On the road',
  paused: 'Paused',
  done: 'Done',
  cancelled: 'Cancelled',
};

/** The server's status as one of five phases. Unknown values count as upcoming. */
export function phaseOf(status: string | null | undefined): Phase {
  switch ((status ?? '').trim().toLowerCase()) {
    case 'ongoing':
    case 'start':
    case 'started':
    case 'resume':
      return 'live';
    case 'pause':
    case 'paused':
      return 'paused';
    case 'completed':
    case 'end':
    case 'ended':
      return 'done';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      return 'upcoming';
  }
}

/** What the driver can do next. */
export function nextActions(phase: Phase): TripAction[] {
  switch (phase) {
    case 'upcoming':
      return ['start'];
    case 'live':
      return ['pause', 'end'];
    case 'paused':
      return ['resume', 'end'];
    default:
      return [];
  }
}

export const ACTION_LABEL: Record<TripAction, string> = {
  start: 'Start trip',
  pause: 'Pause',
  resume: 'Resume',
  end: 'End trip',
};

/** Only a trip that hasn't started can be edited or deleted. */
export const canEdit = (t: Pick<Trip, 'status'>) => phaseOf(t.status) === 'upcoming';

export const isActive = (p: Phase) => p === 'live' || p === 'paused';

const ORDER: Record<Phase, number> = {live: 0, paused: 1, upcoming: 2, done: 3, cancelled: 4};

const time = (v?: string | null) => parseServerDate(v)?.getTime() ?? 0;

/** On the road first, then paused, then upcoming soonest first, then finished newest first. */
export function sortTrips<T extends Pick<Trip, 'id' | 'status' | 'start_time'>>(trips: T[]): T[] {
  return [...trips].sort((a, b) => {
    const pa = phaseOf(a.status);
    const pb = phaseOf(b.status);
    if (pa !== pb) {
      return ORDER[pa] - ORDER[pb];
    }
    const diff = time(a.start_time) - time(b.start_time);
    if (diff) {
      return pa === 'upcoming' ? diff : -diff;
    }
    return b.id - a.id;
  });
}

export type PhaseFilter = 'all' | Phase;

export function filterTrips<T extends Pick<Trip, 'status'>>(trips: T[], filter: PhaseFilter) {
  return filter === 'all' ? trips : trips.filter(t => phaseOf(t.status) === filter);
}

export function tripCounts(trips: Pick<Trip, 'status' | 'total_expenses'>[]) {
  const counts: Record<Phase, number> = {upcoming: 0, live: 0, paused: 0, done: 0, cancelled: 0};
  let expenses = 0;
  for (const t of trips) {
    counts[phaseOf(t.status)]++;
    expenses += toNumber(t.total_expenses) ?? 0;
  }
  return {...counts, expenses};
}

export function toNumber(v: string | number | null | undefined): number | null {
  if (v == null || v === '') {
    return null;
  }
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export type TimelineEntry =
  | {kind: 'start'; at: Date; odometer: number | null; latitude: number | null; longitude: number | null}
  | {
      kind: 'halt';
      n: number;
      at: Date;
      /** null while they're still paused. */
      until: Date | null;
      latitude: number | null;
      longitude: number | null;
    }
  | {kind: 'end'; at: Date; odometer: number | null; latitude: number | null; longitude: number | null};

export type TripSummary = {
  timeline: TimelineEntry[];
  startedAt: Date | null;
  endedAt: Date | null;
  /** Start to end, or to now while it's on. */
  totalMs: number;
  haltMs: number;
  haltCount: number;
  odometerStart: number | null;
  /** The latest reading of any step. */
  odometerLast: number | null;
  /** Latest minus start, when both are known and make sense. */
  kmDriven: number | null;
};

const coord = (v?: string | null) => {
  const n = toNumber(v);
  return n == null || n === 0 ? null : n;
};

/**
 * Turns the start / pause / resume / end log into a timeline and totals. Each
 * pause starts a halt; the next resume (or the end) closes it. The server's own
 * duration and halt fields wrap at 24 hours, so they aren't used.
 */
export function summarize(logs: TripLog[] | null | undefined, now = new Date()): TripSummary {
  const sorted = [...(logs ?? [])]
    .map(l => ({log: l, at: parseServerDate(l.timestamp)}))
    .filter((x): x is {log: TripLog; at: Date} => !!x.at)
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.log.id - b.log.id);

  const timeline: TimelineEntry[] = [];
  let startedAt: Date | null = null;
  let endedAt: Date | null = null;
  let haltMs = 0;
  let haltCount = 0;
  let open: Extract<TimelineEntry, {kind: 'halt'}> | null = null;
  let odometerStart: number | null = null;
  let odometerLast: number | null = null;

  const closeHalt = (at: Date) => {
    if (open) {
      open.until = at;
      haltMs += at.getTime() - open.at.getTime();
      open = null;
    }
  };

  for (const {log, at} of sorted) {
    const odometer = toNumber(log.odometer);
    if (odometer != null) {
      odometerLast = odometer;
    }
    const place = {latitude: coord(log.latitude), longitude: coord(log.longitude)};
    switch (log.action_type) {
      case 'start':
        if (!startedAt) {
          startedAt = at;
          odometerStart = odometer;
          timeline.push({kind: 'start', at, odometer, ...place});
        }
        break;
      case 'pause':
        if (!open) {
          haltCount++;
          open = {kind: 'halt', n: haltCount, at, until: null, ...place};
          timeline.push(open);
        }
        break;
      case 'resume':
        closeHalt(at);
        break;
      case 'end':
        closeHalt(at);
        endedAt = at;
        timeline.push({kind: 'end', at, odometer, ...place});
        break;
    }
  }
  if (open && !endedAt) {
    haltMs += Math.max(0, now.getTime() - (open as {at: Date}).at.getTime());
  }

  const totalMs = startedAt ? Math.max(0, (endedAt ?? now).getTime() - startedAt.getTime()) : 0;
  const kmDriven =
    odometerStart != null && odometerLast != null && odometerLast >= odometerStart
      ? odometerLast - odometerStart
      : null;
  return {
    timeline,
    startedAt,
    endedAt,
    totalMs,
    haltMs: Math.min(haltMs, totalMs || haltMs),
    haltCount,
    odometerStart,
    odometerLast,
    kmDriven,
  };
}

/** Why an odometer reading can't be used, or null. It may not go below the last reading. */
export function odometerError(value: string, last: number | null): string | null {
  const v = value.trim();
  if (!v) {
    return 'Enter the reading.';
  }
  if (!/^\d+(\.\d{1,2})?$/.test(v)) {
    return 'Numbers only, like 12450.';
  }
  if (last != null && Number(v) < last) {
    return `It was ${formatKm(last)} last time. The reading can’t go down.`;
  }
  return null;
}

/**
 * A point from the server, or null. Trips planned without a pin were saved as
 * whole degrees ("23", "88"), which isn't a real place.
 */
export function pointOf(lat?: string | null, lng?: string | null) {
  const latitude = toNumber(lat);
  const longitude = toNumber(lng);
  if (!latitude || !longitude || (Number.isInteger(latitude) && Number.isInteger(longitude))) {
    return null;
  }
  return {latitude, longitude};
}

/** "45m", "3h 05m", "1d 4h", "465 days". */
export function formatSpan(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  if (hours < 1) {
    return `${minutes}m`;
  }
  if (hours < 24) {
    return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
  }
  if (hours < 72) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }
  return `${Math.floor(hours / 24)} days`;
}

/** 23456 → "23,456 km"; 16.05 → "16.1 km". */
export function formatKm(km: number) {
  const rounded = km >= 100 ? Math.round(km) : Math.round(km * 10) / 10;
  return `${rounded.toLocaleString('en-IN')} km`;
}

/** 1234.5 → "₹1,235" (whole rupees). */
export function formatRupees(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** "Kolkata, West Bengal, India" → "Kolkata, West Bengal"; long addresses lose the pin code and country. */
export function shortAddress(address: string | null | undefined) {
  const parts = (address ?? '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .filter(p => !/^india$/i.test(p) && !/^\d{6}$/.test(p))
    .map(p => p.replace(/\s+\d{6}$/, ''));
  return parts.join(', ') || 'No address';
}

/** yyyy-MM-dd HH:mm, what the server takes for planned times. */
export function toServerDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export const EXPENSE_TYPES = [
  'Parking',
  'Food',
  'Repair',
  'Fuel',
  'Toll',
  'Accommodation',
  'Others',
] as const;
export const VEHICLE_TYPES = ['Truck', 'Tempo', 'Van', 'Bike', 'Car', 'Tractor', 'Trailer'] as const;
export const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] as const;

/** Why the amount can't be used, or null. */
export function amountError(value: string) {
  const v = value.trim();
  if (!v) {
    return 'Enter the amount.';
  }
  if (!/^\d+(\.\d{1,2})?$/.test(v) || Number(v) <= 0) {
    return 'Enter an amount above 0, like 250.';
  }
  return null;
}
