import type {DeviceRequest, LeaveRequestRecord, MissedPunchRequest} from '../src/api/types';
import {
  askedAgo,
  buildApprovals,
  countApprovals,
  isPastDue,
  leaveContext,
} from '../src/features/approvals/approvalItems';

const casual = {id: 3, name: 'Casual Leave', no_of_days: 12};
const leave = (over: Partial<LeaveRequestRecord>): LeaveRequestRecord => ({
  id: 1,
  employee_id: 10,
  from_date: '2026-10-20',
  to_date: '2026-10-22',
  days: 3,
  status: 'pending',
  created_at: '2026-10-01T08:00:00.000000Z',
  leavetype: casual,
  employee_basic_info: {id: 10, name: 'Aarav'},
  ...over,
});
const punch = (over: Partial<MissedPunchRequest>): MissedPunchRequest => ({
  id: 7,
  employee_id: 11,
  date: '2026-09-29',
  in_time: '09:42:00',
  out_time: '18:30:00',
  status: 'Pending',
  created_at: '2026-10-01T05:00:00.000000Z',
  employee: {id: 11, name: 'Priya'},
  ...over,
});
const device = (over: Partial<DeviceRequest>): DeviceRequest => ({
  id: 12,
  name: 'Rohit',
  device_id: 'abc',
  device_name: 'Pixel 8',
  device_status: 'pending',
  updated_at: '2026-09-30T10:00:00.000000Z',
  ...over,
});

describe('buildApprovals', () => {
  it('keeps only pending requests, newest first, across all kinds', () => {
    const items = buildApprovals(
      [leave({}), leave({id: 2, status: 'approved'})],
      [punch({}), punch({id: 8, status: 'Rejected'})],
      [device({}), device({id: 13, device_status: 'approved'})],
    );
    expect(items.map(i => i.key)).toEqual(['leave-1', 'punch-7', 'device-12-abc']);
    expect(countApprovals(items)).toEqual({all: 3, leave: 1, punch: 1, device: 1});
  });

  it('treats pending case-insensitively and names unknown employees', () => {
    const [item] = buildApprovals([], [punch({status: 'PENDING', employee: null})], []);
    expect(item.name).toBe('Employee #11');
  });
});

describe('isPastDue', () => {
  const now = new Date(2026, 9, 1, 12);
  it('flags leave whose last day has passed', () => {
    const [old] = buildApprovals([leave({from_date: '2025-06-30', to_date: '2025-06-30'})], [], []);
    const [upcoming] = buildApprovals([leave({})], [], []);
    expect(isPastDue(old, now)).toBe(true);
    expect(isPastDue(upcoming, now)).toBe(false);
  });
});

describe('askedAgo', () => {
  const now = new Date(2026, 9, 1, 14, 0);
  it('reads naturally across ranges', () => {
    expect(askedAgo(new Date(2026, 9, 1, 13, 59, 40), now)).toBe('Just now');
    expect(askedAgo(new Date(2026, 9, 1, 13, 20), now)).toBe('40m ago');
    expect(askedAgo(new Date(2026, 9, 1, 9, 0), now)).toBe('5h ago');
    expect(askedAgo(new Date(2026, 8, 30, 23, 0), now)).toBe('Yesterday');
    expect(askedAgo(new Date(2026, 8, 25), now)).toBe('6 days ago');
    expect(askedAgo(new Date(2025, 5, 30), now)).toBe('15 months ago');
    expect(askedAgo(null, now)).toBe('');
  });
});

describe('leaveContext', () => {
  it('shows days left after approval and who else is off', () => {
    const request = leave({});
    const company = [
      request,
      leave({id: 4, from_date: '2026-03-02', to_date: '2026-03-03', days: 2, status: 'approved'}),
      leave({
        id: 5,
        employee_id: 20,
        from_date: '2026-10-21',
        to_date: '2026-10-21',
        days: 1,
        status: 'approved',
        employee_basic_info: {id: 20, name: 'Meera'},
      }),
    ];
    expect(leaveContext(request, company)).toEqual({
      typeName: 'Casual Leave',
      days: 3,
      leftAfter: 7,
      allowance: 12,
      othersOff: ['Meera'],
    });
  });

  it('has no balance line when the type has no allowance', () => {
    const request = leave({leavetype: {id: 9, name: 'Unpaid'}});
    expect(leaveContext(request, [request]).leftAfter).toBeNull();
  });
});
