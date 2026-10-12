import type {Claim, ExpenseCategory} from '../src/api/endpoints/expenses';
import {
  activeFields,
  claimErrors,
  claimPhase,
  claimSummary,
  claimTotals,
  fieldKind,
  filterClaims,
  fromClaimDate,
  needsDocument,
  sortClaims,
  toClaimDate,
} from '../src/features/expenses/expenseLogic';

// Production's 4 categories and 6 claims for company 1 (fetched 12 Oct 2026).
const {
  categories,
  claims,
}: {categories: ExpenseCategory[]; claims: Claim[]} = require('./fixtures/expenses-company1.json');
const byId = (id: number) => categories.find(c => c.id === id)!;

describe('expense rules on real claims', () => {
  it('reads statuses and field types the server stores', () => {
    expect(claims.map(c => claimPhase(c.status))).toEqual([
      'rejected',
      'approved',
      'approved',
      'approved',
      'approved',
      'waiting',
    ]);
    expect(['text', 'Text', 'textarea', 'number', 'date', 'weird', null].map(fieldKind)).toEqual([
      'text',
      'text',
      'notes',
      'number',
      'date',
      'text',
      'text',
    ]);
  });

  it('knows which categories need a bill and lists fields in order', () => {
    expect(categories.map(needsDocument)).toEqual([false, false, true, true]);
    expect(activeFields(byId(3)).map(f => f.field_name)).toEqual(['Place Name', 'Date', 'Reason']);
  });

  it('sorts waiting first and totals by status', () => {
    expect(sortClaims(claims).map(c => c.id)).toEqual([30, 28, 27, 26, 2, 1]);
    expect(claimTotals(claims)).toEqual({
      waiting: 1,
      approved: 4,
      rejected: 1,
      waitingAmount: 58000,
      approvedAmount: 1280,
    });
    expect(filterClaims(claims, 'rejected').map(c => c.id)).toEqual([1]);
  });

  it('summarises a claim from its text fields', () => {
    const waiting = claims.find(c => c.id === 30)!;
    expect(claimSummary(waiting, byId(2))).toBe('Hamid · For deal');
    expect(claimSummary(claims.find(c => c.id === 1)!, byId(3))).toBe('');
  });

  it('writes and reads dates the way the old app did', () => {
    expect(toClaimDate(new Date(2025, 5, 25))).toBe('25 Jun 2025');
    expect(fromClaimDate('24 Oct 2025')).toEqual(new Date(2025, 9, 24));
    expect(fromClaimDate('2025-06-25')).toEqual(new Date(2025, 5, 25));
    expect(fromClaimDate('soon')).toBeNull();
  });

  it('checks a claim before sending', () => {
    expect(claimErrors(undefined, '', {}, 0)).toEqual({category: 'Pick what it was for.'});
    const food = byId(5);
    const e = claimErrors(food, '0', {20: 'Lunch'}, 0);
    expect(e.amount).toMatch(/above 0/);
    expect(e[21]).toBe('Fill in Date.');
    expect(e.files).toMatch(/needs a bill/);
    expect(claimErrors(food, '120', {20: 'Lunch', 21: '12 Oct 2026'}, 1)).toEqual({});
    expect(claimErrors(byId(9), '50', {}, 1)).toEqual({
      ...Object.fromEntries(activeFields(byId(9)).map(f => [f.id, `Fill in ${f.field_name}.`])),
    });
  });
});
