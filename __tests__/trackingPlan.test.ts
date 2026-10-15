import {planTracking} from '../src/features/tracking/trackingPlan';

const day = {id: 1, start_time: '10:00:00', end_time: '22:00:00'};
const punchedIn = (at: string) => [{id: 1, employee_id: 24, punch_in: at, punch_out: null}];
const at = (h: number, m = 0, d = 5) => new Date(2026, 9, d, h, m);

describe('planTracking', () => {
  it('needs their consent first', () => {
    for (const geo_status of ['0', '1', null]) {
      expect(
        planTracking({geo_status, shifts: [day], punches: punchedIn('2026-10-05 09:42:00')}, at(12)),
      ).toEqual({
        track: false,
        reason: 'no-consent',
      });
    }
  });

  it('only while punched in', () => {
    const out = [{id: 1, employee_id: 24, punch_in: '2026-10-05 09:42:00', punch_out: '2026-10-05 18:02:00'}];
    expect(planTracking({geo_status: '2', shifts: [day], punches: out}, at(19)).track).toBe(false);
    expect(planTracking({geo_status: '2', shifts: [day], punches: []}, at(12)).track).toBe(false);
  });

  it('stops 15 minutes after the shift ends', () => {
    const plan = planTracking(
      {geo_status: '2', shifts: [day], punches: punchedIn('2026-10-05 09:42:00')},
      at(12),
    );
    expect(plan).toEqual({track: true, stopAt: at(22, 15)});
    expect(
      planTracking({geo_status: '2', shifts: [day], punches: punchedIn('2026-10-05 09:42:00')}, at(22, 20)),
    ).toEqual({
      track: false,
      reason: 'shift-over',
    });
  });

  it('carries a night shift into the next morning', () => {
    const night = {id: 2, start_time: '10:00 PM', end_time: '06:00 AM'};
    const plan = planTracking(
      {geo_status: '2', shifts: [night], punches: punchedIn('2026-10-05 21:55:00')},
      at(23),
    );
    expect(plan).toEqual({track: true, stopAt: at(6, 15, 6)});
    const afterMidnight = planTracking(
      {geo_status: '2', shifts: [night], punches: punchedIn('2026-10-05 21:55:00')},
      at(2, 0, 6),
    );
    expect(afterMidnight).toEqual({track: true, stopAt: at(6, 15, 6)});
  });

  it('caps a punch-in with no shift at 12 hours', () => {
    const plan = planTracking(
      {geo_status: '2', shifts: [], punches: punchedIn('2026-10-05 09:00:00')},
      at(12),
    );
    expect(plan).toEqual({track: true, stopAt: at(21)});
  });
});
