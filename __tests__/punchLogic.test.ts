import {checkFence, lateLabel, minutesLate} from '../src/features/punch/punchLogic';

describe('lateness against the shift', () => {
  const shift = {start_time: '10:00'};
  it('allows the grace period, then counts minutes', () => {
    expect(minutesLate(new Date(2026, 9, 5, 9, 41), shift)).toBe(0);
    expect(minutesLate(new Date(2026, 9, 5, 10, 8), shift)).toBe(0);
    expect(minutesLate(new Date(2026, 9, 5, 10, 22), shift)).toBe(22);
    expect(minutesLate(new Date(2026, 9, 5, 10, 22), null)).toBe(0);
  });
  it('reads 12-hour shift times too', () => {
    expect(minutesLate(new Date(2026, 9, 5, 18, 30), {start_time: '06:00 PM'})).toBe(30);
  });
  it('labels it', () => {
    expect([0, 12, 65, 120].map(lateLabel)).toEqual(['on time', '12 min late', '1 h 5 min late', '2 h late']);
  });
});

describe('checkFence (real branches)', () => {
  const chinarPark = {latitude: '22.4993060', longitude: '88.3619370', radar: 20};
  const jadavpur = {latitude: null, longitude: null, radar: 0};
  it('is inside at the pin and outside across town', () => {
    expect(checkFence(chinarPark, {latitude: 22.49931, longitude: 88.36194}).kind).toBe('inside');
    const far = checkFence(chinarPark, {latitude: 22.5726, longitude: 88.3639});
    expect(far.kind).toBe('outside');
    expect(far.kind !== 'no-fence' && Math.round(far.distanceM / 100) / 10).toBe(8.2);
  });
  it('gives the benefit of GPS accuracy, capped at 50 m', () => {
    // ~60 m from a 20 m fence: outside, unless the fix itself is ±45 m.
    const here = {latitude: 22.49985, longitude: 88.36194};
    expect(checkFence(chinarPark, here).kind).toBe('outside');
    expect(checkFence(chinarPark, {...here, accuracy: 45}).kind).toBe('inside');
    expect(checkFence(chinarPark, {...here, accuracy: 500}).kind).toBe('inside');
  });
  it('reports a branch with no fence', () => {
    expect(checkFence(jadavpur, {latitude: 22.5, longitude: 88.36}).kind).toBe('no-fence');
  });
});
