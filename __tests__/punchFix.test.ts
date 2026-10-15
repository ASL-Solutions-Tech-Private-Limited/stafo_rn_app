import {
  fixableDates,
  punchFixEligibility,
  punchOutTimeError,
  suggestedPunchOut,
} from '../src/features/attendance/punchFix';

// Day Shift as on production: Mon–Fri, 10:00–22:00.
const shift = {
  id: 2,
  start_time: '10:00',
  end_time: '22:00',
  sunday: 0,
  monday: 1,
  tuesday: 1,
  wednesday: 1,
  thursday: 1,
  friday: 1,
  saturday: 0,
};
const sat3Oct = new Date(2026, 9, 3, 15, 0);
const mon5Oct = new Date(2026, 9, 5, 11, 0);

describe('fixableDates', () => {
  it('is yesterday and the 2 working days before it, never today', () => {
    expect(fixableDates(shift, [], new Date(2026, 9, 8, 9))).toEqual([
      '2026-10-07',
      '2026-10-06',
      '2026-10-05',
    ]);
  });
  it('skips the weekend', () => {
    expect(fixableDates(shift, [], mon5Oct)).toEqual(['2026-10-02', '2026-10-01', '2026-09-30']);
    expect(fixableDates(shift, [], sat3Oct)).toEqual(['2026-10-02', '2026-10-01', '2026-09-30']);
  });
  it('skips holidays', () => {
    const gandhiJayanti = {start_date: '2026-10-02', end_date: '2026-10-02'};
    expect(fixableDates(shift, [gandhiJayanti], mon5Oct)).toEqual(['2026-10-01', '2026-09-30', '2026-09-29']);
  });
  it('counts every day when the shift has no day flags', () => {
    expect(fixableDates(null, [], mon5Oct)).toEqual(['2026-10-04', '2026-10-03', '2026-10-02']);
  });
});

describe('punchFixEligibility', () => {
  const allowed = fixableDates(shift, [], mon5Oct);
  const open = {in_time: '09:42', out_time: null};
  it('allows a missing punch-out inside the window', () => {
    expect(punchFixEligibility('2026-10-01', open, allowed, [], mon5Oct)).toEqual({ok: true});
  });
  it('explains why not', () => {
    const why = (key: string, rec: any, reqs: any[] = []) => {
      const r = punchFixEligibility(key, rec, allowed, reqs, mon5Oct);
      return r.ok ? 'ok' : r.reason;
    };
    expect(why('2026-10-05', open)).toBe('today');
    expect(why('2026-09-28', open)).toBe('too-old');
    expect(why('2026-10-01', {in_time: '09:42', out_time: '18:00'})).toBe('complete');
    expect(why('2026-10-01', null)).toBe('no-punch');
    expect(why('2026-10-01', open, [{date: '2026-10-01', status: 'Pending'}])).toBe('requested');
    // A rejected request can be sent again.
    expect(why('2026-10-01', open, [{date: '2026-10-01', status: 'Rejected'}])).toBe('ok');
  });
});

describe('punch-out time', () => {
  it('must be after the punch-in', () => {
    expect(punchOutTimeError('2026-10-01', '09:42', '09:30')).toMatch(/before you punched in/);
    expect(punchOutTimeError('2026-10-01', '09:42:00', '18:30')).toBeNull();
  });
  it('suggests the shift end', () => {
    expect(suggestedPunchOut('2026-10-01', '09:42', shift)).toBe('22:00');
    expect(suggestedPunchOut('2026-10-01', '22:30', shift)).toBe('23:30');
    expect(suggestedPunchOut('2026-10-01', '23:30', shift)).toBe('23:59');
  });
});
