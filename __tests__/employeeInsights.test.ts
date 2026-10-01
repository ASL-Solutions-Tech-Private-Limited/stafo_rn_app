import type {LeaveRequestRecord, MonthAttendanceRecord, ShiftWithDays} from '../src/api/types';
import {
  buildMonth,
  isLate,
  leaveBalances,
  othersOffDuring,
  summarizeMonth,
} from '../src/features/people/employeeInsights';

const shift: ShiftWithDays = {
  id: 1,
  start_time: '10:00',
  end_time: '19:00',
  sunday: 0,
  monday: 1,
  tuesday: 1,
  wednesday: 1,
  thursday: 1,
  friday: 1,
  saturday: 0,
};

const rec = (
  date: string,
  attendance: string,
  inT?: string,
  outT?: string,
  halfday = 0,
): MonthAttendanceRecord => ({
  id: Math.random(),
  employee_id: 1,
  attendance,
  halfday,
  date,
  in_time: inT,
  out_time: outT,
});

const leave = (p: Partial<LeaveRequestRecord>): LeaveRequestRecord => ({
  id: 1,
  employee_id: 1,
  from_date: '2026-09-11',
  to_date: '2026-09-11',
  status: 'approved',
  ...p,
});

// Wed 30 Sep 2026, 1 PM.
const now = new Date(2026, 8, 30, 13, 0);

describe('isLate', () => {
  it('allows the grace period', () => {
    expect(isLate(rec('2026-09-01', 'Present', '10:09:59'), shift)).toBe(false);
    expect(isLate(rec('2026-09-01', 'Present', '10:10:01'), shift)).toBe(true);
  });
  it('handles 12-hour shift times', () => {
    const evening = {...shift, start_time: '06:00 PM'};
    expect(isLate(rec('2026-09-01', 'Present', '18:30:00'), evening)).toBe(true);
  });
});

describe('buildMonth + summarizeMonth', () => {
  const records = [
    rec('2026-09-01', 'Present', '09:55:00', '19:00:00'), // on time, 9h05m
    rec('2026-09-02', 'Present', '10:30:00', '18:30:00'), // late, 8h
    rec('2026-09-03', 'Absent'),
    rec('2026-09-04', 'Present', '10:00:00', '14:00:00', 1), // half day
  ];
  const leaves = [leave({from_date: '2026-09-07', to_date: '2026-09-08'})];
  const days = buildMonth('2026-09', records, leaves, shift, now);
  const kind = (d: number) => days[d - 1].kind;

  it('has one entry per day', () => {
    expect(days).toHaveLength(30);
  });

  it('classifies each day', () => {
    expect(kind(1)).toBe('present');
    expect(kind(2)).toBe('late');
    expect(kind(3)).toBe('absent');
    expect(kind(4)).toBe('half-day');
    expect(kind(6)).toBe('off'); // Sunday
    expect(kind(7)).toBe('leave');
    expect(kind(8)).toBe('leave');
    expect(kind(9)).toBe('absent'); // past workday, no record
    expect(kind(30)).toBe('none'); // today, not punched yet
    expect(days[29].isToday).toBe(true);
  });

  it('summarizes the month', () => {
    const s = summarizeMonth(days);
    expect(s.present).toBe(3);
    expect(s.late).toBe(1);
    expect(s.leave).toBe(2);
    // avg of 9h05m, 8h, 4h
    expect(Math.round(s.avgWorkedMs / 60000)).toBe(Math.round((545 + 480 + 240) / 3));
  });

  it('marks future days as future', () => {
    const oct = buildMonth('2026-10', [], [], shift, now);
    expect(oct.every(d => d.kind === 'future')).toBe(true);
  });
});

describe('leaveBalances', () => {
  it('sums approved and pending days per type for the year', () => {
    const sick = {id: 6, name: 'Sick Leave', no_of_days: 6};
    const b = leaveBalances(
      [
        leave({leavetype: sick, leave_type: 6, days: 1}),
        leave({leavetype: sick, leave_type: 6, days: 2, status: 'pending'}),
        leave({leavetype: sick, leave_type: 6, days: 1, status: 'rejected'}),
        leave({leavetype: sick, leave_type: 6, days: 3, from_date: '2025-01-02', to_date: '2025-01-04'}),
      ],
      2026,
    );
    expect(b).toEqual([{key: '6', name: 'Sick Leave', allowance: 6, used: 1, pending: 2}]);
  });

  it('keeps known leave types with a full balance when none was taken this year', () => {
    const b = leaveBalances(
      [
        leave({
          leavetype: {id: 5, name: 'Privilege Leave', no_of_days: 6},
          leave_type: 5,
          days: 1,
          from_date: '2025-05-04',
          to_date: '2025-05-04',
        }),
        leave({leavetype: null, leave_type: 9, days: 1, from_date: '2025-05-04', to_date: '2025-05-04'}),
      ],
      2026,
    );
    expect(b).toEqual([{key: '5', name: 'Privilege Leave', allowance: 6, used: 0, pending: 0}]);
  });
});

describe('othersOffDuring', () => {
  it('lists other employees with overlapping approved leave', () => {
    const request = leave({
      employee_id: 1,
      from_date: '2026-10-05',
      to_date: '2026-10-07',
      status: 'pending',
    });
    const names = othersOffDuring(request, [
      leave({
        employee_id: 2,
        from_date: '2026-10-06',
        to_date: '2026-10-06',
        employee_basic_info: {id: 2, name: 'Priya'},
      }),
      leave({
        employee_id: 3,
        from_date: '2026-10-08',
        to_date: '2026-10-09',
        employee_basic_info: {id: 3, name: 'Rohan'},
      }),
      leave({
        employee_id: 4,
        from_date: '2026-10-01',
        to_date: '2026-10-05',
        status: 'pending',
        employee_basic_info: {id: 4, name: 'Sana'},
      }),
      leave({employee_id: 1, from_date: '2026-10-05', to_date: '2026-10-05'}),
    ]);
    expect(names).toEqual(['Priya']);
  });
});
