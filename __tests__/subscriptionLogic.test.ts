import type {Plan} from '../src/api/endpoints/subscription';
import {
  activePlans,
  durationLabel,
  employeeLimit,
  featureLines,
  perDay,
  planLengths,
  planProgress,
  savePercent,
} from '../src/features/subscription/subscriptionLogic';

// Production plans for company 1 (fetched 12 Oct 2026).
const {plans}: {plans: Plan[]} = require('./fixtures/performance-company1.json');
const byName = (n: string) => plans.find(p => p.package_name === n)!;
const now = new Date(2026, 9, 14, 10);

describe('subscription maths on real plans', () => {
  it('works out offers and price per day', () => {
    expect(savePercent(byName('Premium Suite'))).toBe(70);
    expect(savePercent(byName('Enterprise Suite'))).toBe(67);
    expect(perDay(byName('Premium Suite'))).toBe(33);
    expect(perDay(byName('Enterprise Suite'))).toBe(22);
    expect(perDay(byName('Trail'))).toBeNull();
    expect(planLengths(activePlans(plans))).toEqual([7, 90, 180]);
  });

  it('names plan lengths', () => {
    expect([7, 30, 90, 180, 365].map(durationLabel)).toEqual([
      '7 days',
      '1 month',
      '3 months',
      '6 months',
      '1 year',
    ]);
  });

  it('lists features honestly and reads the employee limit', () => {
    const premium = featureLines(byName('Premium Suite').features);
    expect(premium[0]).toEqual({name: 'Up to 20 employees', included: true});
    expect(premium.find(f => f.name === 'Email Support')).toEqual({name: 'Email Support', included: false});
    expect(premium.some(f => f.name === 'Real Time Location Tracking' && f.included)).toBe(true);
    // Trail lists some features twice (one empty); they merge as included.
    const trail = featureLines(byName('Trail').features);
    expect(trail.filter(f => /employees/i.test(f.name))).toHaveLength(1);
    expect(employeeLimit(byName('Premium Suite'))).toBe(20);
  });

  it('counts days left through the last day', () => {
    const p = planProgress({subscription_start: '2026-09-17', subscription_end: '2026-12-15'}, now)!;
    expect([p.totalDays, p.daysLeft]).toEqual([90, 63]);
    expect(p.used).toBeCloseTo(0.3);
    expect(
      planProgress({subscription_start: '2025-05-15', subscription_end: '2025-06-14'}, now)?.daysLeft,
    ).toBe(0);
    expect(
      planProgress({subscription_start: '2026-10-14', subscription_end: '2026-10-14'}, now)?.daysLeft,
    ).toBe(1);
    expect(planProgress(null, now)).toBeNull();
  });
});

describe('PayU hash', () => {
  it('is SHA-512 hex of the string plus salt', () => {
    // SHA-512("abc"), the standard test vector.
    const {payuHashLocal} = require('../src/lib/payuHash');
    expect(payuHashLocal('ab', 'c')).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    );
  });
});
