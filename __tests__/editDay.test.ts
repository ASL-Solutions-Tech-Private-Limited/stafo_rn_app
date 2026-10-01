import type {DailyAttendance} from '../src/api/types';
import {
  editSummary,
  initialEdit,
  isChanged,
  toHHmm,
  toUpdateFields,
  validateEdit,
} from '../src/features/people/employee/editDay';

const record = (over: Partial<DailyAttendance>): DailyAttendance => ({
  id: 1,
  attendance: 'Present',
  halfday: 0,
  date: '2026-09-29',
  in_time: '09:42:10',
  out_time: null,
  ...over,
});
const shift = {id: 1, shift_name: 'Day', start_time: '10:00 AM', end_time: '07:00 PM'} as never;

describe('initialEdit', () => {
  it('reads the status and times from the record', () => {
    expect(initialEdit(record({}))).toEqual({status: 'present', inTime: '09:42', outTime: null});
    expect(initialEdit(record({halfday: 1})).status).toBe('half');
    expect(initialEdit(record({attendance: 'Absent', in_time: null})).status).toBe('absent');
    expect(initialEdit(record({attendance: 'Leave'})).status).toBe('leave');
  });
  it('normalises 12-hour times', () => {
    expect(toHHmm('06:30 PM')).toBe('18:30');
  });
});

describe('validateEdit', () => {
  const now = new Date(2026, 9, 1, 12, 0);
  it('needs both times on a past day, in order', () => {
    expect(validateEdit({status: 'present', inTime: null, outTime: null}, '2026-09-29', now)).toBe(
      'Add the in time.',
    );
    expect(validateEdit({status: 'present', inTime: '09:42', outTime: null}, '2026-09-29', now)).toBe(
      'Add the out time.',
    );
    expect(validateEdit({status: 'present', inTime: '09:42', outTime: '09:00'}, '2026-09-29', now)).toBe(
      'Out time must be after the in time.',
    );
    expect(validateEdit({status: 'half', inTime: '09:42', outTime: '14:00'}, '2026-09-29', now)).toBeNull();
  });
  it('lets today be saved without an out time, but not in the future', () => {
    expect(validateEdit({status: 'present', inTime: '09:42', outTime: null}, '2026-10-01', now)).toBeNull();
    expect(validateEdit({status: 'present', inTime: '13:00', outTime: null}, '2026-10-01', now)).toBe(
      "In time can't be later than now.",
    );
  });
  it('needs no times for absent or leave', () => {
    expect(validateEdit({status: 'absent', inTime: null, outTime: null}, '2026-09-29', now)).toBeNull();
  });
});

describe('isChanged / toUpdateFields', () => {
  const original = {status: 'present' as const, inTime: '09:42', outTime: null};
  it('ignores times that do not apply to the new status', () => {
    expect(isChanged({...original}, original)).toBe(false);
    expect(isChanged({...original, outTime: '18:30'}, original)).toBe(true);
    expect(isChanged({status: 'absent', inTime: '09:42', outTime: null}, original)).toBe(true);
  });
  it('builds the fields the server expects', () => {
    expect(toUpdateFields({status: 'half', inTime: '09:42', outTime: '14:00'})).toEqual({
      attendance: 'Present',
      halfday: 1,
      in_time: '09:42',
      out_time: '14:00',
    });
    expect(
      toUpdateFields({status: 'present', inTime: '09:42', outTime: '18:00'}, record({out_time: '13:00:40'})),
    ).toEqual({attendance: 'Present', halfday: 0, in_time: '09:42:10', out_time: '18:00'});
    expect(toUpdateFields({status: 'absent', inTime: '09:42', outTime: null})).toEqual({
      attendance: 'Absent',
      halfday: 0,
      in_time: null,
      out_time: null,
    });
  });
});

describe('editSummary', () => {
  it('works out hours and lateness against the shift', () => {
    expect(editSummary({status: 'present', inTime: '09:42', outTime: '18:30'}, '2026-09-29', shift)).toEqual({
      workedMs: (8 * 60 + 48) * 60_000,
      late: false,
    });
    expect(editSummary({status: 'present', inTime: '10:15', outTime: null}, '2026-09-29', shift)).toEqual({
      workedMs: null,
      late: true,
    });
    expect(editSummary({status: 'absent', inTime: null, outTime: null}, '2026-09-29', shift)).toBeNull();
  });
});
