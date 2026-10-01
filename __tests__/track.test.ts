import type {RawGeoPoint} from '../src/api/types';
import {
  cleanTrack,
  distanceMeters,
  findStops,
  isLive,
  metersBetween,
  movingMs,
  summarizeTrack,
} from '../src/features/location/track';

const real = require('./fixtures/geo-track-with-strays.json').data as RawGeoPoint[];

let id = 0;
const fix = (lat: number, lng: number, iso: string, battery?: string): RawGeoPoint => ({
  id: ++id,
  employee_id: 1,
  latitude: String(lat),
  longitude: String(lng),
  battery_status: battery ?? null,
  created_at: iso,
});

describe('cleanTrack', () => {
  it('drops the stray California fixes from a real Kolkata day', () => {
    const points = cleanTrack(real);
    expect(real.length).toBe(226);
    expect(points.every(p => p.latitude < 30 && p.longitude > 80)).toBe(true);
    expect(points.length).toBeGreaterThan(150);
    // The raw track "travels" 12,650 km, and 21 km of it is two location sources
    // alternating 265 m apart. They stayed put: an afternoon of stops, almost no travel.
    expect(distanceMeters(points)).toBeLessThan(1000);
    expect(findStops(points).length).toBeLessThanOrEqual(2);
  });

  it('ignores a fix that bounces away and straight back', () => {
    const points = cleanTrack([
      fix(22.5, 88.36, '2026-10-01T04:00:00.000000Z'),
      fix(22.5024, 88.36, '2026-10-01T04:00:30.000000Z'), // ~265 m away
      fix(22.50002, 88.36, '2026-10-01T04:01:00.000000Z'),
      fix(22.5024, 88.36, '2026-10-01T04:01:30.000000Z'),
      fix(22.50001, 88.36, '2026-10-01T04:02:00.000000Z'),
    ]);
    expect(points).toHaveLength(3);
    expect(distanceMeters(points)).toBeLessThan(10);
  });

  it('drops a single impossible jump, keeps order, reads battery', () => {
    const points = cleanTrack([
      fix(22.5, 88.36, '2026-10-01T04:00:30.000000Z', '64'),
      fix(22.5, 88.36, '2026-10-01T04:00:00.000000Z'),
      fix(22.9, 88.9, '2026-10-01T04:01:00.000000Z'), // ~70 km in 30 s
      fix(22.501, 88.361, '2026-10-01T04:01:30.000000Z'),
      fix(0, 0, '2026-10-01T04:02:00.000000Z'),
    ]);
    expect(points.map(p => p.at.toISOString().slice(11, 19))).toEqual(['04:00:00', '04:00:30', '04:01:30']);
    expect(points[1].battery).toBe(64);
  });
});

describe('stops and moving time', () => {
  // 9:00 start, stays put 9:05–9:20 (15 min), then moves on.
  const raw = [
    fix(22.5, 88.3, '2026-10-01T03:30:00.000000Z'),
    fix(22.51, 88.3, '2026-10-01T03:35:00.000000Z'),
    fix(22.5101, 88.3001, '2026-10-01T03:42:00.000000Z'),
    fix(22.5102, 88.3, '2026-10-01T03:50:00.000000Z'),
    fix(22.53, 88.3, '2026-10-01T03:55:00.000000Z'),
  ];
  it('finds a 15 minute stop and the time spent moving', () => {
    const points = cleanTrack(raw);
    const stops = findStops(points);
    expect(stops).toHaveLength(1);
    expect(stops[0].end.getTime() - stops[0].start.getTime()).toBe(15 * 60_000);
    expect(movingMs(points, stops)).toBe(10 * 60_000);
    expect(metersBetween(points[0], points[4])).toBeGreaterThan(3000);
  });

  it('summarises liveness from the last fix', () => {
    const now = new Date('2026-10-01T03:58:00.000Z');
    const s = summarizeTrack(raw, now);
    expect(s.live).toBe(true);
    expect(s.stops).toHaveLength(1);
    expect(s.stoppedSince).toBeNull();
    expect(isLive(s.last, new Date('2026-10-01T04:10:00.000Z'))).toBe(false);
  });

  it('knows when the latest fixes are all at a stop', () => {
    const s = summarizeTrack(raw.slice(0, 4), new Date('2026-10-01T03:51:00.000Z'));
    expect(s.stoppedSince?.toISOString()).toBe('2026-10-01T03:35:00.000Z');
  });
});
