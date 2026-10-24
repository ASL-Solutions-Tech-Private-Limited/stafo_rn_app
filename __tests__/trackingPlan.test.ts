import {ALWAYS_HORIZON_DAYS, planTracking} from '../src/features/tracking/trackingPlan';

const now = new Date(2026, 9, 24, 21, 30);
const base = {punches: [], shifts: []};

describe('planTracking', () => {
  it('needs their consent first', () => {
    expect(planTracking({...base, geo_status: '0'}, now)).toEqual({track: false, reason: 'no-consent'});
    expect(planTracking({...base, geo_status: '1'}, now)).toEqual({track: false, reason: 'no-consent'});
    expect(planTracking(null, now)).toEqual({track: false, reason: 'no-consent'});
  });

  it('once accepted, tracks all the time, punched in or not', () => {
    const plan = planTracking({...base, geo_status: '2'}, now);
    expect(plan.track).toBe(true);
    // A week ahead at midnight: the same value all day, so the tracker isn't restarted on every sync.
    expect(plan.track && plan.stopAt).toEqual(new Date(2026, 9, 24 + ALWAYS_HORIZON_DAYS));
    expect(planTracking({...base, geo_status: '2'}, new Date(2026, 9, 24, 8, 0))).toEqual(plan);
  });
});
