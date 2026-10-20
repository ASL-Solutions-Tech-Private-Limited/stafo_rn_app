import {
  countByStatus,
  decide,
  demoMembers,
  demoRequests,
  roleFromPosition,
} from '../src/features/roles/roleLogic';

test('role from position', () => {
  expect(roleFromPosition('HR')).toBe('hr');
  expect(roleFromPosition('Senior HR Executive')).toBe('hr');
  expect(roleFromPosition('Human Resources')).toBe('hr');
  expect(roleFromPosition('Manager')).toBe('manager');
  expect(roleFromPosition('Sales Team Lead')).toBe('manager');
  expect(roleFromPosition('Backend Developer')).toBe('employee');
  // "Three" contains "hr" but isn't HR.
  expect(roleFromPosition('Three-wheeler driver')).toBe('employee');
  expect(roleFromPosition(null)).toBe('employee');
});

test('demo team is stable and has every status', () => {
  const a = demoMembers(9);
  expect(demoMembers(9)).toEqual(a);
  expect(new Set(a.map(m => m.name)).size).toBe(9);
  expect(countByStatus(a)).toEqual({in: 6, late: 1, leave: 1, absent: 1});
});

test('approval chain', () => {
  const team = demoMembers(9);
  const [leave] = demoRequests('manager', team);
  expect(decide(leave, true)).toBe('forwarded');
  expect(decide(leave, false)).toBe('rejected');
  const hrLeave = demoRequests('hr', demoMembers(18, 3))[0];
  expect(hrLeave.managerApproved).toBeTruthy();
  expect(decide(hrLeave, true)).toBe('approved');
});
