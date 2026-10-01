import type {RawGeoPoint} from '../../api/types';
import {parseServerDate} from '../../lib/date';

export type GeoPoint = {latitude: number; longitude: number; at: Date; battery: number | null};

export type Stop = {latitude: number; longitude: number; start: Date; end: Date};

/** Points this far (km) from the day's median position are stray fixes, not travel. */
const STRAY_KM = 100;
/** Faster than this (km/h) between two fixes is a GPS jump. */
const MAX_KMH = 180;
/** The old app's stop rule: staying within this radius (m) for at least this long. */
export const STOP_RADIUS_M = 200;
export const STOP_MIN_MS = 10 * 60_000;
/** A last fix newer than this counts as live. */
export const LIVE_MS = 5 * 60_000;

const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function metersBetween(
  a: Pick<GeoPoint, 'latitude' | 'longitude'>,
  b: Pick<GeoPoint, 'latitude' | 'longitude'>,
) {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const median = (values: number[]) => {
  const s = [...values].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

/** Server rows → time-ordered points, without invalid, stray or impossible fixes. */
export function cleanTrack(raw: RawGeoPoint[]): GeoPoint[] {
  const points = raw
    .map(r => {
      const battery = r.battery_status == null || r.battery_status === '' ? null : Number(r.battery_status);
      return {
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        at: parseServerDate(r.created_at)!,
        battery: battery != null && Number.isFinite(battery) ? battery : null,
      };
    })
    .filter(
      p =>
        p.at &&
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude) &&
        !(p.latitude === 0 && p.longitude === 0),
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  if (points.length < 2) {
    return points;
  }

  // Drop fixes far from where the day mostly happened (e.g. an emulator's default location).
  const centre = {
    latitude: median(points.map(p => p.latitude)),
    longitude: median(points.map(p => p.longitude)),
  };
  const local = points.filter(p => metersBetween(p, centre) <= STRAY_KM * 1000);

  // Then drop single fixes that would need an impossible speed to reach.
  const kept: GeoPoint[] = [];
  for (const p of local) {
    const prev = kept[kept.length - 1];
    if (prev) {
      const hours = Math.max((p.at.getTime() - prev.at.getTime()) / 3_600_000, 1 / 3600);
      if (metersBetween(prev, p) / 1000 / hours > MAX_KMH) {
        continue;
      }
    }
    kept.push(p);
  }
  return dropSpikes(kept);
}

/** A fix this far (m) off a line that otherwise comes straight back is a bounce, not travel. */
const SPIKE_M = 100;

/**
 * Phones often alternate between two location sources a few hundred metres apart
 * (A, B, A, B…), which would count as travel on every hop. Drop a fix when its
 * neighbours are close together but it sits well away from both.
 */
function dropSpikes(points: GeoPoint[]): GeoPoint[] {
  let current = points;
  for (let pass = 0; pass < 3; pass++) {
    const out: GeoPoint[] = [];
    let dropped = false;
    for (let i = 0; i < current.length; i++) {
      const prev = out[out.length - 1];
      const p = current[i];
      const next = current[i + 1];
      if (prev && next) {
        const away = Math.min(metersBetween(prev, p), metersBetween(p, next));
        if (away > SPIKE_M && metersBetween(prev, next) < away / 2) {
          dropped = true;
          continue;
        }
      }
      out.push(p);
    }
    current = out;
    if (!dropped) {
      break;
    }
  }
  return current;
}

export function distanceMeters(points: GeoPoint[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += metersBetween(points[i - 1], points[i]);
  }
  return total;
}

/** Places they stayed (within STOP_RADIUS_M for at least STOP_MIN_MS), in order. */
export function findStops(points: GeoPoint[]): Stop[] {
  const stops: Stop[] = [];
  let start = 0;
  while (start < points.length - 1) {
    let end = start + 1;
    while (end < points.length && metersBetween(points[start], points[end]) <= STOP_RADIUS_M) {
      end++;
    }
    const group = points.slice(start, end);
    const first = group[0].at;
    const last = group[group.length - 1].at;
    if (last.getTime() - first.getTime() >= STOP_MIN_MS) {
      stops.push({
        latitude: group.reduce((s, p) => s + p.latitude, 0) / group.length,
        longitude: group.reduce((s, p) => s + p.longitude, 0) / group.length,
        start: first,
        end: last,
      });
    }
    start = end;
  }
  return mergeStops(stops);
}

/** Back-to-back stops at the same place (within the radius, minutes apart) are one stop. */
function mergeStops(stops: Stop[]): Stop[] {
  const merged: Stop[] = [];
  for (const s of stops) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      metersBetween(prev, s) <= STOP_RADIUS_M &&
      s.start.getTime() - prev.end.getTime() <= STOP_MIN_MS
    ) {
      const a = prev.end.getTime() - prev.start.getTime();
      const b = s.end.getTime() - s.start.getTime();
      merged[merged.length - 1] = {
        latitude: (prev.latitude * a + s.latitude * b) / (a + b || 1),
        longitude: (prev.longitude * a + s.longitude * b) / (a + b || 1),
        start: prev.start,
        end: s.end,
      };
    } else {
      merged.push(s);
    }
  }
  return merged;
}

/** Time between the first and last fix that wasn't spent at a stop. */
export function movingMs(points: GeoPoint[], stops: Stop[]) {
  if (points.length < 2) {
    return 0;
  }
  const span = points[points.length - 1].at.getTime() - points[0].at.getTime();
  const stopped = stops.reduce((s, x) => s + (x.end.getTime() - x.start.getTime()), 0);
  return Math.max(0, span - stopped);
}

export function isLive(last: GeoPoint | undefined, now = new Date()) {
  return !!last && now.getTime() - last.at.getTime() <= LIVE_MS;
}

export type TrackSummary = {
  points: GeoPoint[];
  last?: GeoPoint;
  live: boolean;
  distanceM: number;
  stops: Stop[];
  movingMs: number;
  /** Set when the latest fixes are all inside the last stop. */
  stoppedSince: Date | null;
};

export function summarizeTrack(raw: RawGeoPoint[], now = new Date()): TrackSummary {
  const points = cleanTrack(raw);
  const stops = findStops(points);
  const last = points[points.length - 1];
  const lastStop = stops[stops.length - 1];
  return {
    points,
    last,
    live: isLive(last, now),
    distanceM: distanceMeters(points),
    stops,
    movingMs: movingMs(points, stops),
    stoppedSince: lastStop && last && lastStop.end.getTime() === last.at.getTime() ? lastStop.start : null,
  };
}
