import type {RankRow} from '../src/api/endpoints/performance';
import type {Plan, Subscription} from '../src/api/endpoints/subscription';
import {
  activePlans,
  isFuture,
  monthLabel,
  planFeatures,
  planPrice,
  planState,
  pointsError,
  rankRows,
  scoresMatch,
  stepMonth,
} from '../src/features/performance/performanceLogic';

// Production data for company 1 (fetched 12 Oct 2026); contact details removed.
const {
  rankJul2025,
  plans,
  subscription,
}: {
  rankJul2025: RankRow[];
  plans: Plan[];
  subscription: Subscription;
} = require('./fixtures/performance-company1.json');
const now = new Date(2026, 9, 12, 10);

describe('performance and subscription rules', () => {
  it('ranks the real month, and ties share a rank', () => {
    expect(rankRows(rankJul2025)).toEqual([
      {employeeId: 91, name: 'Hamid Test', empId: 'EMP-00091', total: 10, rank: 1},
    ]);
    const tied = rankRows([
      {employee_id: 1, total_marks: '8', employee: {id: 1, name: 'B'}},
      {employee_id: 2, total_marks: '10', employee: {id: 2, name: 'A'}},
      {employee_id: 3, total_marks: '8', employee: {id: 3, name: 'C'}},
      {employee_id: 4, total_marks: '2', employee: null},
    ]);
    expect(tied.map(r => [r.name, r.rank])).toEqual([
      ['A', 1],
      ['B', 2],
      ['C', 2],
      ['Employee #4', 4],
    ]);
  });

  it('steps months across years and spots the future', () => {
    expect(monthLabel(stepMonth({month: 1, year: 2026}, -1))).toBe('December 2025');
    expect(stepMonth({month: 12, year: 2025}, 1)).toEqual({month: 1, year: 2026});
    expect(isFuture({month: 11, year: 2026}, now)).toBe(true);
    expect(isFuture({month: 10, year: 2026}, now)).toBe(false);
  });

  it('notices when the server kept the old scores', () => {
    const july = [
      {performance_type_id: 3, marks: 10},
      {performance_type_id: 4, marks: 0},
    ];
    expect(scoresMatch(july, {3: 10, 4: 0})).toBe(true);
    expect(scoresMatch(july, {3: 10, 4: 8})).toBe(false); // what production did on 12 Oct 2026
    expect(scoresMatch([], {3: 5})).toBe(false);
  });

  it('checks scores', () => {
    expect(pointsError('')).toBe('Give a score.');
    expect(pointsError('7.5')).toMatch(/whole number/);
    expect(pointsError('1001')).toMatch(/whole number/);
    expect(pointsError('10')).toBeNull();
  });

  it('reads the real subscription as expired', () => {
    expect(planState(subscription, now)).toEqual({kind: 'expired', end: new Date(2025, 5, 14)});
    expect(planState({subscription_end: '2026-10-15'}, now)).toEqual({
      kind: 'ending',
      end: new Date(2026, 9, 15),
      daysLeft: 3,
    });
    expect(planState({subscription_end: '2026-10-12'}, now).kind).toBe('ending');
    expect(planState(null, now)).toEqual({kind: 'none'});
  });

  it('prices and describes the real plans', () => {
    expect(activePlans(plans).map(p => [p.package_name, planPrice(p)])).toEqual([
      ['Trail', {now: 1, was: 100}],
      ['Premium Suite', {now: 2999, was: 9999}],
      ['Enterprise Suite', {now: 3999, was: 11999}],
    ]);
    const premium = plans.find(p => p.id === 2)!;
    const lines = planFeatures(premium.features);
    expect(lines[0]).toBe('Up to 20 employees');
    expect(lines).toContain('Real Time Location Tracking');
    expect(lines).not.toContain('Email Support');
    const trail = planFeatures(plans.find(p => p.id === 4)!.features);
    expect(trail.filter(l => l === 'Up to 20 employees')).toHaveLength(1);
  });
});
