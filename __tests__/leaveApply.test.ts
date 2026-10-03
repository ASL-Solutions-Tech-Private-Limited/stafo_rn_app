import {countLeaveDays, leaveRequestError, typeBalances} from '../src/features/leave/leaveApply';

// Real data: company 1's leave types and Demo Employee's leave history.
const types = [
  {id: 5, name: 'Privilege Leave', no_of_days: 6, is_paid: 1},
  {id: 6, name: 'Sick Leave', no_of_days: 6, is_paid: 0},
];
const lv = (id: number, from: string, to: string, status: string, type: number, days = 1) =>
  ({id, employee_id: 24, from_date: from, to_date: to, status, leave_type: type, days, leavetype: types.find(t => t.id === type)} as any);
const demo = [lv(2, '2025-03-21', '2025-03-21', 'approved', 6), lv(12, '2025-05-04', '2025-05-04', 'approved', 5)];
const shift = {id: 2, start_time: '10:00', end_time: '22:00', sunday: 0, monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 0};

describe('typeBalances', () => {
  it('starts each year full (Demo only took leave in 2025)', () => {
    expect(typeBalances(types, demo, 2026).map(b => [b.name, b.left, b.paid])).toEqual([
      ['Privilege Leave', 6, true],
      ['Sick Leave', 6, false],
    ]);
  });
  it('takes off approved and pending days', () => {
    const mine = [...demo, lv(30, '2026-10-12', '2026-10-14', 'pending', 5, 3), lv(31, '2026-08-03', '2026-08-03', 'approved', 5)];
    expect(typeBalances(types, mine, 2026)[0]).toMatchObject({used: 1, pending: 3, left: 2});
  });
});

describe('countLeaveDays', () => {
  it('counts only working days', () => {
    expect(countLeaveDays('2026-10-12', '2026-10-14', shift)).toEqual({working: 3, calendar: 3});
    expect(countLeaveDays('2026-10-09', '2026-10-12', shift)).toEqual({working: 2, calendar: 4});
    expect(countLeaveDays('2026-10-01', '2026-10-02', shift, [{start_date: '2026-10-02', end_date: '2026-10-02'}])).toEqual({
      working: 1,
      calendar: 2,
    });
  });
});

describe('leaveRequestError', () => {
  const ok = {typeId: 5, from: '2026-10-12', to: '2026-10-14', workingDays: 3};
  it('passes a clean request', () => {
    expect(leaveRequestError(ok, demo)).toBeNull();
  });
  it('catches mistakes', () => {
    expect(leaveRequestError({...ok, typeId: null}, [])).toMatch(/leave type/);
    expect(leaveRequestError({...ok, to: '2026-10-10'}, [])).toMatch(/before the first/);
    expect(leaveRequestError({...ok, workingDays: 0}, [])).toMatch(/days off/);
    expect(leaveRequestError(ok, [lv(30, '2026-10-14', '2026-10-15', 'pending', 6)])).toMatch(/pending/);
    expect(leaveRequestError(ok, [lv(30, '2026-10-14', '2026-10-15', 'rejected', 6)])).toBeNull();
  });
});
