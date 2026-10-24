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

describe('distance ignores wobble and false trips while stopped', () => {
  const home = {lat: 26.4626116, lng: 84.4373476};
  const at = (min: number) => new Date(Date.UTC(2026, 9, 24, 2, 30) + min * 60_000).toISOString();
  const row = (min: number, dLat: number, dLng = 0) => ({
    latitude: String(home.lat + dLat),
    longitude: String(home.lng + dLng),
    created_at: at(min),
    battery_status: '80',
  });

  test('sitting still for 2 hours with GPS noise and one 1 km excursion is ~0 km', () => {
    const rows = [];
    for (let m = 0; m < 120; m += 0.5) {
      // A few metres of wobble around home.
      rows.push(row(m, Math.sin(m) * 0.00004, Math.cos(m) * 0.00004));
    }
    // 75 min in: a fix ~1 km away, drifting back over 1.5 min.
    rows.push(row(75.2, 0.009), row(75.7, 0.007), row(76.2, 0.004), row(76.7, 0.001));
    const t = summarizeTrack(rows, new Date(Date.UTC(2026, 9, 24, 4, 31)));
    expect(t.stops).toHaveLength(1);
    expect(t.distanceM).toBeLessThan(50);
    expect(t.path.length).toBeLessThanOrEqual(2);
  });

  test('a real trip between two stops still counts', () => {
    const rows = [];
    for (let m = 0; m <= 15; m += 0.5) rows.push(row(m, 0));
    // Drive ~2.2 km north over 10 minutes.
    for (let i = 1; i <= 20; i++) rows.push(row(15 + i * 0.5, i * 0.001));
    for (let m = 25.5; m <= 40; m += 0.5) rows.push(row(m, 0.02));
    const t = summarizeTrack(rows, new Date(Date.UTC(2026, 9, 24, 3, 11)));
    expect(t.stops).toHaveLength(2);
    expect(t.distanceM).toBeGreaterThan(2000);
    expect(t.distanceM).toBeLessThan(2400);
  });
});
