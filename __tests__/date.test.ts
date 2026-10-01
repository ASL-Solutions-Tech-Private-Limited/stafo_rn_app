import {atClock, formatClock, formatRange, parseClock} from '../src/lib/date';

describe('parseClock', () => {
  it.each([
    ['18:00', 18, 0],
    ['09:05:30', 9, 5],
    ['06:00 PM', 18, 0],
    ['11:55 PM', 23, 55],
    ['12:00 AM', 0, 0],
    ['12:30 PM', 12, 30],
    ['6:15 am', 6, 15],
  ])('%s', (input, h, m) => {
    expect(parseClock(input)).toMatchObject({hours: h, minutes: m});
  });

  it.each(['', '25:00', '13:00 PM', 'noon', undefined, null])('rejects %p', input => {
    expect(parseClock(input as string)).toBeNull();
  });
});

describe('formatClock', () => {
  it('formats both server formats the same way', () => {
    expect(formatClock('18:00')).toBe('6:00 PM');
    expect(formatClock('06:00 PM')).toBe('6:00 PM');
    expect(formatClock('00:30')).toBe('12:30 AM');
  });
});

describe('atClock', () => {
  it('places a 12-hour time on the given date', () => {
    const d = atClock('2026-09-30', '11:55 PM')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([
      2026, 8, 30, 23, 55,
    ]);
  });
});

describe('formatRange', () => {
  const now = new Date(2026, 8, 30);
  it('omits the year in the current year', () => {
    expect(formatRange('2026-10-05', '2026-10-07', now)).toBe('5 – 7 Oct');
    expect(formatRange('2026-09-30', '2026-10-02', now)).toBe('30 Sep – 2 Oct');
    expect(formatRange('2026-09-17', '2026-09-17', now)).toBe('17 Sep');
  });
  it('adds the year for other years', () => {
    expect(formatRange('2025-06-30', '2025-06-30', now)).toBe('30 Jun 2025');
    expect(formatRange('2025-12-30', '2026-01-02', now)).toBe('30 Dec 2025 – 2 Jan');
  });
});
