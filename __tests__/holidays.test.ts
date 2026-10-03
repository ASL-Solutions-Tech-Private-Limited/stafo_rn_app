import {daysUntil, holidayOnWeekOff, holidaysInYear, policyUrl, splitHolidays, untilLabel} from '../src/features/setup/setupLogic';

// Company 1's real 2026 holidays and Day Shift (Mon–Fri).
const h = (id: number, title: string, d: string) => ({id, title, start_date: d, end_date: d});
const holidays = [
  h(1, 'Independence Day', '2026-08-15'),
  h(2, 'Kali Puja', '2026-11-08'),
  h(3, 'Bank Holiday', '2026-03-31'),
  h(4, 'Maha Dashmi', '2026-10-21'),
];
const shift = {id: 2, start_time: '10:00', end_time: '22:00', sunday: 0, monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 0};
const today = new Date(2026, 9, 3, 13, 0);

describe('employee holidays', () => {
  it('puts Maha Dashmi next, 18 days away', () => {
    const {upcoming, past} = splitHolidays(holidays as any, today);
    expect(upcoming.map(x => x.title)).toEqual(['Maha Dashmi', 'Kali Puja']);
    expect(past.map(x => x.title)).toEqual(['Independence Day', 'Bank Holiday']);
    expect(untilLabel(daysUntil(upcoming[0], today))).toBe('In 18 days');
    expect([0, 1, -2].map(untilLabel)).toEqual(['Today', 'Tomorrow', 'Today']);
  });
  it('flags holidays that fall on a week-off', () => {
    expect(holidayOnWeekOff(holidays[1], shift)).toBe('Sunday');
    expect(holidayOnWeekOff(holidays[0], shift)).toBe('Saturday');
    expect(holidayOnWeekOff(holidays[3], shift)).toBeNull();
    expect(holidayOnWeekOff(holidays[1], {id: 9, start_time: '9', end_time: '5'})).toBeNull();
    expect(holidayOnWeekOff({start_date: '2026-11-07', end_date: '2026-11-09'}, shift)).toBeNull();
  });
  it('filters by year', () => {
    expect(holidaysInYear(holidays, 2026)).toHaveLength(4);
    expect(holidaysInYear(holidays, 2025)).toHaveLength(0);
  });
});

describe('policyUrl', () => {
  it('joins the base path the API gives', () => {
    expect(policyUrl('1747726126policy.pdf', 'https://stafo.in/public/uploads/policies')).toBe(
      'https://stafo.in/public/uploads/policies/1747726126policy.pdf',
    );
    expect(policyUrl('x.pdf', 'https://a.b/c/')).toBe('https://a.b/c/x.pdf');
    expect(policyUrl('https://cdn/x.pdf', null)).toBe('https://cdn/x.pdf');
    expect(policyUrl('x.pdf', null)).toBeNull();
    expect(policyUrl(null, 'https://a')).toBeNull();
  });
});
