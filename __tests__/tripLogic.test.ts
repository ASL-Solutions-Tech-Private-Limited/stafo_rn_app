import type {Trip, TripDetail} from '../src/api/endpoints/trips';
import {
  canEdit,
  filterTrips,
  formatKm,
  formatSpan,
  nextActions,
  odometerError,
  phaseOf,
  pointOf,
  shortAddress,
  sortTrips,
  summarize,
  toServerDateTime,
  tripCounts,
} from '../src/features/trips/tripLogic';

// Production's 3 trips for company 1 (fetched 12 Oct 2026); client phones replaced.
const {trips, details}: {trips: Trip[]; details: TripDetail[]} = require('./fixtures/trips-company1.json');
const [pending, paused, completed] = details;
const now = new Date(2026, 9, 12, 10);

describe('trip rules on real trips', () => {
  it('reads the statuses the server uses', () => {
    expect(trips.map(t => phaseOf(t.status))).toEqual(['done', 'paused', 'upcoming']);
    expect(['ongoing', 'resume', 'Cancelled', '', null].map(phaseOf)).toEqual([
      'live',
      'live',
      'cancelled',
      'upcoming',
      'upcoming',
    ]);
  });

  it('sorts paused before upcoming before done', () => {
    expect(sortTrips(trips).map(t => t.id)).toEqual([3, 2, 4]);
  });

  it('counts and filters', () => {
    const c = tripCounts(trips);
    expect([c.upcoming, c.live, c.paused, c.done, c.expenses]).toEqual([1, 0, 1, 1, 0]);
    expect(filterTrips(trips, 'paused').map(t => t.id)).toEqual([3]);
  });

  it('offers the next step and allows edits only before the start', () => {
    expect(nextActions('upcoming')).toEqual(['start']);
    expect(nextActions('paused')).toEqual(['resume', 'end']);
    expect(nextActions('done')).toEqual([]);
    expect(trips.map(t => canEdit(t))).toEqual([false, false, true]);
  });

  it('has no timeline before the start', () => {
    const s = summarize(pending.trip_logs, now);
    expect(s.timeline).toEqual([]);
    expect([s.totalMs, s.kmDriven]).toEqual([0, null]);
  });

  it('counts an open pause up to now', () => {
    const s = summarize(paused.trip_logs, now);
    expect(s.timeline.map(e => e.kind)).toEqual(['start', 'halt']);
    expect(s.haltCount).toBe(1);
    const halt = s.timeline[1];
    expect(halt.kind === 'halt' && halt.until).toBeNull();
    expect(s.haltMs).toBe(now.getTime() - new Date(2025, 6, 3, 18, 41, 43).getTime());
    expect(s.kmDriven).toBe(1);
  });

  it('works out a finished trip from its log, not the server’s 24-hour durations', () => {
    const s = summarize(completed.trip_logs, now);
    expect(s.timeline.map(e => e.kind)).toEqual(['start', 'halt', 'end']);
    expect(s.totalMs).toBe(
      new Date(2026, 3, 6, 15, 46, 59).getTime() - new Date(2025, 6, 4, 18, 14, 22).getTime(),
    );
    expect(s.haltMs).toBe(
      new Date(2026, 3, 6, 15, 46, 23).getTime() - new Date(2025, 6, 4, 18, 16, 55).getTime(),
    );
    expect([s.odometerStart, s.odometerLast, s.kmDriven]).toEqual([250, 1234, 984]);
    expect((completed as {duration?: string}).duration).toBe('12:02:37'); // what the server says
  });

  it('keeps odometer readings from going down', () => {
    expect(odometerError('', 250)).toBe('Enter the reading.');
    expect(odometerError('12a', null)).toBe('Numbers only, like 12450.');
    expect(odometerError('249', 250)).toMatch(/can’t go down/);
    expect(odometerError('250', 250)).toBeNull();
    expect(odometerError('251.5', 250)).toBeNull();
  });

  it('formats', () => {
    expect(formatKm(23456)).toBe('23,456 km');
    expect(formatKm(16.05)).toBe('16.1 km');
    expect(shortAddress('F29A, Bikramgarh, Jadavpur, Kolkata, West Bengal 700032, India')).toBe(
      'F29A, Bikramgarh, Jadavpur, Kolkata, West Bengal',
    );
    expect(shortAddress(null)).toBe('No address');
    expect([45, 185, 26 * 60, 11177 * 60].map(m => formatSpan(m * 60_000))).toEqual([
      '45m',
      '3h 05m',
      '1d 2h',
      '465 days',
    ]);
    expect(pointOf('23', '88')).toBeNull();
    expect(pointOf('22.502081', '88.362675')).toEqual({latitude: 22.502081, longitude: 88.362675});
    expect(toServerDateTime(new Date(2026, 9, 2, 9, 5))).toBe('2026-10-02 09:05');
  });
});
