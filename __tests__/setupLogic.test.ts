import type {Branch, Holiday} from '../src/api/types';
import {
  branchesNeedingFence,
  daysLabel,
  fenceStatus,
  formatRadius,
  isOvernight,
  shiftDays,
  shiftLengthMs,
  splitHolidays,
} from '../src/features/setup/setupLogic';

const branch = (over: Partial<Branch>): Branch => ({
  id: 1,
  branch_name: 'B',
  latitude: '22.5',
  longitude: '88.3',
  radar: 20,
  ...over,
});

describe('geofence health (real branches)', () => {
  const real = [
    branch({branch_name: 'jadavpur', latitude: null, longitude: null, radar: 0}),
    branch({branch_name: 'Chinar Park', radar: 20}),
    branch({branch_name: 'ASL WALLETS', radar: 50000}),
    branch({branch_name: 'Malda', radar: '90000'}),
  ];
  it('flags missing and city-wide fences', () => {
    expect(real.map(b => fenceStatus(b).kind)).toEqual(['none', 'ok', 'wide', 'wide']);
    expect(branchesNeedingFence(real).map(b => b.branch_name)).toEqual(['jadavpur', 'ASL WALLETS', 'Malda']);
  });
  it('formats radii', () => {
    expect([20, 150, 1000, 50000, 1500].map(formatRadius)).toEqual([
      '20 m',
      '150 m',
      '1 km',
      '50 km',
      '1.5 km',
    ]);
  });
});

describe('shift week', () => {
  it('reads Monday-first days and labels them', () => {
    const days = shiftDays({
      id: 1,
      start_time: '10:00',
      end_time: '19:00',
      monday: 1,
      tuesday: 1,
      wednesday: 1,
      thursday: 1,
      friday: 0,
      saturday: 0,
      sunday: 0,
    });
    expect(days).toEqual([true, true, true, true, false, false, false]);
    expect(daysLabel(days)).toBe('Mon–Thu');
    expect(daysLabel([true, true, true, true, true, true, true])).toBe('Every day');
    expect(daysLabel([true, false, true, false, true, false, false])).toBe('Mon, Wed, Fri');
    expect(daysLabel([false, false, false, false, false, true, true])).toBe('Sat, Sun');
    expect(daysLabel(Array(7).fill(false))).toBe('No working days');
  });
  it('measures shifts, including past midnight and 12-hour times', () => {
    expect(shiftLengthMs('10:00', '19:00')).toBe(9 * 3_600_000);
    expect(shiftLengthMs('06:00 PM', '11:55 PM')).toBe((5 * 60 + 55) * 60_000);
    expect(shiftLengthMs('22:00', '06:00')).toBe(8 * 3_600_000);
    expect(isOvernight('22:00', '06:00')).toBe(true);
    expect(isOvernight('10:00', '19:00')).toBe(false);
  });
});

describe('holidays', () => {
  const h = (title: string, start: string, end = start): Holiday => ({
    id: title.length,
    title,
    start_date: start,
    end_date: end,
  });
  it('puts upcoming first in date order and the past after, latest first', () => {
    const {upcoming, past} = splitHolidays(
      [
        h('Kali Puja', '2026-11-08'),
        h('Independence Day', '2026-08-15'),
        h('Maha Dashmi', '2026-10-21'),
        h('Bank Holiday', '2026-03-31'),
      ],
      new Date(2026, 9, 1),
    );
    expect(upcoming.map(x => x.title)).toEqual(['Maha Dashmi', 'Kali Puja']);
    expect(past.map(x => x.title)).toEqual(['Independence Day', 'Bank Holiday']);
  });
});
