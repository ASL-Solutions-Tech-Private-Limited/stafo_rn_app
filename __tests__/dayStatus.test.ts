import type {CompanyEmployee} from '../src/api/types';
import {getDayStatus, isWorkday} from '../src/features/people/dayStatus';

const base: CompanyEmployee = {
  id: 1,
  name: 'Test',
  company_id: 1,
  punches: [],
  attendances: [],
  shifts: [
    {
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
    },
  ],
};

// Wednesday 30 Sep 2026, 1:00 PM local.
const now = new Date(2026, 8, 30, 13, 0, 0);
const today = '2026-09-30';

describe('getDayStatus', () => {
  it('is working with an open punch today, counting live time', () => {
    const s = getDayStatus(
      {...base, punches: [{id: 1, employee_id: 1, punch_in: '2026-09-30 10:00:00', punch_out: null}]},
      today,
      {now},
    );
    expect(s.kind).toBe('working');
    expect(s.workedMs).toBe(3 * 60 * 60 * 1000);
  });

  it('sums completed sessions and reports first in / last out', () => {
    const s = getDayStatus(
      {
        ...base,
        punches: [
          {id: 1, employee_id: 1, punch_in: '2026-09-29 09:00:00', punch_out: '2026-09-29 12:00:00'},
          {id: 2, employee_id: 1, punch_in: '2026-09-29 13:00:00', punch_out: '2026-09-29 18:30:00'},
        ],
      },
      '2026-09-29',
      {now},
    );
    expect(s.kind).toBe('present');
    expect(s.workedMs).toBe(8.5 * 60 * 60 * 1000);
    expect(s.inAt?.getHours()).toBe(9);
    expect(s.outAt?.getHours()).toBe(18);
  });

  it('treats an unclosed punch on a past day as present, not working', () => {
    const s = getDayStatus(
      {...base, punches: [{id: 1, employee_id: 1, punch_in: '2026-09-29 10:00:00', punch_out: null}]},
      '2026-09-29',
      {now},
    );
    expect(s.kind).toBe('present');
  });

  it('uses the attendance record when there are no punches', () => {
    const s = getDayStatus(
      {
        ...base,
        attendances: [
          {
            id: 9,
            attendance: 'Present',
            halfday: 0,
            date: '2026-09-29',
            in_time: '13:00:22',
            out_time: '15:20:45',
          },
        ],
      },
      '2026-09-29',
      {now},
    );
    expect(s.kind).toBe('present');
    expect(Math.round(s.workedMs / 60000)).toBe(140);
  });

  it('marks half days', () => {
    const s = getDayStatus(
      {...base, attendances: [{id: 9, attendance: 'Present', halfday: 1, date: '2026-09-29'}]},
      '2026-09-29',
      {now},
    );
    expect(s.kind).toBe('half-day');
  });

  it('is "not in yet" today rather than absent', () => {
    expect(getDayStatus(base, today, {now}).kind).toBe('not-in');
    const withAbsentRecord = getDayStatus(
      {...base, attendances: [{id: 9, attendance: 'Absent', halfday: 0, date: today}]},
      today,
      {now},
    );
    expect(withAbsentRecord.kind).toBe('not-in');
  });

  it('is absent today once the shift has ended without a punch', () => {
    const morning = {...base, shifts: [{...base.shifts![0], start_time: '06:00', end_time: '11:55'}]};
    expect(getDayStatus(morning, today, {now}).kind).toBe('absent');
  });

  it('keeps overnight shifts open past midnight', () => {
    const night = {...base, shifts: [{...base.shifts![0], start_time: '22:00', end_time: '06:00'}]};
    expect(getDayStatus(night, today, {now}).kind).toBe('not-in');
  });

  it('is absent on a past workday with no record', () => {
    expect(getDayStatus(base, '2026-09-29', {now}).kind).toBe('absent');
  });

  it('respects the shift week-off days', () => {
    expect(getDayStatus(base, '2026-09-27', {now}).kind).toBe('week-off'); // Sunday
  });

  it('shows leave from the dashboard list', () => {
    expect(getDayStatus(base, today, {now, onLeaveIds: new Set([1])}).kind).toBe('leave');
  });

  it('is upcoming for future dates', () => {
    expect(getDayStatus(base, '2026-10-01', {now}).kind).toBe('upcoming');
  });
});

describe('isWorkday', () => {
  it('treats a missing shift as a workday', () => {
    expect(isWorkday([], new Date(2026, 8, 27))).toBe(true);
  });
});

describe('12-hour shift times from the server', () => {
  it('keeps an evening shift (06:00 PM – 11:55 PM) as not-in at 1 PM', () => {
    const evening = {...base, shifts: [{...base.shifts![0], start_time: '06:00 PM', end_time: '11:55 PM'}]};
    expect(getDayStatus(evening, today, {now}).kind).toBe('not-in');
  });
});
